import {readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';
import {paperSortKey, patentSortKey, conferenceSortKey} from '../src/lib/publicationSort.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content');
const collections = [
  ['publications', paperSortKey, ['year']],
  ['patents', patentSortKey, ['applicationDate']],
  ['conferences', conferenceSortKey, []],
];
const check = process.argv.includes('--check');
let changed = 0;

function scalar(frontmatter, name) {
  const match = frontmatter.match(new RegExp(`^${name}:\\s*(.*?)\\s*$`, 'm'));
  if (!match) return undefined;
  const raw = match[1];
  if (raw.startsWith('"') && raw.endsWith('"')) return JSON.parse(raw);
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1);
  return raw;
}

for (const [collection, keyFor, required] of collections) {
  for (const name of readdirSync(join(root, collection)).filter(name => name.endsWith('.md'))) {
    const path = join(root, collection, name);
    const source = readFileSync(path, 'utf8');
    const match = source.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
    if (!match) throw new Error(`Missing frontmatter: ${path}`);
    const frontmatter = match[2];
    const data = Object.fromEntries(['year','sortDate','applicationDate','registrationDate','eventDate','order']
      .map(field => [field, scalar(frontmatter, field)]));
    for (const field of required) if (!data[field]) throw new Error(`Missing ${field}: ${path}`);
    if (collection === 'conferences' && !data.year && !data.eventDate) {
      throw new Error(`Conference needs eventDate or year: ${path}`);
    }
    const id = basename(name, '.md');
    const sortKey = keyFor(data, id);
    if (sortKey.includes('NaN') || sortKey.startsWith('-')) throw new Error(`Invalid sort key: ${path}`);
    if (scalar(frontmatter, 'sortKey') === sortKey) continue;
    changed++;
    if (check) continue;
    const eol = match[1].includes('\r\n') ? '\r\n' : '\n';
    const updated = /^sortKey:.*$/m.test(frontmatter)
      ? frontmatter.replace(/^sortKey:.*$/m, `sortKey: "${sortKey}"`)
      : `${frontmatter}${eol}sortKey: "${sortKey}"`;
    writeFileSync(path, source.replace(match[0], `${match[1]}${updated}${match[3]}`));
  }
}

console.log(`${check ? 'Stale' : 'Updated'} publication sort keys: ${changed}`);
if (check && changed) process.exitCode = 1;
