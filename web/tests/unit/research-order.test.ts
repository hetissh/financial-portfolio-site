import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { researchSchema, sortResearch, visibleResearch } from '../../src/lib/content-schema';
import { automaticNoteNumber, noteNumber } from '../../src/lib/research-order';
import { draftToResearch, researchToDraft } from '../../src/lib/admin/form';
import { ContentValidationError, VersionConflictError, createResearch, readAdminContent, reorderResearch, trashResearch, updateResearch } from '../../src/lib/admin/store';
import { ResearchArt } from '../../src/components/ResearchArt';

const base = researchSchema.parse({ ...JSON.parse(fs.readFileSync('src/content/research/beyond-the-bottom-line.json', 'utf8')), cover: undefined, attachments: [] });
const sample = (id: string, status: 'sample' | 'draft' | 'published' = 'sample') => researchSchema.parse({ ...base, id, slug: id, status, featuredOrder: undefined, sections: [{ heading: 'Note', paragraphs: ['Content to preserve.'] }] });

describe('note numbers and notebook ordering', () => {
  it('uses two-digit automatic numbers, preserves overrides, and validates manual values', () => {
    expect(noteNumber({}, 3)).toBe('03'); expect(noteNumber({}, 110)).toBe('110');
    expect(noteNumber({ noteNumber: 24 }, 3)).toBe('24');
    for (const value of [0, -1, 1.5, 10000]) expect(researchSchema.safeParse({ ...base, noteNumber: value }).success).toBe(false);
    const record = researchSchema.parse({ ...base, noteNumber: 24 });
    expect(researchSchema.parse(draftToResearch(researchToDraft(record)))).toEqual(record);
    const draft = researchToDraft(record); draft.noteNumber = '';
    expect(researchSchema.parse(draftToResearch(draft)).noteNumber).toBeUndefined();
  });
  it('orders visible notes consistently, ignores removed IDs and appends new notes using the existing fallback', () => {
    const records = [sample('a', 'published'), sample('b'), sample('hidden', 'draft'), sample('c', 'published')];
    const order = ['removed', 'c', 'hidden', 'b', 'a'];
    expect(sortResearch(records, order).map(note => note.id)).toEqual(['c', 'hidden', 'b', 'a']);
    expect(visibleResearch(records, 'preview', order).map(note => note.id)).toEqual(['c', 'b', 'a']);
    expect(visibleResearch(records, 'production', order).map(note => note.id)).toEqual(['c', 'a']);
    expect(automaticNoteNumber(sortResearch(records, order), 'b')).toBe(2);
    expect(automaticNoteNumber(sortResearch(records, order), 'hidden')).toBe(2);
    expect(sortResearch([...records, sample('new')], order).at(-1)?.id).toBe('new');
    expect(records[0].id).toBe('a');
  });
  it('prints the supplied note number on every cover type, independently of theme or variation', () => {
    const covers = [undefined, { word: 'Growth', color: '#123456', variation: 23 },
      { type: 'theme', preset: 'forest', word: 'Growth', color: '#123456', variation: 0 },
      { type: 'hero', hero: 'jigsaw', word: 'Growth', color: '#123456', variation: 0 },
      { type: 'image', imageId: '12345678-1234-4234-8234-123456789012', crop: { x: .5, y: .5, zoom: 1 }, word: 'Growth', color: '#123456', variation: 0 }];
    for (const cover of covers) {
      const parsed = researchSchema.parse({ ...base, cover });
      const html = renderToStaticMarkup(createElement(ResearchArt, { theme: 'clay', cover: parsed.cover, number: '07', large: true }));
      expect(html).toContain('FIELD NOTES / 07'); expect(html).toContain('data-note-number="07"');
      for (const label of ['PATTERNS', 'ARTWORK', 'FIELD NOTES / IMAGE', 'FIELD NOTES / 24']) expect(html).not.toContain(label);
      if (cover) expect(html).toContain('data-cover-word="Growth"');
    }
  });
});

