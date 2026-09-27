import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

test('pages render without runtime or asset errors and fit narrow screens', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Making sense of what matters.');
  await expect(page.getByRole('button', { name: 'Next research' })).toBeEnabled();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    if (width === 390) {
      const card = await page.locator('#research-rail > li').first().boundingBox();
      expect(card!.width).toBeGreaterThan(width * 0.7);
    }
  }
  await page.getByRole('link', { name: 'View all research' }).click();
  await expect(page).toHaveURL(/\/research\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Ideas worth');
  expect(errors).toEqual([]);
});

test('Back to top works repeatedly and preserves keyboard focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#top');
  await expect(page.getByRole('button', { name: 'Next research' })).toBeEnabled();
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(200);
    await page.getByRole('link', { name: 'Back to top' }).click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThanOrEqual(2);
  }
  const back = page.getByRole('link', { name: 'Back to top' });
  await back.focus();
  await back.press('Enter');
  await expect(page.locator('#top')).toBeFocused();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThanOrEqual(2);
});

test('normal-motion Back to top and viewport changes do not leave a trapped scroller', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Back to top' }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThanOrEqual(2);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole('link', { name: 'Back to top' }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThanOrEqual(2);
});

test('research arrows reach both rail boundaries without moving the document', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#research');
  const next = page.getByRole('button', { name: 'Next research' });
  const previous = page.getByRole('button', { name: 'Previous research' });
  await expect(previous).toBeDisabled();
  await next.scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => scrollY);
  const expectSynchronizedControls = async () => {
    await expect.poll(() => page.evaluate(() => {
      const rail = document.querySelector('#research-rail')!;
      const previous = document.querySelector<HTMLButtonElement>('[aria-label="Previous research"]')!;
      const next = document.querySelector<HTMLButtonElement>('[aria-label="Next research"]')!;
      return previous.disabled === (rail.scrollLeft <= 2) && next.disabled === (rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2);
    })).toBe(true);
  };
  for (let attempt = 0; attempt < await page.locator('#research-rail > li').count() * 2 && await next.isEnabled(); attempt++) {
    await next.click();
    await expectSynchronizedControls();
  }
  await expect(next).toBeDisabled();
  expect(Math.abs(await page.evaluate(() => scrollY) - y)).toBeLessThan(3);
  await expect(previous).toBeEnabled();
  for (let attempt = 0; attempt < await page.locator('#research-rail > li').count() * 2 && await previous.isEnabled(); attempt++) {
    await previous.click();
    await expectSynchronizedControls();
  }
  await expect(previous).toBeDisabled();
  await expect.poll(() => page.locator('#research-rail').evaluate((element) => element.scrollLeft)).toBeLessThanOrEqual(2);
});

test('every research detail route loads directly, refreshes, and links to the next note', async ({ page }) => {
  await page.goto('/research/');
  const links = await page.locator('.research-grid .card-link').evaluateAll((elements) => elements.map((element) => element.getAttribute('href')!));
  expect(links.length).toBeGreaterThanOrEqual(3);
  for (const href of links) {
    const response = await page.goto(href);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.sample-note')).toBeVisible();
    expect((await page.reload())?.status()).toBe(200);
  }
  await page.locator('.next-note').click();
  await expect(page).toHaveURL(/beyond-the-bottom-line/);
});

test('unknown routes return real 404s with working navigation', async ({ page }) => {
  const response = await page.goto('/research/does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('off the page');
  await page.getByRole('link', { name: 'Back to the notebook' }).click();
  await expect(page).toHaveURL(/\/research\/$/);
});

test('the local admin is not part of the static export', async ({ page }) => {
  for (const route of ['/admin/', '/admin/research/new/', '/admin/api/profile/']) expect((await page.goto(route))?.status()).toBe(404);
});

test('core reading and anchors work without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseURL}/`);
  await page.getByRole('link', { name: 'Explore my research' }).click();
  await expect(page).toHaveURL(/#research$/);
  await page.getByRole('link', { name: 'Back to top' }).click();
  await expect(page).toHaveURL(/#top$/);
  await expect(page.locator('#top')).toBeInViewport();
  await page.locator('.card-link').first().click();
  await expect(page.locator('.article-body')).toBeVisible();
  await context.close();
});

test('keyboard focus can reach an off-screen research card', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#research');
  await expect(page.getByRole('button', { name: 'Next research' })).toBeEnabled();
  const cards = page.locator('#research-rail .card-link');
  await cards.first().focus();
  // WebKit on macOS uses Option+Tab to include links in keyboard navigation.
  const key = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
  for (let index = 1; index < await cards.count(); index++) await page.keyboard.press(key);
  await expect(cards.last()).toBeFocused();
  const visible = await cards.last().evaluate((element) => {
    const box = element.getBoundingClientRect();
    const rail = document.querySelector('#research-rail')!.getBoundingClientRect();
    return box.left >= rail.left - 2 && box.right <= rail.right + 2;
  });
  expect(visible).toBeTruthy();
});

test('automated accessibility checks pass on home, index, and detail', async ({ page }) => {
  for (const route of ['/', '/research/', '/research/beyond-the-bottom-line/']) {
    await page.goto(route);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(result.violations).toEqual([]);
  }
});

test('native touch scrolling works over the research rail', async ({ page, context, browserName, isMobile }) => {
  test.skip(browserName !== 'chromium' || !isMobile, 'Uses Chromium mobile touch dispatch; real device testing remains separate.');
  await page.goto('/#research');
  await expect(page.getByRole('button', { name: 'Next research' })).toBeEnabled();
  const session = await context.newCDPSession(page);
  const box = await page.locator('#research-rail').boundingBox();
  if (!box) throw new Error('Missing rail');
  const x = box.x + 120;
  const y = Math.min(box.y + 160, 450);
  const startY = await page.evaluate(() => scrollY);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 6; step++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 25 }] });
    await page.waitForTimeout(30);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(startY + 30);
  await page.goto('/#research');
  await expect(page.getByRole('button', { name: 'Next research' })).toBeEnabled();
  const rail = await page.locator('#research-rail').boundingBox();
  if (!rail) throw new Error('Missing rail');
  const touchY = Math.max(60, rail.y + 80);
  expect(touchY).toBeLessThan(rail.y + rail.height);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 360, y: touchY }] });
  for (let step = 1; step <= 6; step++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 360 - step * 45, y: touchY }] });
    await page.waitForTimeout(30);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.locator('#research-rail').evaluate((element) => element.scrollLeft)).toBeGreaterThan(30);
});


