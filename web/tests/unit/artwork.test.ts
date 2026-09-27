import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, symlinkSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { themeArtwork, heroPatterns } from '../../src/lib/artwork';
import { researchSchema, wordCoverSchema } from '../../src/lib/content-schema';
import { draftToResearch, researchToDraft } from '../../src/lib/admin/form';
import { ResearchArt } from '../../src/components/ResearchArt';
import { cropRectangle, centeredCrop } from '../../src/lib/image-crop';
import { storeCoverImage, imageExists, readCoverImage } from '../../src/lib/admin/images';
import { createResearch } from '../../src/lib/admin/store';
let roots: string[] = [];
const temporary = () => { const p = mkdtempSync(path.join(tmpdir(), 'portfolio-image-')); roots.push(p); return p; };
afterEach(() => { for (const p of roots) rmSync(p, { recursive: true, force: true }); roots = []; });
describe('artwork catalogues', () => {
  it('gives every fixed design and pattern a valid default word and colour', () => {
    expect(themeArtwork.length).toBe(13); expect(heroPatterns.length).toBe(87);
    for (const p of themeArtwork) expect(wordCoverSchema.safeParse({ word: p.word, color: p.color, type: 'theme', preset: p.id }).success).toBe(true);
    for (const p of heroPatterns) expect(wordCoverSchema.safeParse({ ...p, type: 'hero', hero: p.id }).success).toBe(true);
    for (const type of ['theme', 'hero', 'image']) expect(wordCoverSchema.safeParse({ word: 'Growth', color: '#123456', type }).success).toBe(false);
    expect(wordCoverSchema.safeParse({ word: 'Growth', color: '#123456', type: 'hero', hero: 'external-script' }).success).toBe(false);
  });
  it('persists and validates independent foreground colour and opacity settings', () => {
    const input = { type:'hero', hero:'hexagons', word:'Growth', color:'#E4DAEF', foregroundColor:'#7141A6', foregroundOpacity:.73 };
    const cover = wordCoverSchema.parse(input);
    expect(cover.color).toBe('#e4daef'); expect(cover.foregroundColor).toBe('#7141a6');
    const base = JSON.parse(readFileSync('src/content/research/beyond-the-bottom-line.json','utf8'));
    expect(researchSchema.parse(draftToResearch(researchToDraft(researchSchema.parse({ ...base,cover })))).cover).toEqual(cover);
    for (const foregroundColor of ['red','#123','url(https://attacker.test)']) expect(wordCoverSchema.safeParse({ ...input,foregroundColor }).success).toBe(false);
    for (const foregroundOpacity of [-.01,1.01,NaN]) expect(wordCoverSchema.safeParse({ ...input,foregroundOpacity }).success).toBe(false);
  });
  it('renders custom pattern colours and opacity in static HTML while preserving legacy defaults', () => {
    const cover = wordCoverSchema.parse({ type:'hero',hero:'hexagons',word:'Growth',color:'#e4daef',foregroundColor:'#7141a6',foregroundOpacity:.73 });
    const html = renderToStaticMarkup(createElement(ResearchArt,{ theme:'forest',cover }));
    expect(html).toContain('opacity:0.73'); expect(html).toContain('data-pattern-foreground="#7141a6"'); expect(html).toContain('%237141a6');
    const legacy = renderToStaticMarkup(createElement(ResearchArt,{ theme:'forest',cover:{ ...cover,foregroundColor:undefined,foregroundOpacity:undefined } }));
    expect(legacy).toContain('opacity:0.18'); expect(legacy).toContain('data-pattern-foreground="#000000"');
    for (const foregroundOpacity of [0,1]) expect(renderToStaticMarkup(createElement(ResearchArt,{ theme:'forest',cover:{ ...cover,foregroundOpacity } }))).toContain(`opacity:${foregroundOpacity}`);
  });
  it('keeps fixed geometry when its word and colour are customised', () => {
    const signatures = new Set<string>();
    for (const p of themeArtwork) {
      const cover = wordCoverSchema.parse({ word: p.word, color: p.color, type: 'theme', preset: p.id });
      const first = renderToStaticMarkup(createElement(ResearchArt, { theme: 'forest', cover }));
      const custom = renderToStaticMarkup(createElement(ResearchArt, { theme: 'forest', cover: { ...cover, word: 'Energy', color: '#193b5c' } }));
      const svg = (html: string) => html.match(/<svg[\s\S]*?<\/svg>/)![0];
      expect(svg(first)).toBe(svg(custom)); signatures.add(svg(first));
      expect(custom).toContain('data-cover-word="Energy"'); expect(custom).toContain('background-color:#193b5c');
    }
    expect(signatures.size).toBe(themeArtwork.length);
  });
});
describe('image crop and storage', () => {
  it('bounds a 1.55 crop at all positions and zoom levels', () => {
    for (const [w,h] of [[1550,1000], [1000,1550], [2000,700]]) for (const zoom of [1,2,5]) for (const x of [0,.5,1]) for (const y of [0,.5,1]) {
      const rect = cropRectangle(w,h,{ x,y,zoom });
      expect(rect.left).toBeGreaterThanOrEqual(0); expect(rect.top).toBeGreaterThanOrEqual(0);
      expect(rect.left + rect.width).toBeLessThanOrEqual(w); expect(rect.top + rect.height).toBeLessThanOrEqual(h);
      expect(Math.abs(rect.width / rect.height - 1.55)).toBeLessThan(.025);
    }
    expect(() => cropRectangle(100,100,{ x: NaN,y:.5,zoom:1 })).toThrow();
  });
  it('crops the chosen pixels, re-encodes originals, and stores crops privately', async () => {
    const root = temporary();
    const left = await sharp({ create: { width: 155, height: 100, channels: 3, background: '#ff0000' } }).png().toBuffer();
    const right = await sharp({ create: { width: 155, height: 100, channels: 3, background: '#0000ff' } }).png().toBuffer();
    const bytes = await sharp({ create: { width: 310, height: 100, channels: 3, background: '#fff' } }).composite([{ input:left,left:0,top:0 }, { input:right,left:155,top:0 }]).png().toBuffer();
    const a = await storeCoverImage(bytes,'Colour.png',{ x:0,y:.5,zoom:1 },root);
    const b = await storeCoverImage(bytes,'Colour.png',{ x:1,y:.5,zoom:1 },root);
    for (const [id,colour] of [[a.id,[255,0,0]], [b.id,[0,0,255]]] as const) {
      expect(imageExists(id,root)).toBe(true);
      const { data,info } = await sharp(readCoverImage(id,false,root)).raw().toBuffer({ resolveWithObject:true });
      expect(info.width).toBe(155); expect(info.height).toBe(100);
      for (let c=0;c<3;c++) expect(Math.abs(data[(50*155+75)*info.channels+c]-colour[c])).toBeLessThan(8);
      expect((await sharp(readCoverImage(id,true,root)).metadata()).format).toBe('webp');
    }
  });
  it('normalises camera orientation and removes source metadata', async () => {
    const root = temporary();
    const bytes = await sharp({ create: { width:120,height:80,channels:3,background:'#123456' } }).withMetadata({ orientation:6 }).jpeg().toBuffer();
    const { id } = await storeCoverImage(bytes,'Camera.jpg',centeredCrop,root);
    const original = await sharp(readCoverImage(id,true,root)).metadata();
    expect(original.width).toBe(80); expect(original.height).toBe(120); expect(original.orientation).toBeUndefined(); expect(original.exif).toBeUndefined();
  });
  it('rejects invalid formats, oversized uploads, missing assets and path escapes', async () => {
    const root = temporary();
    await expect(storeCoverImage(Buffer.from('<svg/>'),'Unsafe.svg',centeredCrop,root)).rejects.toThrow();
    await expect(storeCoverImage(Buffer.from('not image'),'Fake.png',centeredCrop,root)).rejects.toThrow();
    await expect(storeCoverImage(Buffer.alloc(10*1024*1024+1),'Huge.png',centeredCrop,root)).rejects.toThrow();
    const base = JSON.parse(readFileSync('src/content/research/beyond-the-bottom-line.json','utf8'));
    expect(() => createResearch({ ...base, slug:'missing-image', attachments:[], cover:{ type:'image', imageId:randomUUID(), word:'Image', color:'#123456', crop:centeredCrop } },{ root })).toThrow();
    const bytes = await sharp({ create:{ width:100,height:100,channels:3,background:'#fff' } }).png().toBuffer();
    const { id } = await storeCoverImage(bytes,'Photo.png',centeredCrop,root);
    expect(imageExists('../outside',root)).toBe(false);
    const target = path.join(root,'images',`${id}.webp`); rmSync(target); const outside = temporary(); const other = await storeCoverImage(bytes,'Outside.png',centeredCrop,outside);
    symlinkSync(path.join(outside,'images',`${other.id}.webp`),target);
    expect(imageExists(id,root)).toBe(false);
  });
});
