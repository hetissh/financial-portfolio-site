// Prepares disposable research content used only by the isolated admin browser suite.
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { storeWorkbook } from '../src/lib/admin/workbooks';
import { makeShowcaseNotes, updateShowcaseNotes } from '../src/lib/showcase-notes';

/** Seed the temporary admin content copy without restoring examples to the public site. */
async function seedAdminContent(root: string) {
  const change = 'Exercise admin browser workflows using disposable content.';
  await updateShowcaseNotes({ root, change });

  const researchDirectory = path.join(root, 'research');
  const showcases = makeShowcaseNotes('2026-10-20', change);
  const legacyFixtures = [
    { id: 'note-01', slug: 'beyond-the-bottom-line', source: showcases[0] },
    { id: 'note-02', slug: 'the-assumptions-underneath', source: showcases[1] },
    { id: 'note-03', slug: 'artwork-import-check', source: showcases[2] },
  ];

  for (const [index, fixture] of legacyFixtures.entries()) {
    fs.writeFileSync(
      path.join(researchDirectory, `${fixture.slug}.json`),
      JSON.stringify(
        {
          ...fixture.source,
          id: fixture.id,
          slug: fixture.slug,
          title: ['Beyond the bottom line', 'The assumptions underneath', 'Artwork import check'][
            index
          ],
          featuredOrder: index + 1,
          ...(index === 0 ? { attachments: [] } : {}),
        },
        null,
        2,
      ) + '\n',
    );
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ['Metric', 'Value'],
      ['Revenue', 120],
      ['Profit', 30],
    ]),
    'Model',
  );
  const stored = await storeWorkbook(
    XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer,
    'Fixture model.xlsx',
    root,
  );
  const noteFile = path.join(researchDirectory, 'beyond-the-bottom-line.json');
  const note = JSON.parse(fs.readFileSync(noteFile, 'utf8'));
  note.attachments = [stored.attachment];
  fs.writeFileSync(noteFile, JSON.stringify(note, null, 2) + '\n');

  const ids = [...legacyFixtures.map(({ id }) => id), 'qa-formatting', 'qa-images', 'qa-workflow'];
  fs.writeFileSync(path.join(root, 'research-order.json'), JSON.stringify({ ids }, null, 2) + '\n');
}

const root = process.argv[2];
if (!root) throw new Error('Provide the disposable admin content directory.');
await seedAdminContent(root);
