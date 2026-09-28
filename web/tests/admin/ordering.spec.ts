import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const cards = (page: Page) => page.getByRole('list', { name: 'Research card order', exact: true }).locator(':scope > li');
const arrangement = (page: Page) => cards(page).evaluateAll(elements => elements.map(el => (el as HTMLElement).dataset.noteId!));
const status = (page: Page) => page.locator('form [data-tone][role=status]');
const headers = (page: Page, version?: string) => ({ origin: new URL(page.url()).origin, ...(version ? { 'if-match': `"${version}"` } : {}) });
async function restore(page: Page, request: APIRequestContext, original: string[]) {
  // Read a fresh collection version so cleanup also handles the conflict tests.
  page.once('dialog', dialog => dialog.accept()); await page.goto('/admin/');
  const version = await page.locator('form[data-order-version]').getAttribute('data-order-version');
  expect((await request.put('/admin/api/research-order/', { headers: headers(page, version!), data: { ids: original } })).ok()).toBe(true);
}

for (const method of ['pointer', 'keyboard', 'buttons'] as const) {
  test(`${method} reordering saves, survives reload and updates notebook and cover numbers`, async ({ page, request }) => {
    const hydrationErrors: string[] = [];
    page.on('console', message => { if (/hydrated|hydration/i.test(message.text()) && message.type() === 'error') hydrationErrors.push(message.text()); });
    await page.goto('/admin/');
    const original = await arrangement(page);
    const first = cards(page).first(), second = cards(page).nth(1);
    const title = await first.locator('a').first().innerText();
    await expect(first.getByRole('button', { name: `Reorder ${title}`, exact: true })).toBeEnabled();
    try {
      if (method === 'pointer') {
        await first.evaluate(el => el.scrollIntoView({ block: 'start' }));
        const handle = await first.getByRole('button', { name: `Reorder ${title}`, exact: true }).boundingBox();
        const target = await second.boundingBox();
        await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
        await page.mouse.down();
        await page.mouse.move(target!.x + target!.width * .75, target!.y + target!.height * .75, { steps: 15 });
        await expect.poll(() => arrangement(page)).toEqual([original[1], original[0], ...original.slice(2)]);
        await page.mouse.up();
      } else if (method === 'keyboard') {
        const handle = first.getByRole('button', { name: `Reorder ${title}`, exact: true });
        await handle.focus(); await handle.press('ArrowDown');
        await expect(page.getByRole('button', { name: `Reorder ${title}`, exact: true })).toBeFocused();
      } else {
        await first.getByRole('button', { name: `Move ${title} down`, exact: true }).click();
      }
      await expect.poll(() => arrangement(page)).toEqual([original[1], original[0], ...original.slice(2)]);
      await expect(cards(page).first().locator('.art-corner')).toHaveText('FIELD NOTES / 01');
      await page.getByRole('button', { name: 'Save order', exact: true }).click();
      await expect(status(page)).toHaveText('Order saved');
      await page.reload(); await expect.poll(() => arrangement(page)).toEqual([original[1], original[0], ...original.slice(2)]);
      await page.goto('/research/');
      await expect(page.locator('.research-grid .research-card h3').first()).not.toContainText(title);
      const links = await page.locator('.research-grid .card-link').evaluateAll(elements => elements.map(el => el.getAttribute('href')));
      const firstHref = links[0];
      await expect(page.locator('.research-grid .art-corner').first()).toHaveText('FIELD NOTES / 01');
      await expect(page.locator('.research-grid .art-corner').nth(1)).toHaveText('FIELD NOTES / 02');
      await page.goto(firstHref!); await expect(page.locator('main > .research-art .art-corner')).toHaveText('FIELD NOTES / 01');
      await page.goto('/');
      await expect(page.locator('.research-rail .art-corner').first()).toHaveText('FIELD NOTES / 01');
      expect(hydrationErrors).toEqual([]);
    } finally { await restore(page, request, original); }
  });
}

test('reset, keyboard boundaries, cancellation, network retry, stale tabs and API validation preserve saved content', async ({ page, context, request }) => {
  await page.goto('/admin/');
  const original = await arrangement(page);
  const title = await cards(page).first().locator('a').first().innerText();
  const handle = page.getByRole('button', { name: `Reorder ${title}`, exact: true });
  try {
    await handle.focus(); await handle.press('ArrowUp'); await expect.poll(() => arrangement(page)).toEqual(original);
    await handle.press('End'); await expect(cards(page).last()).toHaveAttribute('data-note-id', original[0]);
    await handle.press('Home'); await expect.poll(() => arrangement(page)).toEqual(original);
    await handle.press('ArrowDown'); await page.getByRole('button', { name: 'Reset order', exact: true }).click();
    await expect.poll(() => arrangement(page)).toEqual(original);
    await cards(page).first().evaluate(el => el.scrollIntoView({ block: 'start' }));
    const source = await handle.boundingBox(), target = await cards(page).nth(1).boundingBox();
    await page.mouse.move(source!.x + 10, source!.y + 10); await page.mouse.down();
    await page.mouse.move(target!.x + target!.width * .75, target!.y + target!.height * .75, { steps: 10 });
    await expect.poll(() => arrangement(page)).not.toEqual(original);
    await page.keyboard.press('Escape'); await page.mouse.up();
    await expect.poll(() => arrangement(page)).toEqual(original);
    const version = await page.locator('form[data-order-version]').getAttribute('data-order-version');
    expect((await request.put('/admin/api/research-order/', { headers: { ...headers(page, version!), origin: 'https://example.com' }, data: { ids: original } })).status()).toBe(403);
    expect((await request.put('/admin/api/research-order/', { headers: headers(page), data: { ids: original } })).status()).toBe(409);
    for (const ids of [original.slice(1), [original[0], ...original.slice(0, -1)], ['unknown', ...original.slice(1)]]) {
      expect((await request.put('/admin/api/research-order/', { headers: headers(page, version!), data: { ids } })).status()).toBe(422);
    }
    const other = await context.newPage(); await other.goto('/admin/');
    await handle.press('ArrowDown');
    await page.route('**/admin/api/research-order/', route => route.abort());
    await page.getByRole('button', { name: 'Save order', exact: true }).click();
    await expect(status(page)).toContainText('Your edits are still here');
    await expect.poll(() => arrangement(page)).not.toEqual(original);
    await page.unroute('**/admin/api/research-order/');
    await page.getByRole('button', { name: 'Save order', exact: true }).click(); await expect(status(page)).toHaveText('Order saved');
    await other.getByRole('button', { name: `Move ${title} down`, exact: true }).click();
    await other.getByRole('button', { name: 'Save order', exact: true }).click();
    await expect(status(other)).toContainText('changed in another tab');
    await expect(other.getByRole('button', { name: 'Reload saved order', exact: true })).toBeVisible();
    other.once('dialog', dialog => dialog.accept()); await other.close();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  } finally { await restore(page, request, original); }
});