test('section navigation and browser history preserve usable page scrolling', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'About', exact: true }).click();
  await expect(page.locator('#about')).toBeInViewport();
  await page.getByRole('link', { name: 'Let’s connect' }).click();
  await expect(page.locator('#contact')).toBeInViewport();
  // Clicking a header link first scrolls the header into view. Back may restore
  // that scroll position instead of re-aligning the old hash target.
  await page.goBack();
  await expect(page).toHaveURL(/#about$/);
  await page.goForward();
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.locator('#contact')).toBeInViewport();
  await page.getByRole('link', { name: 'Back to top' }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThanOrEqual(2);
});

test('example Excel sheets work in the static export and private admin endpoints stay absent', async ({ page, request }) => {
  await page.goto('/research/beyond-the-bottom-line/');
  await page.locator('summary').filter({ hasText: 'Example financial statements' }).click();
  await expect(page.getByRole('cell', { name: '100', exact: true })).toBeVisible();
  await page.getByLabel('Show formulas').check();
  await expect(page.getByRole('cell', { name: '=B5-B6', exact: true })).toBeVisible();
  await page.getByLabel('Sheet', { exact: true }).selectOption({ label: 'Research questions' });
  await expect(page.getByRole('cell', { name: 'What does the business sell?', exact: true })).toBeVisible();
  const href = await page.getByRole('link', { name: 'Download Excel', exact: true }).getAttribute('href');
  const response = await request.get(href!);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('spreadsheetml.sheet');
  expect((await response.body()).subarray(0, 2).toString()).toBe('PK');
  const id = href!.split('/').at(-1)!.replace('.xlsx', '');
  expect((await request.get(`/admin/api/workbooks/${id}/`)).status()).toBe(404);
  expect((await request.get(`/src/content/workbooks/${id}.json`)).status()).toBe(404);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
});


test('saved card artwork matches the home, index, article and no-JavaScript export', async ({ page, browser }) => {
  const note = JSON.parse(readFileSync('src/content/research/beyond-the-bottom-line.json', 'utf8'));
  for (const route of ['/', '/research/', `/research/${note.slug}/`]) {
    await page.goto(route);
    const art = route.includes(note.slug) ? page.locator('main .research-art') : page.locator(`.card-link[href="/research/${note.slug}/"] .research-art`);
    if (note.cover) {
      await expect(art).toHaveAttribute('data-cover-word', note.cover.word);
      await expect(art).toHaveAttribute('data-cover-color', note.cover.color.toLowerCase());
      await expect(art).toHaveAttribute('data-cover-variation', String(note.cover.variation ?? 0));
      if (note.cover.seed) await expect(art).toHaveAttribute('data-cover-seed', note.cover.seed);
    } else { await expect(art).toHaveClass(new RegExp(`art-${note.theme}`)); }
    await expect(art.locator(note.cover?.type === 'image' ? 'img' : note.cover?.type === 'hero' ? '.hero-pattern-layer' : 'svg')).toBeVisible();
  }
  const context = await browser.newContext({ javaScriptEnabled: false });
  const reading = await context.newPage(); await reading.goto(new URL(`/research/${note.slug}/`, page.url()).href);
  const art = reading.locator('main .research-art');
  if (note.cover) await expect(art).toHaveAttribute('data-cover-word', note.cover.word);
  await expect(art.locator(note.cover?.type === 'image' ? 'img' : note.cover?.type === 'hero' ? '.hero-pattern-layer' : 'svg')).toBeVisible(); await context.close();
});
