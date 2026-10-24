import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import sharp from 'sharp';
import { mediaLimits } from './mediaRules.ts';

const people = [
  ['Josh Beer', 'josh-beer', 'Josh-Beer.webp', 'josh', '02080506312'],
  ['Tom Dukinfield', 'tom-dukinfield', 'tom-duckinfield.webp', 'tom', '02080506312'],
  ['Beth Downey', 'beth-downey', 'beth-downey.webp', 'beth', '02080506312'],
  ['Louisa', 'louisa-mclaughlin', 'louisa-mclaughlin.webp', 'louisa', '02080506312'],
  ['Vanessa Zamora', 'vanessa-zamora', 'venessa-zamora.webp', 'vanessa', '02081941570'],
  ['Marieta Alecu', 'marieta-alecu', 'marieta-alecu.webp', 'Marieta', '02081941576'],
  ['Anda Chirita', 'anda-chirita', 'anda-chirita.webp', 'anda', '02081941577'],
  ['Charley Taylor-Smith', 'charley-taylor-smith', 'charley-taylor-smith.webp', 'charley', '02080506312'],
  ['Claire Hoolahan', 'claire-hoolahan', 'claire-hoolahan.webp', 'claire.hoolahan', '02081941572'],
  ['Gareth Townsend', 'gareth-townsend', 'gareth-townsend.webp', 'gareth', '02080506312'],
  ['James', 'james-buckland', 'james-buckland.webp', 'james', '02081941581'],
  ['Jim O\u2019Brien', 'jim-obrien', "jim-o'brien.webp", '', ''],
  ['Louie Knight', 'louie-knight', 'louie-knight.webp', 'louie', ''],
  ['Aimee Corr', 'aimee-corr', 'aimee-corr.webp', 'aimee.corr', '02081941586'],
  ['Kumkum Bhattacharya', 'kumkum-bhattacharya', 'kumkum-battacharya.webp', 'kumkum.bhattacharya', ''],
  ['TJ Rashid', 'tj-rashid', 'TJ-Rashid.webp', '', ''],
  ['Michael Lovett', 'michael-lovett', 'michael-lovett.webp', '', ''],
  ['Sam McGrath', 'sam-mcgrath', 'Sam-McGrath.webp', '', ''],
];
const fullNames: Record<string, string> = { Louisa: 'Louisa McLaughlin', James: 'James Buckland' };
const temporaryNotes: Record<string, string> = {
  'jim-obrien': 'Jim is the founder and managing director of Change Hospitality.',
  'tj-rashid': "TJ is a director in Change Hospitality's Manchester team.",
  'michael-lovett': "Michael is a consultant in Change Hospitality's Manchester team.",
  'sam-mcgrath': "Sam is a director in Change Hospitality's Hampshire team.",
};

export function parseTeam(source: string) {
  const tree = unified().use(remarkParse).parse(source);
  let office = 'london';
  let specialism = 'Hospitality recruitment';
  const members = [];
  for (const node of tree.children) {
    if (node.type !== 'heading' && node.type !== 'paragraph') continue;
    const content = node.children.map((child) => child.type === 'text' ? child.value : child.type === 'break' ? '\n' : '').join('').trim();
    if (node.type === 'heading') {
      if (/MANCHESTER TEAM/i.test(content)) office = 'manchester';
      else if (/HAMPSHIRE TEAM/i.test(content)) office = 'hampshire';
      else if (/London Team|^Admin$/i.test(content)) office = 'london';
      specialism = content.replace(/\s*Team\s*-?\s*$/i, '').trim();
      continue;
    }
    const [firstLine, ...description] = content.split(/\r?\n/);
    if (firstLine.startsWith('For full names refer')) continue;
    const match = firstLine.match(/^(.+?)\s*[\u2013\u2014-]\s+(.+)$/);
    if (!match) continue;
    const person = people.find(([name]) => name === match[1].trim());
    if (!person) throw new Error(`Unmapped person: ${match[1]}`);
    const [sourceName, key, file, mailbox, phone] = person;
    const note = description.join('\n').trim() || temporaryNotes[key];
    if (!note || note.length > 5000) throw new Error(`Review the biography for ${sourceName}.`);
    members.push({
      _id: `consultant-${key}`, _type: 'consultant', name: fullNames[sourceName] || sourceName,
      title: match[2].trim(), note, signal: specialism.slice(0, 60), accent: 'pink',
      location: { _type: 'reference', _ref: `location-${office}` },
      ...(mailbox ? { email: `${mailbox}@changehospitality.co.uk` } : {}), ...(phone ? { phone } : {}),
      portraitFile: `temp/portraits/webp/${file}`, temporaryBiography: !description.join('\n').trim(),
    });
  }
  if (members.length !== people.length || new Set(members.map((member) => member._id)).size !== people.length) {
    throw new Error(`Expected 18 distinct people; found ${members.length}. Review the Markdown before importing.`);
  }
  return members;
}

export async function inspectImage(file: string, kind: 'portrait' | 'logo') {
  const buffer = await readFile(file);
  const metadata = await sharp(buffer).metadata();
  if (buffer.length > mediaLimits[kind] || !buffer.length) throw new Error(`${file} exceeds the ${kind} file-size limit.`);
  const formats = kind === 'portrait' ? ['jpeg', 'png', 'webp'] : ['jpeg', 'png', 'webp', 'svg'];
  if (!metadata.format || !formats.includes(metadata.format) || (metadata.pages || 1) > 1) throw new Error(`${file} is not a supported static image.`);
  if (kind === 'portrait' && ((metadata.width || 0) < 600 || (metadata.height || 0) < 600)) throw new Error(`${file} must be at least 600 by 600 pixels.`);
  return { buffer, size: buffer.length, width: metadata.width, height: metadata.height, filename: path.basename(file) };
}