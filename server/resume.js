import yauzl from 'yauzl';
import { SaxesParser } from 'saxes';
import { crc32 } from 'node:zlib';

export const MAX_RESUME_SIZE = 4 * 1024 * 1024;
export const RESUME_MIME_TYPES = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function validDocumentPart(name, content) {
  let valid = true;
  let root = false;
  let expectedContent = false;
  const parser = new SaxesParser({ xmlns: true });
  parser.on('error', () => { valid = false; });
  parser.on('doctype', () => { valid = false; });
  parser.on('opentag', (tag) => {
    if (!root) {
      root = true;
      const expected = {
        '[Content_Types].xml': ['Types', 'http://schemas.openxmlformats.org/package/2006/content-types'],
        '_rels/.rels': ['Relationships', 'http://schemas.openxmlformats.org/package/2006/relationships'],
        'word/document.xml': ['document', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'],
      }[name];
      const strictWord = name === 'word/document.xml' && tag.local === 'document' &&
        tag.uri === 'http://purl.oclc.org/ooxml/wordprocessingml/main';
      if (!strictWord && (tag.local !== expected[0] || tag.uri !== expected[1])) valid = false;
    }
    if (name === '[Content_Types].xml' && tag.local === 'Override' &&
      tag.uri === 'http://schemas.openxmlformats.org/package/2006/content-types' &&
      tag.attributes.PartName?.value === '/word/document.xml' &&
      tag.attributes.ContentType?.value === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml') {
      expectedContent = true;
    }
    if (name === '_rels/.rels' && tag.local === 'Relationship' &&
      tag.uri === 'http://schemas.openxmlformats.org/package/2006/relationships' &&
      ['http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument',
        'http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument'].includes(tag.attributes.Type?.value) &&
      ['word/document.xml', '/word/document.xml'].includes(tag.attributes.Target?.value) &&
      tag.attributes.TargetMode?.value !== 'External') {
      expectedContent = true;
    }
  });
  const encoding = content[0] === 0xff && content[1] === 0xfe ? 'utf-16le'
    : content[0] === 0xfe && content[1] === 0xff ? 'utf-16be' : 'utf-8';
  let xml;
  try {
    xml = new TextDecoder(encoding, { fatal: true }).decode(content);
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    return false;
  }
  parser.write(xml).close();
  return valid && root && (name === 'word/document.xml' || expectedContent);
}

function isDocx(content) {
  return new Promise((resolve) => {
    yauzl.fromBuffer(content, { lazyEntries: true, strictFileNames: true }, (error, zip) => {
      if (error) return resolve(false);
      const required = new Set(['[Content_Types].xml', '_rels/.rels', 'word/document.xml']);
      const names = new Set();
      let totalSize = 0;
      let settled = false;
      const finish = (valid) => {
        if (settled) return;
        settled = true;
        zip.close();
        resolve(valid);
      };
      zip.on('error', () => finish(false));
      zip.on('end', () => finish(required.size === 0));
      zip.on('entry', (entry) => {
        totalSize += entry.uncompressedSize;
        if (names.has(entry.fileName) || names.size >= 2048 || totalSize > 64 * 1024 * 1024 ||
          entry.isEncrypted() || /vbaProject\.bin$/i.test(entry.fileName)) {
          finish(false);
          return;
        }
        names.add(entry.fileName);
        if (!required.has(entry.fileName)) return zip.readEntry();
        if (entry.uncompressedSize > 8 * 1024 * 1024) return finish(false);
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError) return finish(false);
          const chunks = [];
          let size = 0;
          stream.on('error', () => finish(false));
          stream.on('data', (chunk) => {
            size += chunk.length;
            if (size > 8 * 1024 * 1024) {
              stream.destroy();
              finish(false);
            } else chunks.push(chunk);
          });
          stream.on('end', () => {
            if (settled) return;
            const xml = Buffer.concat(chunks, size);
            if (crc32(xml) !== entry.crc32 || !validDocumentPart(entry.fileName, xml)) return finish(false);
            required.delete(entry.fileName);
            zip.readEntry();
          });
        });
      });
      zip.readEntry();
    });
  });
}

export async function detectedResumeExtension(content) {
  if (!Buffer.isBuffer(content) || !content.length || content.length > MAX_RESUME_SIZE) return '';
  if (content.subarray(0, 5).toString('ascii') === '%PDF-') return 'pdf';
  const compoundSignature = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (content.subarray(0, 8).equals(compoundSignature)) return 'doc';
  if (content.length >= 4 && content.readUInt16LE(0) === 0x4b50 && await isDocx(content)) return 'docx';
  return '';
}
