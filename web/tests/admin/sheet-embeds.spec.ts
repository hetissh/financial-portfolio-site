import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
const google = 'https://docs.google.com/spreadsheets/d/e/qa-published/pubhtml?gid=12&range=A1%3AF30';
const excel = 'https://onedrive.live.com/embed?resid=QA%21123&authkey=QA';
const originalExcel = 'https://1drv.ms/x/qa-workbook';
const fixture = (slug: string) => path.join(process.env.PORTFOLIO_ADMIN_TEST_CONTENT!, 'research', `${slug}.json`);
async function save(page: Page) {
  const response = page.waitForResponse(response => response.url().includes('/admin/api/research/') && response.request().method() === 'PUT');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  expect((await response).ok()).toBe(true);
  await expect(page.getByRole('status')).toContainText('Saved to');
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeEnabled();
}
async function providerFrames(page: Page) {
  await page.route(/^https:\/\/(?:docs\.google\.com|onedrive\.live\.com)\//, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><title>Hosted sheet fixture</title><body><h1>Provider test worksheet</h1><button onclick="this.textContent=\'Worksheet 2\'">Worksheet 1</button><div style="width:1400px;height:1600px;background:linear-gradient(#eff5ee,#fff)">Fictional fixture values</div></body></html>' }));
}

test('Google and Excel iframe codes preview, persist, expand without reloading, and return focus on close', async ({ page }) => {
  const file = fixture('showcase-workflow'), before = fs.readFileSync(file); const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message)); await providerFrames(page);
  try {
    await page.goto('/admin/research/qa-workflow/');
    await page.getByLabel('Google Sheet name', { exact: true }).fill('Native Google model');
    await page.getByLabel('Google Sheets sharing link', { exact: true }).fill('https://docs.google.com/spreadsheets/d/qa-original/edit');
    await page.getByLabel('Google Sheets embed URL or code', { exact: true }).fill(`<iframe src="${google.replaceAll('&', '&amp;')}" onload="window.top.untrustedPasteRan=true"></iframe>`);
    await page.getByRole('button', { name: 'Preview Google embed', exact: true }).click();
    await expect(page.locator('iframe')).toHaveAttribute('src', /\/pubhtml\?/);
    await page.getByRole('button', { name: 'Attach Google Sheet', exact: true }).click();
    await page.getByLabel('Excel workbook name', { exact: true }).fill('Native Excel model');
    await page.getByLabel('Excel embed URL or code', { exact: true }).fill(`<iframe src="${excel.replaceAll('&', '&amp;')}"></iframe>`);
    await page.getByLabel('Original Excel workbook link (optional)', { exact: true }).fill(originalExcel);
    await page.getByRole('button', { name: 'Preview Excel embed', exact: true }).click();
    await expect(page.locator('iframe')).toHaveAttribute('src', excel);
    await page.getByRole('button', { name: 'Attach Excel embed', exact: true }).click();
    await save(page); await page.reload();
    await expect(page.getByLabel('Sheet 1 embed URL or code', { exact: false })).toHaveValue(/widget=true/);
    await expect(page.getByLabel('Sheet 2 original workbook link', { exact: false })).toHaveValue(originalExcel);
    const record = JSON.parse(fs.readFileSync(file, 'utf8')); expect(record.attachments.map((a: { kind: string }) => a.kind)).toEqual(['google', 'microsoft']);
    expect(record.attachments[0].embedUrl).not.toContain('<iframe');
    await page.getByRole('link', { name: 'Preview', exact: true }).click();
    await expect(page.locator('.sheet-embed')).toHaveCount(2);
    const card = page.locator('.sheet-embed').first(), frame = card.frameLocator('iframe');
    await card.locator('iframe').scrollIntoViewIfNeeded();
    await frame.getByRole('button', { name: 'Worksheet 1' }).click();
    const inner = await card.locator('iframe').elementHandle();
    await card.getByRole('button', { name: 'Expand Native Google model', exact: true }).click();
    await expect(card).toHaveAttribute('aria-modal', 'true');
    await expect(frame.getByRole('button', { name: 'Worksheet 2' })).toBeVisible();
    expect(await page.locator('.sheet-embed').first().locator('iframe').evaluate((node, original) => node === original, inner)).toBe(true);
    await card.getByRole('button', { name: 'Close Native Google model', exact: true }).click();
    await expect(card).toHaveAttribute('role', 'region'); await expect(card.getByRole('button', { name: 'Expand Native Google model', exact: true })).toBeFocused();
    await expect(frame.getByRole('button', { name: 'Worksheet 2' })).toBeVisible();
    await card.getByRole('button', { name: 'Expand Native Google model', exact: true }).click();
    await card.getByRole('button', { name: 'Close Native Google model', exact: true }).focus(); await page.keyboard.press('Escape'); await expect(card).toHaveAttribute('role', 'region');
    await card.getByRole('button', { name: 'Reload Native Google model', exact: true }).click(); await expect(frame.getByRole('button', { name: 'Worksheet 1' })).toBeVisible();
    await expect(page.locator('.sheet-embed').last().getByRole('link', { name: 'Open original', exact: true })).toHaveAttribute('href', originalExcel);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await card.getByRole('button', { name: 'Expand Native Google model', exact: true }).click();
      const box = await card.boundingBox(); expect(box!.width).toBeLessThanOrEqual(width);
      await card.getByRole('button', { name: 'Close Native Google model', exact: true }).click();
    }
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { untrustedPasteRan?: boolean }).untrustedPasteRan)).toBeUndefined(); expect(errors).toEqual([]);
  } finally { fs.writeFileSync(file, before); }
});

