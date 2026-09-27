import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';
async function pasteImage(editor: Locator, bytes: Buffer, mime = 'image/png') {
  const result = await editor.evaluate((element, data) => {
    const clipboardData = new DataTransfer();
    clipboardData.items.add(new File([Uint8Array.from(atob(data.base64), ch => ch.charCodeAt(0))], 'clipboard', { type: data.mime }));
    const event = new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true });
    // Firefox strips files from constructed ClipboardEvents. Supply the fixture
    // explicitly; native clipboard events already carry this DataTransfer.
    if (!event.clipboardData?.files.length) Object.defineProperty(event, 'clipboardData', { value: clipboardData });
    element.dispatchEvent(event); return event.defaultPrevented;
  }, { base64: bytes.toString('base64'), mime }); expect(result).toBe(true);
}
async function centered(element: Locator) {
  const offset = await element.evaluate(el => { const box = el.getBoundingClientRect(), parent = el.parentElement!.getBoundingClientRect(); return Math.abs(box.x + box.width / 2 - parent.x - parent.width / 2); });
  expect(offset).toBeLessThan(2);
}
test('visible markers, Shift+Enter nesting and pasted images survive save, reset and preview', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/admin/research/new/');
  await page.getByLabel('Title', { exact: true }).fill('Writing workflow ' + info.project.name);
  await page.getByLabel('URL slug', { exact: true }).fill('writing-workflow-' + info.project.name);
  await page.getByLabel('Summary', { exact: true }).fill('Nested points and pasted pictures.');
  await page.getByLabel('Category', { exact: true }).fill('Testing');
  await page.getByLabel('Guiding question', { exact: true }).fill('Does the writing workflow stay readable?');
  await page.getByLabel('Heading', { exact: true }).fill('The story');
  const editor = page.getByRole('textbox', { name: 'Paragraphs', exact: true });
  const toolbar = page.getByRole('group', { name: 'Paragraphs formatting', exact: true });
  await editor.fill('Parent point');
  await toolbar.getByRole('button', { name: 'Bullets', exact: true }).click();
  await expect(editor.locator('ul')).toHaveCSS('list-style-type', 'disc');
  await editor.press('Shift+Enter');
  await editor.pressSequentially('Child point');
  await expect(editor.locator('ul ul')).toHaveCSS('list-style-type', 'circle');
  await editor.press('Shift+Enter'); await editor.pressSequentially('Grandchild point');
  await expect(editor.locator('ul ul ul')).toHaveCSS('list-style-type', 'square');
  await editor.press('Shift+Tab'); await expect(editor.locator('ul ul ul')).toHaveCount(0);
  await editor.press('Tab'); await expect(editor.locator('ul ul ul')).toHaveCount(1);
  await toolbar.getByRole('button', { name: 'Unnest point', exact: true }).click();
  await expect(editor.locator('ul ul ul')).toHaveCount(0);
  await toolbar.getByRole('button', { name: 'Nest point', exact: true }).click();
  await expect(editor.locator('ul ul ul')).toHaveCount(1);
  await editor.press('End'); await editor.press('Enter'); await editor.press('Enter');
  await editor.press('Enter'); await editor.press('Enter'); await editor.press('Enter'); await editor.press('Enter');
  await editor.pressSequentially('First step');
  await toolbar.getByRole('button', { name: '1, 2, 3', exact: true }).click();
  await editor.press('End'); await editor.press('Shift+Enter'); await editor.pressSequentially('Nested step');
  await expect(editor.locator('ol ol')).toHaveCount(1);
  // Make room after the numbered list, then verify the ordinary soft break.
  await editor.press('End'); await editor.press('Enter'); await editor.press('Enter'); await editor.press('Enter'); await editor.press('Enter');
  await editor.pressSequentially('Before the pasted image.'); await editor.press('Shift+Enter'); await editor.pressSequentially('On the next line.');
  await expect(editor.locator('p').filter({ hasText: 'Before the pasted image.' }).locator('br')).toHaveCount(1);
  const png = await sharp({ create: { width: 240, height: 160, channels: 3, background: '#426153' } }).png().toBuffer();
  await pasteImage(editor, png); const dialog = page.getByRole('dialog', { name: 'Paste image', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Insert pasted image', exact: true })).toBeDisabled();
  await dialog.getByLabel('Pasted image alternative text', { exact: true }).fill('Pasted green illustration');
  await dialog.getByLabel('Pasted image caption', { exact: false }).fill('A centered pasted picture');
  await dialog.getByRole('button', { name: 'Insert pasted image', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const image = editor.getByAltText('Pasted green illustration'); await expect(image).toBeVisible();
  await image.click(); await page.getByRole('combobox', { name: 'Image width', exact: true }).selectOption('50');
  await centered(editor.locator('.editor-article-image'));
  await editor.press('ArrowRight'); await editor.pressSequentially('Text after the picture.');
  await pasteImage(editor, png); await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(editor.getByAltText('Pasted green illustration')).toHaveCount(1);
  await pasteImage(editor, png, 'image/gif'); await expect(page.locator('main [role=alert]')).toContainText('Paste a JPEG');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Create note', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/research\/note-\d+\/$/); const editUrl = page.url();
  await page.reload(); await expect(editor.locator('ul ul ul')).toHaveCount(1); await expect(editor.locator('ol ol')).toHaveCount(1);
  await expect(image).toBeVisible(); await centered(editor.locator('.editor-article-image'));
  await editor.fill('Unsaved replacement'); page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Reset edits', exact: true }).click();
  await expect(image).toBeVisible(); await expect(editor.locator('ul ul ul')).toHaveCount(1);
  await page.getByRole('link', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.article-body ul').first()).toHaveCSS('list-style-type', 'disc');
  await expect(page.locator('.article-body ul ul ul')).toHaveCSS('list-style-type', 'square');
  const figure = page.locator('.article-image'); await expect(figure).toHaveCount(1);
  for (const width of [320, 390, 1440]) { await page.setViewportSize({ width, height: 900 }); await centered(figure); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); }
  await expect(page.getByText('Text after the picture.', { exact: true })).toBeVisible();
  await page.goto(editUrl); page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Remove', exact: true }).click();
  expect(errors).toEqual([]);
});

test('nesting limit and pasted-image errors preserve content and allow retry', async ({ page }) => {
  await page.goto('/admin/research/new/');
  const editor = page.getByRole('textbox', { name: 'Paragraphs', exact: true });
  await editor.fill('Level one');
  await page.getByRole('button', { name: 'Bullets', exact: true }).click();
  for (let level = 2; level <= 5; level++) { await editor.press('Shift+Enter'); await editor.pressSequentially(`Level ${level}`); }
  await expect(editor.locator('ul')).toHaveCount(5);
  const before = await editor.innerHTML();
  await editor.press('Shift+Enter'); await editor.press('Tab');
  expect(await editor.innerHTML()).toBe(before);
  await expect(page.getByRole('button', { name: 'Nest point', exact: true })).toBeDisabled();
  const webp = await sharp({ create: { width: 100, height: 80, channels: 3, background: '#66818f' } }).webp().toBuffer();
  await pasteImage(editor, webp, 'image/webp');
  const dialog = page.getByRole('dialog', { name: 'Paste image', exact: true });
  await dialog.getByLabel('Pasted image alternative text', { exact: true }).fill('A blue picture');
  await page.route('**/admin/api/images/', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Please retry this image.' }) }));
  await dialog.getByRole('button', { name: 'Insert pasted image', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Please retry');
  await expect(dialog.getByLabel('Pasted image alternative text', { exact: true })).toHaveValue('A blue picture');
  await expect(dialog.getByRole('button', { name: 'Insert pasted image', exact: true })).toBeEnabled();
  await expect(editor.locator('ul')).toHaveCount(5);
  await page.unroute('**/admin/api/images/');
  // Enter inserts the image, rather than submitting the surrounding note form.
  await dialog.getByLabel('Pasted image alternative text', { exact: true }).press('Enter');
  await expect(dialog).toHaveCount(0); await expect(editor.getByAltText('A blue picture')).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/research\/new\/$/);
  const jpeg = await sharp(webp).jpeg().toBuffer();
  await pasteImage(editor, jpeg, 'image/jpeg'); await dialog.press('Escape');
  await expect(dialog).toHaveCount(0); await expect(editor.getByAltText('A blue picture')).toHaveCount(1);
  await pasteImage(editor, Buffer.alloc(10 * 1024 * 1024 + 1));
  await expect(page.locator('main [role=alert]')).toContainText('up to 10 MB');
  await expect(page.getByRole('button', { name: 'Create note', exact: true })).toBeEnabled();
});

test('native clipboard image paste opens the dialog and inserts the uploaded image', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'OS clipboard permissions are exercised in Chromium; file paste events are checked in all engines.');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/admin/research/new/');
  const png = await sharp({ create: { width: 120, height: 80, channels: 3, background: '#ad7258' } }).png().toBuffer();
  await page.evaluate(async base64 => {
    const blob = new Blob([Uint8Array.from(atob(base64), ch => ch.charCodeAt(0))], { type: 'image/png' });
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  }, png.toString('base64'));
  const editor = page.getByRole('textbox', { name: 'Paragraphs', exact: true });
  await editor.fill('Paste here.'); await editor.focus();
  await editor.press(process.platform === 'darwin' ? 'Meta+v' : 'Control+v');
  const dialog = page.getByRole('dialog', { name: 'Paste image', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Pasted image alternative text', { exact: true }).fill('An image from the clipboard');
  await dialog.getByRole('button', { name: 'Insert pasted image', exact: true }).click();
  await expect(editor.getByAltText('An image from the clipboard')).toBeVisible();
  await expect(editor).toContainText('Paste here.');
});
