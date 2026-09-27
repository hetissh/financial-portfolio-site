import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const directory = '../docs/qa-evidence';
mkdirSync(directory, { recursive: true });
const metrics = [];
for (const [name, width, height, route] of [
  ['home-desktop', 1440, 1000, '/'],
  ['home-mobile', 390, 844, '/'],
  ['home-small-mobile', 320, 740, '/'],
  ['research-desktop', 1440, 1000, '/research/'],
  ['research-mobile', 390, 844, '/research/'],
  ['article-desktop', 1440, 1000, '/research/beyond-the-bottom-line/'],
  ['article-mobile', 390, 844, '/research/beyond-the-bottom-line/'],
]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.addInitScript(() => {
    window.__portfolioMetrics = { lcp: 0, cls: 0 };
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__portfolioMetrics.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__portfolioMetrics.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(`http://127.0.0.1:4173${route}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (name.startsWith('home')) console.log(name, await page.locator('#research-rail').evaluate((el) => ({ width: el.clientWidth, scrollWidth: el.scrollWidth, left: el.scrollLeft, columns: getComputedStyle(el).gridTemplateColumns, autoColumns: getComputedStyle(el).gridAutoColumns, flow: getComputedStyle(el).gridAutoFlow, display: getComputedStyle(el).display, children: Array.from(el.children).map(child => ({ tag: child.tagName, width: child.getBoundingClientRect().width })) })));
  await page.screenshot({ path: `${directory}/${name}.png`, fullPage: true });
  metrics.push({ page: name, width, ...(await page.evaluate(() => ({ ...window.__portfolioMetrics, overflow: document.documentElement.scrollWidth > innerWidth, resources: performance.getEntriesByType('resource').length }))) });
  await page.close();
}
writeFileSync(`${directory}/local-render-metrics.json`, JSON.stringify({ conditions: 'Local Chromium, unthrottled. Rendering observations only; not real-user Web Vitals.', results: metrics }, null, 2));
await browser.close();
console.log(`Saved screenshots and local render observations to ${directory}`);
