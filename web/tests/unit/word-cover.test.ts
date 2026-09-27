import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { randomUUID } from 'node:crypto';
import { coverFamilies, proceduralDesign, proceduralMotif } from '../../src/lib/procedural-cover';
import { researchSchema, wordCoverSchema } from '../../src/lib/content-schema';
import { draftToResearch, researchToDraft } from '../../src/lib/admin/form';
import { coverDesign, coverInk, coverSeed } from '../../src/lib/word-cover';
import { ResearchArt } from '../../src/components/ResearchArt';
const base = JSON.parse(readFileSync('src/content/research/beyond-the-bottom-line.json', 'utf8'));

describe('word covers', () => {
  it('keeps legacy theme-only notes valid and round-trips saved covers', () => {
    expect(researchSchema.parse({ ...base, cover: undefined }).cover).toBeUndefined();
    const note = researchSchema.parse({ ...base, cover: { word: 'Growth', color: '#A1B2C3', variation: 17 } });
    expect(researchSchema.parse(draftToResearch(researchToDraft(note)))).toEqual(note);
    expect(note.cover?.color).toBe('#a1b2c3');
  });
  it('validates a single word, safe colours and bounded variations', () => {
    for (const word of ['', 'two words', '<script>', 'a'.repeat(33)]) expect(wordCoverSchema.safeParse({ word, color: '#123456' }).success).toBe(false);
    for (const color of ['red', '#123', 'url(https://example.com)', '#gggggg']) expect(wordCoverSchema.safeParse({ word: 'Growth', color }).success).toBe(false);
    for (const variation of [-1, 1000, 1.5]) expect(wordCoverSchema.safeParse({ word: 'Growth', color: '#123456', variation }).success).toBe(false);
    expect(wordCoverSchema.parse({ word: '  Énergie  ', color: '#123456' })).toMatchObject({ word: 'Énergie', variation: 0 });
    expect(wordCoverSchema.safeParse({ word: 'विकास', color: '#123456' }).success).toBe(true);
  });
  it('generates repeatable designs and lets words and variations change the artwork', () => {
    const cover = { word: 'Growth', color: '#123456', variation: 0 };
    expect(coverDesign(cover)).toEqual(coverDesign({ ...cover }));
    expect(coverSeed('Growth')).toBe(coverSeed('growth'));
    expect(coverDesign({ ...cover, color: '#fedcba' })).toEqual(coverDesign(cover));
    expect(coverDesign({ ...cover, word: 'Energy' })).not.toEqual(coverDesign(cover));
    expect(coverDesign({ ...cover, variation: 1 })).not.toEqual(coverDesign(cover));
  });
  it('renders a saved cover directly into exported HTML and retains theme fallback', () => {
    const cover = wordCoverSchema.parse({ word: 'Growth', color: '#123456', variation: 1 });
    const html = renderToStaticMarkup(createElement(ResearchArt, { theme: 'forest', cover, large: true }));
    expect(html).toContain('data-cover-word="Growth"'); expect(html).toContain('background-color:#123456');
    expect(html).toContain('art-large'); expect(html).toContain('<svg');
    const legacy = renderToStaticMarkup(createElement(ResearchArt, { theme: 'clay' }));
    expect(legacy).toContain('art-clay'); expect(legacy).not.toContain('data-cover-word');
  });
  it('keeps cover text readable on light, dark and mid-tone backgrounds', () => {
    for (let r = 0; r <= 255; r += 17) for (let g = 0; g <= 255; g += 17) for (let b = 0; b <= 255; b += 17) {
      const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
      const linear = [r, g, b].map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
      const light = linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
      const contrast = coverInk(hex) === '#000000' ? (light + .05) / .05 : 1.05 / (light + .05);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    }
  });
});

// Exercise the much larger seeded generator independently of the small legacy set.
describe('procedural covers', () => {
  it('validates and round-trips seeded covers while retaining legacy support', () => {
    const seed = '9d9616c0-2a44-4f72-8d0b-d2f8af8ad510';
    const cover = wordCoverSchema.parse({ word: 'Growth', color: '#123456', seed, generatorVersion: 1 });
    const note = researchSchema.parse({ ...base, cover });
    expect(researchSchema.parse(draftToResearch(researchToDraft(note))).cover).toEqual(cover);
    expect(wordCoverSchema.safeParse({ word: 'Growth', color: '#123456', seed }).success).toBe(false);
    expect(wordCoverSchema.safeParse({ ...cover, seed: 'invalid' }).success).toBe(false);
    expect(wordCoverSchema.safeParse({ ...cover, generatorVersion: 2 }).success).toBe(false);
  });
  it('produces stable geometry for saved seeds and distinct designs in a large sample', () => {
    const designs = new Set<string>(), families = new Set<string>();
    for (let i = 0; i < 10000; i++) {
      const seed = randomUUID();
      const design = proceduralDesign('Growth', seed);
      const signature = JSON.stringify(design);
      expect(signature).not.toMatch(/NaN|Infinity/);
      expect(proceduralDesign('Growth', seed)).toEqual(design);
      expect(proceduralMotif('Growth', seed)).toBe(design.motif);
      designs.add(signature); families.add(design.family);
    }
    expect(designs.size).toBe(10000); expect(families.size).toBe(coverFamilies.length);
  });
  it('renders saved procedural covers consistently without browser randomness', () => {
    const cover = wordCoverSchema.parse({ word: 'Growth', color: '#123456', seed: '9d9616c0-2a44-4f72-8d0b-d2f8af8ad510', generatorVersion: 1 });
    const props = { theme: 'forest' as const, cover };
    const first = renderToStaticMarkup(createElement(ResearchArt, props));
    expect(renderToStaticMarkup(createElement(ResearchArt, props))).toBe(first);
    expect(first).toContain(`data-cover-seed="${cover.seed}"`); expect(first).toContain('data-cover-family=');
  });
});
