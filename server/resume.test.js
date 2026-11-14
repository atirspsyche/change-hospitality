import assert from 'node:assert/strict';
import { crc32, deflateRawSync } from 'node:zlib';
import { test } from 'node:test';
import { detectedResumeExtension } from './resume.js';

function zip(entries) {
  const files = [];
  const directory = [];
  let offset = 0;
  for (const [filename, value] of entries) {
    const name = Buffer.from(filename);
    const content = Buffer.from(value);
    const compressed = deflateRawSync(content);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(8, 8);
    header.writeUInt32LE(crc32(content), 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(content.length, 22);
    header.writeUInt16LE(name.length, 26);
    files.push(header, name, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    header.copy(central, 16, 14, 26);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    directory.push(central, name);
    offset += header.length + name.length + compressed.length;
  }
  const central = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...files, central, end]);
}

const parts = [
  ['[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
  ['_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
  ['word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Test CV</w:t></w:r></w:p></w:body></w:document>'],
];

test('recognizes supported signatures and safely rejects empty or tiny content', async () => {
  assert.equal(await detectedResumeExtension(Buffer.from('%PDF-1.7\n')), 'pdf');
  assert.equal(await detectedResumeExtension(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])), 'doc');
  for (const content of [Buffer.alloc(0), Buffer.from('P'), Buffer.from('PK'), Buffer.from('invalid')]) {
    assert.equal(await detectedResumeExtension(content), '');
  }
});

test('requires a valid ZIP package, Word content type, relationship and well-formed document XML', async () => {
  assert.equal(await detectedResumeExtension(zip(parts)), 'docx');
  for (const content of [
    Buffer.from('PK\x03\x04word/not-an-actual-zip'),
    zip(parts.slice(0, 2)),
    zip(parts.map(([name, text]) => [name, name === 'word/document.xml' ? '<broken>' : text])),
    zip(parts.map(([name, text]) => [name, text.replace('wordprocessingml.document.main+xml', 'vnd.ms-excel.sheet.main+xml')])),
    zip(parts.map(([name, text]) => [name, text.replace('Target="word/document.xml"', 'Target="https://example.com/doc.xml" TargetMode="External"')])),
    zip([...parts, parts[2]]),
    zip([...parts, ['word/vbaProject.bin', 'macro']]),
    zip([...parts, ['../outside.xml', 'bad path']]),
    zip(parts.map(([name, text]) => [name, name === 'word/document.xml' ? '<!DOCTYPE test [<!ENTITY x "test">]>' + text : text])),
  ]) {
    assert.equal(await detectedResumeExtension(content), '');
  }
});

test('rejects compressed packages whose required XML exceeds the bounded expansion limit', async () => {
  const huge = parts.map(([name, text]) => [name, name === 'word/document.xml' ? text.replace('Test CV', 'x'.repeat(8 * 1024 * 1024)) : text]);
  assert.equal(await detectedResumeExtension(zip(huge)), '');
});
