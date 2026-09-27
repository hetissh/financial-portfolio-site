import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import * as XLSX from 'xlsx';

async function save(page: Page, name: string) {
  const response = page.waitForResponse(response => response.url().includes('/admin/api/') && ['PUT', 'POST'].includes(response.request().method()));
  await page.getByRole('button', { name, exact: true }).click();
  await response;
}

test('create, attach sheets, publish, rename, reset, and trash research', async ({ page, request }, info) => {
  const slug = `workflow-${info.project.name}`;
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/admin/');
  await page.getByRole('link', { name: 'New research note', exact: true }).click();
  await save(page, 'Create note');
  await expect(page.locator('main [role=alert]')).toContainText('before saving');
  await page.getByLabel('Title', { exact: true }).fill(`Workflow ${info.project.name}`);
  await page.getByLabel('URL slug', { exact: true }).fill(slug);
  await page.getByLabel('Summary', { exact: true }).fill('Temporary research for browser verification.');
  await page.getByLabel('Category', { exact: true }).fill('Test');
  await page.getByLabel('Guiding question', { exact: true }).fill('Can this model be read and downloaded?');
  await page.getByLabel('Heading', { exact: true }).fill('Research evidence');
  await page.getByLabel('Paragraphs', { exact: true }).fill('Evidence from an isolated browser test.\n\nA second paragraph.');
  const book = XLSX.utils.book_new(); const sheet = XLSX.utils.aoa_to_sheet([['Metric', 'Value'], ['Revenue', 120], ['Profit', 30]]);
  sheet.B3 = { t: 'n', v: 30, f: 'B2*0.25' }; XLSX.utils.book_append_sheet(book, sheet, 'Model'); XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Question', 'Evidence'], ['Growth', 'Example only']]), 'Notes');
  const bytes = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
  await page.getByLabel('Upload Excel workbook', { exact: true }).setInputFiles({ name: 'Test model.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: bytes });
  await expect(page.getByLabel('Sheet 1 name')).toHaveValue('Test model');
  await page.getByLabel('Google Sheet name', { exact: true }).fill('Shared assumptions');
  await page.getByLabel('Google Sheets sharing link').fill('https://docs.google.com/spreadsheets/d/example-id/edit#gid=0');
  await page.getByRole('button', { name: 'Attach Google Sheet', exact: true }).click();
  await save(page, 'Create note');
  await expect(page).toHaveURL(/\/admin\/research\/note-\d+\/$/);
  const editUrl = page.url();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(`Workflow ${info.project.name}`);
  await page.reload(); await expect(page.getByLabel('Sheet 1 name')).toHaveValue('Test model');
  await page.getByRole('link', { name: 'Preview', exact: true }).click();
  await expect(page.getByRole('heading', { name: `Workflow ${info.project.name}.`, exact: true })).toBeVisible();
  await page.locator('summary').filter({ hasText: 'Test model' }).click();
  await expect(page.getByRole('cell', { name: '120', exact: true })).toBeVisible();
  await page.getByLabel('Show formulas').check(); await expect(page.getByRole('cell', { name: '=B2*0.25', exact: true })).toBeVisible();
  await page.getByLabel('Sheet', { exact: true }).selectOption({ label: 'Notes' }); await expect(page.getByRole('cell', { name: 'Growth', exact: true })).toBeVisible();
  const href = await page.getByRole('link', { name: 'Download Excel', exact: true }).getAttribute('href');
  const download = await request.get(href!); expect(download.status()).toBe(200); expect((await download.body()).equals(bytes)).toBe(true);
  await expect(page.getByRole('link', { name: 'Open sheet', exact: true })).toHaveAttribute('href', 'https://docs.google.com/spreadsheets/d/example-id/edit#gid=0');
  await page.goto(`/research/${slug}/`); await expect(page.getByRole('heading', { level: 1 })).toContainText('off the page');
  await page.goto(editUrl); await page.getByRole('radio', { name: /^Published/ }).check();
  await save(page, 'Save changes'); await expect(page.getByRole('status')).toContainText('Saved to');
  await page.goto(`/research/${slug}/`); await expect(page.getByRole('heading', { name: `Workflow ${info.project.name}.`, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Further reading', exact: true })).toHaveCount(0);
  await page.goto(editUrl);
  await page.getByRole('button', { name: 'Add source', exact: true }).click(); await page.getByLabel('Source 1 title').fill('SEC'); await page.getByLabel('URL', { exact: true }).fill('https://www.sec.gov/');
  await save(page, 'Save changes'); await expect(page.getByRole('status')).toContainText('Saved to');
  await page.goto(`/research/${slug}/`); await expect(page.getByRole('heading', { name: `Workflow ${info.project.name}.`, exact: true })).toBeVisible();
  await page.goto(editUrl); await page.getByLabel('URL slug', { exact: true }).fill(`${slug}-renamed`); await save(page, 'Save changes'); await expect(page.getByRole('status')).toContainText(`${slug}-renamed.json`);
  // A second save after a rename must keep the new record version.
  await page.getByLabel('Summary', { exact: true }).fill('Edited after renaming.'); await save(page, 'Save changes'); await expect(page.getByRole('status')).toContainText('Saved to');
  await page.goto(`/research/${slug}-renamed/`); await expect(page.getByText('Edited after renaming.', { exact: true })).toBeVisible();
  await page.goto(editUrl); await page.getByLabel('Title', { exact: true }).fill('Unsaved title');
  page.once('dialog', dialog => dialog.dismiss()); await page.getByRole('link', { name: 'Profile', exact: true }).click(); await expect(page).toHaveURL(editUrl); await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Unsaved title');
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Reset edits', exact: true }).click(); await expect(page.getByLabel('Title', { exact: true })).toHaveValue(`Workflow ${info.project.name}`);
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); }
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Remove', exact: true }).click(); await expect(page).toHaveURL(/\/admin\/$/);
  await expect(page.getByRole('link', { name: `Workflow ${info.project.name}`, exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('profile validation, connection failure recovery, stale-tab conflict and keyboard saving', async ({ page, context }) => {
  await page.goto('/admin/profile/');
  await expect(page.getByLabel('Monogram',{ exact:true })).toHaveAttribute('placeholder','Up to 3 characters');
  const nameBox = await page.getByLabel('Name',{ exact:true }).boundingBox();
  const monogramBox = await page.getByLabel('Monogram',{ exact:true }).boundingBox();
  if (await page.evaluate(() => matchMedia("(min-width: 761px)").matches)) expect(Math.abs(nameBox!.y - monogramBox!.y)).toBeLessThan(1);
  else expect(Math.abs(nameBox!.x - monogramBox!.x)).toBeLessThan(1);
  expect(Math.abs(nameBox!.height - monogramBox!.height)).toBeLessThan(1);
  const original = await page.getByLabel('Introduction', { exact: true }).inputValue();
  await page.getByLabel('Introduction', { exact: true }).fill(''); await page.getByRole('button', { name: 'Save profile', exact: true }).click(); await expect(page.locator('main [role=alert]')).toContainText('Introduction');
  await page.getByLabel('Introduction', { exact: true }).fill('An unsaved introduction');
  await page.route('**/admin/api/profile/', route => route.abort());
  await page.getByRole('button', { name: 'Save profile', exact: true }).click(); await expect(page.locator('main [role=alert]')).toContainText('Could not connect'); await expect(page.getByRole('button', { name: 'Save profile', exact: true })).toBeEnabled(); await expect(page.getByLabel('Introduction', { exact: true })).toHaveValue('An unsaved introduction');
  await page.unroute('**/admin/api/profile/');
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Reset edits', exact: true }).click(); await expect(page.getByLabel('Introduction', { exact: true })).toHaveValue(original);
  const other = await context.newPage(); await other.goto('/admin/profile/');
  await other.getByLabel('Introduction', { exact: true }).fill('A newer introduction');
  await other.getByRole('button', { name: 'Save profile', exact: true }).click(); await expect(other.getByRole('status')).toContainText('Saved to');
  await page.getByLabel('Introduction', { exact: true }).fill('A stale introduction'); await page.getByRole('button', { name: 'Save profile', exact: true }).click(); await expect(page.locator('main [role=alert]')).toContainText('another tab or editor');
  await other.getByLabel('Introduction', { exact: true }).fill(original);
  await other.getByLabel('Introduction', { exact: true }).press(process.platform === 'darwin' ? 'Meta+s' : 'Control+s'); await expect(other.getByRole('status')).toContainText('Saved to');
  await other.reload(); await expect(other.getByLabel('Introduction', { exact: true })).toHaveValue(original);
  expect((await new AxeBuilder({ page: other }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await other.close();
});

test('local origin checks, upload errors, and admin navigation', async ({ page, request }) => {
  const response = await request.put('/admin/api/profile/', { headers: { Origin: 'https://attacker.test' }, data: {} }); expect(response.status()).toBe(403);
  const malformed = await request.put('/admin/api/profile/', { headers: { Origin: 'http://127.0.0.1:4186', 'Content-Type': 'application/json' }, data: Buffer.from('{') }); expect(malformed.status()).toBe(400);
  await page.goto('/admin/'); await expect(page.getByRole('link', { name: 'Edit profile', exact: true }).first()).toBeVisible();
  await page.getByRole('link', { name: 'New note', exact: true }).click();
  await page.getByLabel('Upload Excel workbook', { exact: true }).setInputFiles({ name: 'fake.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('not a workbook') });
  await expect(page.locator('main [role=alert]')).toContainText('valid .xlsx'); await expect(page.getByRole('button', { name: 'Create note', exact: true })).toBeEnabled();
  await page.getByLabel('Google Sheet name', { exact: true }).fill('Unsafe link'); await page.getByLabel('Google Sheets sharing link').fill('https://attacker.test'); await page.getByRole('button', { name: 'Attach Google Sheet', exact: true }).click(); await expect(page.locator('main [role=alert]')).toContainText('valid Google Sheets');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
});

test('word and colour covers generate, vary, reset, persist and render throughout research', async ({ page }) => {
  await page.goto('/admin/research/note-01/');
  const preview = page.locator('aside .research-art');
  await page.getByText('Generate geometric variations', { exact: true }).click();
  await page.getByLabel('Cover word', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Generate cover', exact: true }).click();
  await expect(page.locator('main [role=alert]')).toContainText('Enter a word');
  await page.getByLabel('Cover word', { exact: true }).fill('two words');
  await page.getByRole('button', { name: 'Generate cover', exact: true }).click(); await expect(page.locator('main [role=alert]')).toContainText('single word');
  await page.getByLabel('Cover word', { exact: true }).fill('Growth');
  await page.getByLabel('Cover colour', { exact: true }).fill('#183b5c');
  await page.getByRole('button', { name: 'Generate cover', exact: true }).click();
  await expect(preview).toHaveAttribute('data-cover-word', 'Growth'); await expect(preview).toHaveCSS('background-color', 'rgb(24, 59, 92)');
  const first = await preview.locator('svg').innerHTML();
  const firstSeed = await preview.getAttribute('data-cover-seed');
  // Generate itself must also produce new artwork for unchanged inputs.
  await page.getByRole('button', { name: 'Generate cover', exact: true }).click();
  expect(await preview.getAttribute('data-cover-seed')).not.toBe(firstSeed);
  expect(await preview.locator('svg').innerHTML()).not.toBe(first);
  const seen = new Set<string>();
  let previousFamily = await preview.locator('[data-cover-family]').getAttribute('data-cover-family');
  for (let click = 0; click < 12; click++) {
    await page.getByRole('button', { name: 'Try another variation', exact: true }).click();
    const art = await preview.locator('svg').innerHTML(); expect(seen.has(art)).toBe(false); seen.add(art);
    const family = await preview.locator('[data-cover-family]').getAttribute('data-cover-family'); expect(family).not.toBe(previousFamily); previousFamily = family;
  }
  const savedSeed = await preview.getAttribute('data-cover-seed');
  const savedArt = await preview.locator('svg').innerHTML();
  expect(await preview.locator('svg').innerHTML()).not.toBe(first);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Saved to' })).toBeVisible();
  await page.reload(); await expect(preview).toHaveAttribute('data-cover-seed', savedSeed!); expect(await preview.locator('svg').innerHTML()).toBe(savedArt); await expect(page.getByLabel('Cover word', { exact: true })).toHaveValue('Growth');
  await page.getByText('Generate geometric variations', { exact: true }).click();
  await page.getByLabel('Cover colour', { exact: true }).fill('#fff4d6'); await page.getByRole('button', { name: 'Generate cover', exact: true }).click();
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Reset edits', exact: true }).click();
  await expect(preview).toHaveAttribute('data-cover-color', '#183b5c'); await expect(page.getByLabel('Cover colour', { exact: true })).toHaveValue('#183b5c');
  for (const width of [320, 390, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); }
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.getByRole('link', { name: 'Preview', exact: true }).click(); await expect(page).toHaveURL(/\/admin\/research\/note-01\/preview\/$/); await expect(page.locator('.article-page .art-word')).toHaveAttribute('data-cover-word', 'Growth');
  await page.goto('/research/beyond-the-bottom-line/'); await expect(page.locator('main .art-word')).toHaveAttribute('data-cover-color', '#183b5c');
  await page.goto('/research/'); await expect(page.locator('.card-link[href="/research/beyond-the-bottom-line/"] .art-word')).toHaveAttribute('data-cover-seed', savedSeed!);
  await page.goto('/admin/research/note-01/'); await page.getByText('Generate geometric variations', { exact: true }).click(); await page.getByRole('button', { name: 'Use theme artwork', exact: true }).click(); await expect(page.locator('aside .art-word')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Saved to' })).toBeVisible();
  await page.reload(); await expect(page.locator('aside .art-word')).toHaveCount(0);
});
