import fs from 'node:fs';
import path from 'node:path';
import { loadContent } from '../src/lib/content';
import { readWorkbookFile } from '../src/lib/admin/workbooks';
// This directory belongs exclusively to this generator. Private source workbooks
// remain in src/content/workbooks; only currently visible notes get downloads.
const { research } = loadContent();
const directory = path.join(process.cwd(), 'public/downloads/workbooks');
fs.mkdirSync(directory, { recursive: true });
for (const file of fs.readdirSync(directory)) if (/^[0-9a-f-]{36}\.xlsx$/.test(file)) fs.unlinkSync(path.join(directory, file));
const ids = new Set(research.flatMap(n => n.attachments.filter(a => a.kind === 'excel').map(a => a.id)));
for (const id of ids) fs.writeFileSync(path.join(directory, `${id}.xlsx`), readWorkbookFile(id));
console.log(`Prepared ${ids.size} visible workbook downloads.`);