test('a manual note number persists across design choices, and clearing it returns to the notebook position', async ({ page }) => {
  await page.goto('/admin/research/note-02/');
  const field = page.getByRole('spinbutton', { name: 'Note number', exact: false });
  const original = await field.inputValue();
  const home = page.getByRole('checkbox', { name: 'Show on home page', exact: false });
  const selected = await home.isChecked();
  let automatic = await page.locator('aside .research-art').getAttribute('data-note-number');
  try {
    await field.fill('0');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('alert', { name: 'Fix this problem before saving' })).toContainText('Use 1 or higher');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await field.fill('24');
    await home.setChecked(!selected);
    await expect(page.locator('aside .art-corner')).toHaveText('FIELD NOTES / 24');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Saved to');
    await page.reload(); await expect(field).toHaveValue('24');
    if (selected) await expect(home).not.toBeChecked(); else await expect(home).toBeChecked();
    await home.setChecked(selected);
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Saved to');
    await expect(home).toBeEnabled();
    await page.reload();
    automatic = (await field.getAttribute('placeholder'))!.match(/\d+/)![0];
    await expect(page.locator('aside .art-corner')).toHaveText('FIELD NOTES / 24');
    await page.getByRole('button', { name: 'Hero Patterns', exact: true }).click();
    await page.getByRole('button', { name: /Choose .* pattern/ }).first().click();
    await expect(page.locator('aside .art-corner')).toHaveText('FIELD NOTES / 24');
    page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Reset edits', exact: true }).click();
    await page.getByRole('link', { name: /^Preview(?: last saved version)?$/ }).click();
    await expect(page.locator('main > .research-art .art-corner')).toHaveText('FIELD NOTES / 24');
    await page.getByRole('link', { name: 'Open public page', exact: true }).click();
    await expect(page).toHaveURL(/\/research\/the-assumptions-underneath\/$/);
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(248, 247, 242)');
    await expect(page.locator('main > .research-art .art-corner')).toHaveText('FIELD NOTES / 24');
    await page.goto('/admin/research/note-02/'); await field.fill('');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click(); await expect(page.getByRole('status')).toContainText('Saved to');
    await page.reload(); await expect(field).toHaveValue('');
    await expect(page.locator('aside .art-corner')).toHaveText(`FIELD NOTES / ${automatic}`);
  } finally {
    await page.goto('/admin/research/note-02/'); await field.fill(original); await home.setChecked(selected);
    await page.getByRole('button', { name: 'Save changes', exact: true }).click(); await expect(page.getByRole('status')).toContainText('Saved to');
  }
});

test('touch dragging works with native touch events on a mobile Chromium viewport', async ({ browser, request }, info) => {
  test.skip(info.project.name !== 'chromium', 'Native CDP touch input is available in Chromium. Other engines run pointer and keyboard cases.');
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4186', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage(); await page.goto('http://127.0.0.1:4186/admin/');
  const original = await arrangement(page);
  try {
    await cards(page).first().evaluate(el => el.scrollIntoView({ block: 'start' }));
    const title = await cards(page).first().locator('a').first().innerText();
    await expect(page.getByRole('button', { name: `Reorder ${title}`, exact: true })).toBeEnabled();
    const from = await page.getByRole('button', { name: `Reorder ${title}`, exact: true }).boundingBox();
    const to = await cards(page).nth(1).boundingBox();
    const cdp = await context.newCDPSession(page);
    const start = { x: from!.x + 12, y: from!.y + 12 }, end = { x: to!.x + to!.width / 2, y: to!.y + to!.height * .6 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
    for (let step = 1; step <= 15; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x - start.x) * step / 15, y: start.y + (end.y - start.y) * step / 15, id: 1 }] });
    await expect.poll(() => arrangement(page)).toEqual([original[1], original[0], ...original.slice(2)]);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.getByRole('button', { name: 'Save order', exact: true }).click(); await expect(status(page)).toHaveText('Order saved');
    await page.reload(); await expect.poll(() => arrangement(page)).toEqual([original[1], original[0], ...original.slice(2)]);
  } finally { await restore(page, request, original); await context.close(); }
});