describe('atomic and versioned ordering storage', () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(tmpdir(), 'portfolio-order-'));
    fs.mkdirSync(path.join(root, 'research'));
    fs.copyFileSync('src/content/profile.json', path.join(root, 'profile.json'));
    for (const id of ['a', 'b', 'c']) fs.writeFileSync(path.join(root, 'research', id + '.json'), JSON.stringify(sample(id), null, 4) + '\n');
  });
  afterEach(() => { vi.restoreAllMocks(); fs.rmSync(root, { recursive: true }); });
  const reorder = (ids: string[], version = readAdminContent({ root }).orderVersion) => reorderResearch({ ids }, { root, expectedVersion: version });

  it('persists a whole arrangement with one metadata write and preserves every note and profile byte for byte', () => {
    const files = ['profile.json', ...['a', 'b', 'c'].map(id => 'research/' + id + '.json')];
    const bytes = files.map(file => fs.readFileSync(path.join(root, file)));
    const previous = readAdminContent({ root }).orderVersion;
    const saved = reorder(['c', 'a', 'b'], previous);
    const content = readAdminContent({ root });
    expect(content.research.map(note => note.id)).toEqual(['c', 'a', 'b']);
    expect(content.orderVersion).toBe(saved.version); expect(saved.version).not.toBe(previous);
    files.forEach((file, index) => expect(fs.readFileSync(path.join(root, file))).toEqual(bytes[index]));
    expect(content.research.every(note => note.featuredOrder === undefined)).toBe(true);
  });
  it('rejects missing, duplicate, unknown IDs and missing versions before any write', () => {
    for (const ids of [['a', 'b'], ['a', 'b', 'unknown'], ['a', 'a', 'b']]) expect(() => reorder(ids)).toThrow(ContentValidationError);
    expect(() => reorderResearch({ ids: ['a', 'b', 'c'] }, { root })).toThrow(VersionConflictError);
    expect(fs.existsSync(path.join(root, 'research-order.json'))).toBe(false);
  });
  it('refuses stale order saves after a reorder, content edit, addition or deletion', () => {
    const first = readAdminContent({ root }).orderVersion;
    reorder(['c', 'b', 'a'], first);
    expect(() => reorder(['a', 'b', 'c'], first)).toThrow(VersionConflictError);
    const beforeEdit = readAdminContent({ root }).orderVersion;
    updateResearch('a', { ...sample('a'), title: 'Edited in another tab' }, { root });
    expect(() => reorder(['a', 'b', 'c'], beforeEdit)).toThrow(VersionConflictError);
    const beforeCreate = readAdminContent({ root }).orderVersion;
    const added = createResearch({ ...sample('new'), slug: 'new' }, { root, trashDir: path.join(root, 'trash') });
    expect(() => reorder(['a', 'b', 'c'], beforeCreate)).toThrow(VersionConflictError);
    const beforeDelete = readAdminContent({ root }).orderVersion;
    trashResearch(added.id, { root, trashDir: path.join(root, 'trash') });
    expect(() => reorder(['a', 'b', 'c', added.id], beforeDelete)).toThrow(VersionConflictError);
    expect(readAdminContent({ root }).research.map(note => note.id)).toEqual(['c', 'b', 'a']);
  });
  it('keeps the previous saved arrangement if the atomic replacement fails', () => {
    reorder(['c', 'b', 'a']);
    const before = fs.readFileSync(path.join(root, 'research-order.json'));
    vi.spyOn(fs, 'renameSync').mockImplementation(() => { throw new Error('Disk refused the write'); });
    expect(() => reorder(['a', 'b', 'c'])).toThrow('Disk refused');
    expect(fs.readFileSync(path.join(root, 'research-order.json'))).toEqual(before);
    expect(fs.readdirSync(root).filter(name => name.includes('.tmp-'))).toEqual([]);
  });
});
