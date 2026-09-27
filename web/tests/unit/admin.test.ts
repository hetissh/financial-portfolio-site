import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseResearch, profileSchema } from '../../src/lib/content-schema';
import { draftToProfile, draftToResearch, describeField, issueField, profileToDraft, researchToDraft, slugify, splitParagraphs } from '../../src/lib/admin/form';
import { ContentValidationError, RecordNotFoundError, createResearch, readAdminContent, saveProfile, trashResearch, updateResearch } from '../../src/lib/admin/store';
import { handleWrite, rejectUnsafeRequest } from '../../src/lib/admin/guard';

const base = parseResearch([{ ...JSON.parse(readFileSync('src/content/research/beyond-the-bottom-line.json', 'utf8')), attachments: [], cover: undefined }])[0];
const profile = profileSchema.parse(JSON.parse(readFileSync('src/content/profile.json', 'utf8')));
const issuesOf = (action: () => unknown) => {
  try { action(); } catch (error) { if (error instanceof ContentValidationError) return error.issues; throw error; }
  throw new Error('Expected a validation error');
};

describe('admin form conversion', () => {
  it('round-trips a research record through the editor draft', () => {
    expect(parseResearch([draftToResearch(researchToDraft(base))])[0]).toEqual(base);
  });
  it('round-trips the profile', () => expect(profileSchema.parse(draftToProfile(profileToDraft(profile)))).toEqual(profile));
  it('splits paragraphs on blank lines, drops empty list entries and optional blanks', () => {
    expect(splitParagraphs('One\nline wrapped.\n\n\n  Two.  \n \n')).toEqual(['One line wrapped.', 'Two.']);
    const draft = { ...researchToDraft(base), tags: ' a, , b ', updatedAt: ' ', download: '', featuredOrder: '' };
    draft.sections = [{ ...draft.sections[0], prompts: '\n \n' }];
    draft.sources = [{ key: 1, title: ' ', url: '' }];
    const result = draftToResearch(draft);
    expect(result.tags).toEqual(['a', 'b']);
    expect(result).toMatchObject({ updatedAt: undefined, download: undefined, featuredOrder: undefined, sources: [] });
    expect(result.sections[0].prompts).toBeUndefined();
  });
  it('generates URL-safe slugs', () => {
    expect(slugify('  Crédit & Risk: 2026 — Q3!  ')).toBe('credit-and-risk-2026-q3');
    expect(slugify('***')).toBe('');
  });
  it('maps issue paths to fields and readable labels', () => {
    expect(issueField('sections.1.paragraphs.3')).toBe('sections.1.paragraphs');
    expect(issueField('tags.0')).toBe('tags');
    expect(issueField('sources.2.url')).toBe('sources.2.url');
    expect(describeField('sources.2.url')).toBe('Source 3 · URL');
    expect(describeField('slug')).toBe('URL slug');
  });
});

