import { describe, it, expect } from 'vitest';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseResearch, profileSchema, visibleResearch, validateRelease } from '../../src/lib/content-schema';
import { loadContent } from '../../src/lib/content';
const base = JSON.parse(readFileSync('src/content/research/beyond-the-bottom-line.json', 'utf8'));
const profile = profileSchema.parse(JSON.parse(readFileSync('src/content/profile.json', 'utf8')));

describe('publication boundaries', () => {
  it('excludes drafts in both modes, and samples from production', () => {
    const records = parseResearch(['draft', 'sample', 'published'].map((status, index) => ({ ...base, id: `id-${index}`, slug: `note-${index}`, status })));
    expect(visibleResearch(records, 'preview').map((item) => item.status)).toEqual(['sample', 'published']);
    expect(visibleResearch(records, 'production').map((item) => item.status)).toEqual(['published']);
  });
  it('supports an empty collection', () => expect(visibleResearch([], 'preview')).toEqual([]));
  it('sorts by featured order, then descending date', () => {
    const records = parseResearch([
      { ...base, id: 'older', slug: 'older', featuredOrder: undefined, publishedAt: '2025-02-10' },
      { ...base, id: 'newer', slug: 'newer', featuredOrder: undefined, publishedAt: '2026-02-10' },
      { ...base, id: 'featured', slug: 'featured', featuredOrder: 0 },
    ]);
    expect(visibleResearch(records, 'preview').map((item) => item.id)).toEqual(['featured', 'newer', 'older']);
  });
  it('blocks placeholder profiles and unapproved research from release', () => {
    expect(() => validateRelease(profile, parseResearch([base]), 'https://portfolio.test')).toThrow('placeholder');
    expect(() => validateRelease({ ...profile, isPlaceholder: false }, parseResearch([{ ...base, status: 'sample' }]), 'https://portfolio.test')).toThrow('published');
  });
  it('allows approved content only with a valid production origin', () => {
    const approved = { ...profile, isPlaceholder: false };
    const records = parseResearch([{ ...base, status: 'published' }]);
    for (const url of [undefined, 'http://example.com', 'https://example.com/path', 'https://example.com/?foo=bar']) expect(() => validateRelease(approved, records, url)).toThrow('SITE_URL');
    expect(() => validateRelease(approved, records, 'https://portfolio.test')).not.toThrow();
  });
});
describe('content integrity', () => {
  it('rejects duplicate slugs and IDs', () => {
    expect(() => parseResearch([base, { ...base, id: 'different' }])).toThrow('slug');
    expect(() => parseResearch([base, { ...base, slug: 'different' }])).toThrow('id');
  });
  it('rejects impossible dates and reversed update dates', () => {
    expect(() => parseResearch([{ ...base, publishedAt: '2026-02-30' }])).toThrow();
    expect(() => parseResearch([{ ...base, updatedAt: '2025-01-01' }])).toThrow();
  });
  it('rejects unsafe URLs, empty text and asset traversal', () => {
    expect(() => parseResearch([{ ...base, sources: [{ title: 'Link', url: 'javascript:alert(1)' }] }])).toThrow();
    expect(() => parseResearch([{ ...base, title: '  ' }])).toThrow();
    for (const download of ['/../secrets.txt', '//elsewhere.test/file', '/documents/../../file']) expect(() => parseResearch([{ ...base, download }])).toThrow();
    expect(() => profileSchema.parse({ ...profile, contactLinks: [{ label: 'Contact', href: 'javascript:alert(1)' }] })).toThrow();
  });
  it('allows production publication with empty or omitted citations, but validates any supplied links', () => {
    const approved = { ...profile, isPlaceholder: false };
    for (const sources of [[], undefined]) {
      const records = parseResearch([{ ...base, status: 'published', sources }]);
      expect(records[0].sources).toEqual([]);
      expect(() => validateRelease(approved, records, 'https://portfolio.test')).not.toThrow();
    }
    expect(() => parseResearch([{ ...base, status: 'published', sources: [{ title: 'Invalid source', url: 'http://example.com' }] }])).toThrow();
  });
  it('rejects an unavailable asset on disk', () => {
    const temp = mkdtempSync(path.join(tmpdir(), 'portfolio-content-test-'));
    const original = process.cwd();
    try {
      mkdirSync(path.join(temp, 'src/content/research'), { recursive: true });
      mkdirSync(path.join(temp, 'public'));
      writeFileSync(path.join(temp, 'src/content/profile.json'), JSON.stringify(profile));
      writeFileSync(path.join(temp, 'src/content/research/test.json'), JSON.stringify({ ...base, download: '/missing.pdf' }));
      process.chdir(temp);
      expect(() => loadContent()).toThrow('Missing local asset');
    } finally { process.chdir(original); rmSync(temp, { recursive: true }); }
  });
});