test('an uploaded workbook can use a native embed and revert to its local preview with the original download preserved', async ({ page, request }) => {
  const file = fixture('beyond-the-bottom-line'), before = fs.readFileSync(file); const record = JSON.parse(before.toString());
  const originalBytes = fs.readFileSync(path.join(process.env.PORTFOLIO_ADMIN_TEST_CONTENT!, 'workbooks', record.attachments[0].id + '.xlsx'));
  await providerFrames(page);
  try {
    await page.goto('/admin/research/note-01/');
    await page.getByLabel('Sheet 1 embed URL or code', { exact: false }).fill(`<iframe src="${excel}"></iframe>`);
    await save(page); await page.getByRole('link', { name: 'Preview', exact: true }).click();
    await expect(page.locator('.sheet-embed')).toHaveCount(1); await expect(page.locator('.workbook-card')).toHaveCount(0);
    const href = await page.getByRole('link', { name: 'Download uploaded Excel', exact: true }).getAttribute('href');
    expect((await (await request.get(href!)).body()).equals(originalBytes)).toBe(true);
    await page.goto('/admin/research/note-01/'); await page.getByLabel('Sheet 1 embed URL or code', { exact: false }).fill(''); await save(page);
    await page.getByRole('link', { name: 'Preview', exact: true }).click(); await expect(page.locator('iframe')).toHaveCount(0);
    await page.locator('.workbook-card summary').click(); await expect(page.getByRole('cell', { name: 'Revenue', exact: true })).toBeVisible();
  } finally { fs.writeFileSync(file, before); }
});

test('invalid provider links are rejected before attach and on save; legacy Google sharing links remain available', async ({ page }) => {
  const file = fixture('showcase-workflow'), before = fs.readFileSync(file); await providerFrames(page);
  try {
    await page.goto('/admin/research/qa-workflow/');
    await page.getByLabel('Excel workbook name', { exact: true }).fill('Validation model');
    await page.getByLabel('Excel embed URL or code', { exact: true }).fill('https://evil.test/embed');
    await page.getByRole('button', { name: 'Attach Excel embed', exact: true }).click(); await expect(page.locator('#editor-sheets [role=alert]')).toContainText('OneDrive or SharePoint');
    await expect(page.getByLabel('Sheet 1 name', { exact: true })).toHaveCount(0);
    await page.getByLabel('Excel embed URL or code', { exact: true }).fill(excel); await page.getByRole('button', { name: 'Attach Excel embed', exact: true }).click();
    await page.getByLabel('Sheet 1 embed URL or code', { exact: false }).fill('https://onedrive.live.com.evil.test/embed?resid=QA');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('alert', { name: /Fix .* before saving/ })).toBeVisible(); await expect(page.getByLabel('Sheet 1 embed URL or code', { exact: false })).toHaveAttribute('aria-invalid', 'true');
    expect(fs.readFileSync(file).equals(before)).toBe(true);
    await page.getByLabel('Sheet 1 embed URL or code', { exact: false }).fill(excel);
    await page.getByLabel('Google Sheet name', { exact: true }).fill('Legacy sharing link');
    await page.getByLabel('Google Sheets sharing link', { exact: true }).fill('https://docs.google.com/spreadsheets/d/qa-original/edit');
    await page.getByRole('button', { name: 'Attach Google Sheet', exact: true }).click(); await save(page);
    await page.getByRole('link', { name: 'Preview', exact: true }).click(); await expect(page.getByRole('link', { name: 'Open sheet', exact: true })).toHaveAttribute('href', 'https://docs.google.com/spreadsheets/d/qa-original/edit');
    await expect(page.locator('.sheet-embed')).toHaveCount(1);
  } finally { fs.writeFileSync(file, before); }
});
