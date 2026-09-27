import { expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeShowcaseNotes, updateShowcaseNotes, showcaseSlugs, showcaseImageIds } from '../../src/lib/showcase-notes';
import { richImageIds } from '../../src/lib/rich-content';
import { visibleResearch } from '../../src/lib/content-schema';

it('keeps exactly three valid showcases with all list styles and every image width', () => {
  const notes = makeShowcaseNotes('2026-09-28');
  expect(notes.map(note => note.slug)).toEqual(showcaseSlugs);
  expect(visibleResearch(notes, 'production')).toEqual([]);
  const nodes = notes.flatMap(note => note.sections.flatMap(section => section.body ? [section.body.doc] : []));
  const flatten = (node: (typeof nodes)[number]): (typeof nodes)[number][] => [node, ...(node.content ?? []).flatMap(flatten)];
  const flat = nodes.flatMap(flatten);
  expect(new Set(flat.filter(node => node.type === 'orderedList').map(node => node.attrs?.type))).toEqual(new Set(['1', 'a', 'A']));
  expect(new Set(flat.filter(node => node.type === 'image').map(node => node.attrs?.displayWidth))).toEqual(new Set([25, 50, 75, 100]));
  expect(new Set(nodes.flatMap(richImageIds))).toEqual(new Set(showcaseImageIds));
});
it('updates the same reserved files, preserving personal content and refusing collisions', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-update-'));
  try {
    fs.mkdirSync(path.join(root, 'research'));
    const personal = fs.readFileSync('src/content/research/test.json');
    fs.writeFileSync(path.join(root, 'research/personal.json'), personal);
    fs.writeFileSync(path.join(root, 'profile.json'), 'personal profile sentinel');
    await updateShowcaseNotes({ root, date: '2026-09-28', change: 'First request.' });
    await updateShowcaseNotes({ root, date: '2026-09-29', change: 'The next request.' });
    expect(fs.readdirSync(path.join(root, 'research'))).toHaveLength(4);
    expect(fs.readFileSync(path.join(root, 'research/personal.json'))).toEqual(personal);
    expect(fs.readFileSync(path.join(root, 'profile.json'), 'utf8')).toBe('personal profile sentinel');
    for (const slug of showcaseSlugs) expect(fs.readFileSync(path.join(root, `research/${slug}.json`), 'utf8')).toContain('The next request.');
    const collision = path.join(root, 'research/showcase-images.json');
    fs.writeFileSync(collision, JSON.stringify({ ...makeShowcaseNotes('2026-09-28')[1], id: 'personal-note' }));
    await expect(updateShowcaseNotes({ root, date: '2026-09-29' })).rejects.toThrow('Showcase collision');
    expect(JSON.parse(fs.readFileSync(collision, 'utf8')).id).toBe('personal-note');
  } finally { fs.rmSync(root, { recursive: true }); }
});
