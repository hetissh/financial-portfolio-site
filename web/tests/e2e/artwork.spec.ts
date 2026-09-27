import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const records = fs.readdirSync('src/content/research').filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(`src/content/research/${f}`,'utf8')));
test('static artwork and image exports retain visible covers and exclude originals and drafts', async ({ page,request,browser }) => {
  await page.goto('/research/');
  for (const record of records.filter(r => r.status !== 'draft')) {
    const art=page.locator(`.card-link[href="/research/${record.slug}/"] .research-art`);
    if (['theme','hero','image'].includes(record.cover?.type)) {
      await expect(art).toHaveAttribute('data-cover-type',record.cover.type);
      await expect(art).toHaveAttribute('data-cover-word',record.cover.word);
      if (record.cover.type === 'hero') {
        const pattern=art.locator('.hero-pattern-layer');
        expect(await pattern.evaluate(el => getComputedStyle(el).backgroundImage)).toContain('data:image/svg+xml');
        if (record.cover.foregroundColor) await expect(pattern).toHaveAttribute('data-pattern-foreground',record.cover.foregroundColor);
        if (record.cover.foregroundOpacity !== undefined) await expect(pattern).toHaveCSS('opacity',String(record.cover.foregroundOpacity));
      }
      if (record.cover.type === 'image') {
        const url=`/images/covers/${record.cover.imageId}.webp`;
        await expect(art.locator('img')).toHaveAttribute('src',url);
        await expect.poll(() => art.locator('img').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
        const response=await request.get(url);expect(response.status()).toBe(200);expect(response.headers()['content-type']).toContain('image/webp');
        expect((await request.get(`/images/covers/${record.cover.imageId}.original.webp`)).status()).toBe(404);
        expect((await request.get(`/admin/api/images/${record.cover.imageId}/`)).status()).toBe(404);
      }
    }
  }
  for (const record of records.filter(r => r.status === 'draft' && r.cover?.type === 'image')) expect((await request.get(`/images/covers/${record.cover.imageId}.webp`)).status()).toBe(404);
  const context=await browser.newContext({ javaScriptEnabled:false });
  const reading=await context.newPage();
  for (const record of records.filter(r => r.status !== 'draft' && r.cover?.type === 'hero')) {
    await reading.goto(new URL(`/research/${record.slug}/`,page.url()).href);
    const pattern=reading.locator('main .hero-pattern-layer');
    if (record.cover.foregroundColor) await expect(pattern).toHaveAttribute('data-pattern-foreground',record.cover.foregroundColor);
    if (record.cover.foregroundOpacity !== undefined) await expect(pattern).toHaveCSS('opacity',String(record.cover.foregroundOpacity));
  }
  await context.close();
  await expect(page.getByRole('link',{ name:'Steve Schoger',exact:true })).toHaveAttribute('href','https://heropatterns.com/');
});
