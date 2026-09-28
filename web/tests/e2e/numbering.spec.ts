import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

type Note = { id: string; slug: string; status: string; cover?: { word: string }; noteNumber?: number; featuredOrder?: number };
const root = path.resolve('src/content');
const records: Note[] = fs.readdirSync(path.join(root, 'research')).filter(name => name.endsWith('.json')).map(name => JSON.parse(fs.readFileSync(path.join(root, 'research', name), 'utf8')));
const orderFile = path.join(root, 'research-order.json');
const order: string[] = fs.existsSync(orderFile) ? JSON.parse(fs.readFileSync(orderFile, 'utf8')).ids : [];
const visible = records.filter(note => note.status !== 'draft');

test('archive, selected home cards and every article share the note numbers in exported HTML', async ({ page }) => {
  await page.goto('/research/');
  const cards = page.locator('.research-grid .research-card');
  await expect(cards).toHaveCount(visible.length);
  const hrefs = await cards.locator('.card-link').evaluateAll(elements => elements.map(el => el.getAttribute('href')));
  const notes = hrefs.map(href => visible.find(note => href === `/research/${note.slug}/`)!);
  expect(new Set(notes.map(note => note.id)).size).toBe(visible.length);
  if (order.length) expect(notes.map(note => note.id).filter(id => order.includes(id))).toEqual(order.filter(id => visible.some(note => note.id === id)));
  const numbers = notes.map((note, index) => String(note.noteNumber ?? index + 1).padStart(2, '0'));
  for (const [index] of notes.entries()) {
    await expect(cards.nth(index).locator('.art-corner')).toHaveText(`FIELD NOTES / ${numbers[index]}`);
    await expect(cards.nth(index).locator('.research-art')).toHaveAttribute('data-note-number', numbers[index]);
    await expect(cards.nth(index).locator('.card-meta > span').last()).toHaveText(numbers[index]);
  }
  await page.goto('/');
  const selected = notes.filter(note => note.featuredOrder !== undefined);
  const featured = selected.length ? selected : notes;
  for (const [index, note] of featured.entries()) {
    await expect(page.locator('.research-rail .art-corner').nth(index)).toHaveText(`FIELD NOTES / ${numbers[notes.indexOf(note)]}`);
  }
  for (const [index, note] of notes.entries()) {
    await page.goto(`/research/${note.slug}/`);
    const art = page.locator('main > .research-art');
    await expect(art.locator('.art-corner')).toHaveText(`FIELD NOTES / ${numbers[index]}`);
    if (note.cover) await expect(art).toHaveAttribute('data-cover-word', note.cover.word);
  }
});

test('cover numbering works without JavaScript and private order metadata and API remain unexported', async ({ browser, request }, info) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: info.project.use.baseURL });
  const page = await context.newPage();
  await page.goto('/research/');
  await expect(page.locator('.research-grid .art-corner').first()).toHaveText(/^FIELD NOTES \/ \d{2,4}$/);
  for (const url of ['/admin/', '/admin/api/research-order/', '/research-order.json', '/src/content/research-order.json']) expect((await request.get(url)).status()).toBe(404);
  await context.close();
});
