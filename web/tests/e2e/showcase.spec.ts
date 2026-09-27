import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const showcaseSlugs = ['showcase-formatting', 'showcase-images', 'showcase-workflow'];
test('three showcase notes load with accessible formatting and centered images at mobile and desktop widths', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  for (const slug of showcaseSlugs) {
    expect((await page.goto(`/research/${slug}/`))?.status()).toBe(200);
    await expect(page.locator('.sample-note')).toBeVisible();
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      for (const figure of await page.locator('.article-image').all()) {
        await figure.locator('img').scrollIntoViewIfNeeded();
        await expect(figure.locator('img')).toBeVisible();
        expect(await figure.evaluate(el => { const box = el.getBoundingClientRect(), parent = el.parentElement!.getBoundingClientRect(); return Math.abs(box.x + box.width / 2 - parent.x - parent.width / 2); })).toBeLessThan(2);
        await expect.poll(() => figure.locator('img').evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      }
    }
    if (slug === 'showcase-formatting') {
      await expect(page.locator('.article-body ul').first()).toHaveCSS('list-style-type', 'disc');
      await expect(page.locator('.article-body ul ul ul')).toHaveCSS('list-style-type', 'square');
      await expect(page.locator('.article-body ol[data-list-style=lower-alpha]')).toHaveCSS('list-style-type', 'lower-alpha');
      await expect(page.locator('.article-body ol[data-list-style=upper-alpha]')).toHaveCSS('list-style-type', 'upper-alpha');
    }
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  }
  expect(errors).toEqual([]);
});