describe('admin content store', () => {
  let root: string;
  let trashDir: string;
  const options = () => ({ root, trashDir });
  const input = (overrides: object = {}) => ({ ...base, id: 'ignored', slug: 'fresh-note', status: 'draft', ...overrides });
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'portfolio-admin-test-'));
    trashDir = path.join(root, 'trash');
    mkdirSync(path.join(root, 'research'));
    writeFileSync(path.join(root, 'profile.json'), JSON.stringify(profile));
    writeFileSync(path.join(root, 'research', `${base.slug}.json`), JSON.stringify(base));
  });
  afterEach(() => rmSync(root, { recursive: true }));

  it('creates a note with the next ID, named after its slug, in stable formatting', () => {
    const created = createResearch(input(), options());
    expect(created).toMatchObject({ id: 'note-02', file: 'fresh-note.json' });
    const text = readFileSync(path.join(root, 'research/fresh-note.json'), 'utf8');
    expect(text.endsWith('}\n')).toBe(true);
    expect(Object.keys(JSON.parse(text)).slice(0, 3)).toEqual(['id', 'slug', 'title']);
    expect(readAdminContent(options()).research.map((item) => item.id).sort()).toEqual(['note-01', 'note-02']);
  });
  it('rejects invalid fields without writing', () => {
    const issues = issuesOf(() => createResearch(input({ title: ' ', slug: 'Bad Slug', status: 'published', sources: [] }), options()));
    expect(issues).toEqual(expect.arrayContaining([
      { path: 'title', message: 'Required' },
      { path: 'slug', message: 'Use lowercase letters, numbers and single hyphens' },
    ]));
    expect(readdirSync(path.join(root, 'research'))).toEqual([`${base.slug}.json`]);
  });
  it('reports schema refinements against the relevant field', () => {
    const issues = issuesOf(() => createResearch(input({ status: 'published', sources: [], updatedAt: '2000-01-01' }), options()));
    expect(issues.map((issue) => issue.path).sort()).toEqual(['updatedAt']);
  });
  it('rejects duplicate slugs and missing downloads', () => {
    expect(issuesOf(() => createResearch(input({ slug: base.slug }), options()))).toEqual([{ path: 'slug', message: 'Another note already uses this slug' }]);
    expect(issuesOf(() => createResearch(input({ download: '/missing.pdf' }), options()))).toEqual([{ path: 'download', message: 'No file at public/missing.pdf' }]);
    expect(createResearch(input({ download: '/favicon.svg' }), options()).download).toBe('/favicon.svg');
  });
  it('updates in place and renames the file when the slug changes', () => {
    updateResearch(base.id, { ...base, title: 'Renamed' }, options());
    expect(JSON.parse(readFileSync(path.join(root, 'research', `${base.slug}.json`), 'utf8')).title).toBe('Renamed');
    const moved = updateResearch(base.id, { ...base, id: 'attempted-change', slug: 'new-address' }, options());
    expect(moved).toMatchObject({ id: base.id, file: 'new-address.json' });
    expect(readdirSync(path.join(root, 'research'))).toEqual(['new-address.json']);
  });
  it('moves removed notes to the trash instead of deleting them', () => {
    const { trashedTo } = trashResearch(base.id, options());
    expect(existsSync(trashedTo)).toBe(true);
    expect(readdirSync(path.join(root, 'research'))).toEqual([]);
    expect(() => trashResearch(base.id, options())).toThrow(RecordNotFoundError);
  });
  it('validates and saves the profile', () => {
    expect(issuesOf(() => saveProfile({ ...profile, monogram: 'ABCD', contactLinks: [{ label: 'Mail', href: 'javascript:alert(1)' }] }, options())).map((issue) => issue.path).sort())
      .toEqual(['contactLinks.0.href', 'monogram']);
    saveProfile({ ...profile, role: 'Equity research' }, options());
    expect(readAdminContent(options()).profile.role).toBe('Equity research');
  });
});

describe('admin request guard', () => {
  const previous = process.env.PORTFOLIO_ADMIN;
  beforeEach(() => { process.env.PORTFOLIO_ADMIN = '1'; });
  afterEach(() => { process.env.PORTFOLIO_ADMIN = previous; });
  const request = (headers: Record<string, string>, method = 'PUT') => new Request('http://127.0.0.1:3000/admin/api/profile/', { method, headers });
  const local = { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000', 'content-type': 'application/json' };

  it('accepts same-origin JSON requests to a local host', () => {
    expect(rejectUnsafeRequest(request(local))).toBeUndefined();
    expect(rejectUnsafeRequest(request({ ...local, host: 'localhost:3000', origin: 'http://localhost:3000' }))).toBeUndefined();
    expect(rejectUnsafeRequest(request({ host: local.host, origin: local.origin }, 'DELETE'))).toBeUndefined();
  });
  it('rejects cross-site, rebinding, non-JSON, and disabled-admin requests', async () => {
    expect(rejectUnsafeRequest(request({ ...local, origin: 'https://evil.test' }))?.status).toBe(403);
    expect(rejectUnsafeRequest(request({ ...local, origin: '' }))?.status).toBe(403);
    expect(rejectUnsafeRequest(request({ ...local, host: 'evil.test:3000', origin: 'http://evil.test:3000' }))?.status).toBe(403);
    expect(rejectUnsafeRequest(request({ ...local, 'content-type': 'text/plain' }))?.status).toBe(415);
    process.env.PORTFOLIO_ADMIN = '';
    expect(rejectUnsafeRequest(request(local))?.status).toBe(404);
  });
  it('turns validation failures into 422 responses with issues', async () => {
    const response = await handleWrite(new Request('http://127.0.0.1:3000/x', { method: 'PUT', headers: local, body: '{}' }), () => { throw new ContentValidationError([{ path: 'title', message: 'Required' }]); });
    expect(response.status).toBe(422);
    expect((await response.json()).issues).toEqual([{ path: 'title', message: 'Required' }]);
  });
});
