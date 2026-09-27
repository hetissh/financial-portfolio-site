import { describe, it, expect } from 'vitest';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { richDocumentSchema, richText, richImageIds, paragraphsToDocument, type RichDocument } from '../../src/lib/rich-content';
import { profileSchema, researchSchema } from '../../src/lib/content-schema';
import { draftToResearch, researchToDraft, draftToProfile, profileToDraft } from '../../src/lib/admin/form';
import { contactEmailHref } from '../../src/lib/profile-sections';
import { storeArticleImage, readCoverImage } from '../../src/lib/admin/images';

const base = JSON.parse(readFileSync('src/content/research/beyond-the-bottom-line.json', 'utf8'));
const profile = JSON.parse(readFileSync('src/content/profile.json', 'utf8'));
const body: RichDocument = { version: 1, doc: { type: 'doc', content: [
  { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Evidence' }] },
  { type: 'paragraph', content: [{ type: 'text', text: 'Read closely.', marks: [{ type: 'bold' }, { type: 'italic' }] }] },
  { type: 'orderedList', attrs: { start: 3, type: 'a' }, content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A useful point' }] }] }] },
] } };
describe('formatted research and editable profile', () => {
  it('round-trips formatting, list styles and legacy reflection prompts', () => {
    const record = researchSchema.parse({ ...base, sections: [{ heading: 'Section', paragraphs: [], body, prompts: ['Why?'] }] });
    expect(researchSchema.parse(draftToResearch(researchToDraft(record)))).toEqual(record);
    expect(richText(body.doc)).toContain('A useful point');
    expect(paragraphsToDocument(['One', 'Two']).doc.content).toHaveLength(2);
  });
  it('rejects unsupported nodes, empty documents, excessive nesting and unsafe links', () => {
    expect(richDocumentSchema.safeParse({ version: 1, doc: { type: 'doc', content: [{ type: 'script', text: 'bad' }] } }).success).toBe(false);
    expect(richDocumentSchema.safeParse(paragraphsToDocument([])).success).toBe(false);
    for (const href of ['javascript:alert(1)', 'data:text/html,bad', 'http://example.com']) {
      expect(richDocumentSchema.safeParse({ version: 1, doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Link', marks: [{ type: 'link', attrs: { href } }] }] }] } }).success).toBe(false);
    }
    let deep = body.doc;
    for (let i = 0; i < 20; i++) deep = { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Point' }] }, deep] }] };
    expect(richDocumentSchema.safeParse({ version: 1, doc: { type: 'doc', content: [deep] } }).success).toBe(false);
  });
  it('preserves legacy profile defaults and saves changed About, Contact and email settings', () => {
    const original = profileSchema.parse(profile);
    expect(profileSchema.parse(draftToProfile(profileToDraft(original)))).toEqual(original);
    const draft = profileToDraft(original); draft.about.heading = 'Behind the research'; draft.about.principles = ['Read carefully', '', 'Ask why']; draft.contact.email = 'research@example.com';
    const saved = profileSchema.parse(draftToProfile(draft));
    expect(saved.about?.principles).toEqual(['Read carefully', 'Ask why']);
    expect(saved.contact?.email).toBe('research@example.com');
    expect(contactEmailHref(saved.contact!.email!, 'A question & an idea')).toBe('mailto:research@example.com?subject=A%20question%20%26%20an%20idea');
    expect(profileSchema.safeParse({ ...saved, contact: { ...saved.contact, email: 'invalid' } }).success).toBe(false);
  });
  it('imports article images without a forced crop and validates accessible image references', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'portfolio-article-image-'));
    try {
      const bytes = await sharp({ create: { width: 300, height: 600, channels: 3, background: '#556677' } }).png().toBuffer();
      const stored = await storeArticleImage(bytes, 'portrait.png', undefined, 1.55, root);
      expect(stored).toMatchObject({ width: 300, height: 600 });
      const attrs = { ...stored, alt: 'Portrait example', caption: 'A caption', displayWidth: 50 };
      const document = { version: 1, doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'image', attrs }] }] } };
      expect(richDocumentSchema.safeParse(document).success).toBe(true);
      expect(richImageIds(document.doc)).toEqual([stored.id]);
      expect((await sharp(readCoverImage(stored.id, false, root)).metadata()).height).toBe(600);
      expect(richDocumentSchema.safeParse({ ...document, doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'image', attrs: { ...attrs, src: 'https://attacker.test/image.png' } }] }] } }).success).toBe(false);
      const cropped = await storeArticleImage(bytes, 'portrait.png', { x: .5, y: .5, zoom: 1 }, 1, root);
      expect(cropped.width).toBe(cropped.height);
    } finally { rmSync(root, { recursive: true }); }
  });
});
