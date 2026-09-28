import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
// A staging build can attach disposable provider fixtures to the existing QA note.
// Real content never needs fabricated third-party links for the test suite.
const records = fs.readdirSync('src/content/research').filter(name => name.endsWith('.json')).map(name => JSON.parse(fs.readFileSync(path.join('src/content/research', name), 'utf8')));
const example = records.find(note => note.status !== 'draft' && note.attachments?.some((a: { embedUrl?: string }) => Boolean(a.embedUrl)));
const providerDocument = '<!doctype html><html lang="en"><title>Workbook test</title><body><h1>Published worksheet fixture</h1><button onclick="this.textContent=\'Tab two\'">Tab one</button><div style="width:1600px;height:1800px">Illustrative values</div></body></html>';

test('exported provider frames expand, preserve their view, reload and close on mobile and desktop', async ({ page }) => {
  test.skip(!example, 'Requires a visible note with hosted embed links, or the isolated embed build fixture.');
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https:\/\/(?:docs\.google\.com|onedrive\.live\.com|[^/]+\.sharepoint\.com)\//, route => route.fulfill({ contentType: 'text/html', body: providerDocument }));
  await page.goto(`/research/${example.slug}/`);
  const card = page.locator('.sheet-embed').first(), label = await card.locator('h3').innerText();
  await card.locator('iframe').scrollIntoViewIfNeeded();
  const frame = card.frameLocator('iframe'); await frame.getByRole('button', { name: 'Tab one' }).click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await card.getByRole('button', { name: `Expand ${label}`, exact: true }).click();
    await expect(card).toHaveAttribute('aria-modal', 'true'); await expect(frame.getByRole('button', { name: 'Tab two' })).toBeVisible();
    await card.getByRole('button', { name: `Close ${label}`, exact: true }).click();
    await expect(card).toHaveAttribute('role', 'region'); await expect(card.getByRole('button', { name: `Expand ${label}`, exact: true })).toBeFocused();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  }
  await card.getByRole('button', { name: `Reload ${label}`, exact: true }).click(); await expect(frame.getByRole('button', { name: 'Tab one' })).toBeVisible();
  // Access errors in a cross-origin viewer cannot be read by the parent page.
  await page.unrouteAll(); await page.route(/^https:\/\/(?:docs\.google\.com|onedrive\.live\.com|[^/]+\.sharepoint\.com)\//, route => route.abort());
  await card.getByRole('button', { name: `Reload ${label}`, exact: true }).click();
  await expect(card.getByRole('link', { name: 'Open original', exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});

test('iframe and original links are exported without JavaScript while admin and private workbook sources remain unavailable', async ({ browser, request }, info) => {
  test.skip(!example, 'Requires a visible note with hosted embed links, or the isolated embed build fixture.');
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: info.project.use.baseURL });
  await context.route(/^https:\/\/(?:docs\.google\.com|onedrive\.live\.com|[^/]+\.sharepoint\.com)\//, route => route.fulfill({ contentType: 'text/html', body: providerDocument }));
  const page = await context.newPage(); await page.goto(`/research/${example.slug}/`);
  await expect(page.locator('.sheet-embed iframe').first()).toBeVisible(); await expect(page.locator('.sheet-embed').first().getByRole('link', { name: 'Open original', exact: true })).toBeVisible();
  for (const url of ['/admin/', '/admin/api/workbooks/', '/src/content/workbooks/']) expect((await request.get(url)).status()).toBe(404);
  await context.close();
});
