import fs from 'node:fs';
import { richImageIds } from '../src/lib/rich-content';
import path from 'node:path';
import { loadContent } from '../src/lib/content';
import { readCoverImage } from '../src/lib/admin/images';
// Only visible, saved crops are published. Originals stay in private content.
const { research } = loadContent();
const directory = path.join(process.cwd(), 'public/images/covers');
fs.mkdirSync(directory, { recursive: true });
for (const file of fs.readdirSync(directory)) if (/^[0-9a-f-]{36}\.webp$/.test(file)) fs.unlinkSync(path.join(directory, file));
const ids = new Set(research.filter(n => n.cover?.type === 'image').map(n => n.cover!.imageId!));
for (const id of ids) fs.writeFileSync(path.join(directory, `${id}.webp`), readCoverImage(id));
console.log(`Prepared ${ids.size} visible cover images.`);

const articleDirectory = path.join(process.cwd(), 'public/images/articles');
fs.mkdirSync(articleDirectory, { recursive: true });
for (const file of fs.readdirSync(articleDirectory)) if (/^[0-9a-f-]{36}\.webp$/.test(file)) fs.unlinkSync(path.join(articleDirectory, file));
const articleIds = new Set(research.flatMap(note => note.sections.flatMap(section => section.body ? richImageIds(section.body.doc) : [])));
for (const id of articleIds) fs.writeFileSync(path.join(articleDirectory, `${id}.webp`), readCoverImage(id));
console.log(`Prepared ${articleIds.size} visible article images.`);
