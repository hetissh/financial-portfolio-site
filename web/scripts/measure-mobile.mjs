import { chromium, devices } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const results = [];
for (const route of ['/', '/research/beyond-the-bottom-line/']) {
  const context = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  await session.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => {
    window.__portfolioMetrics = { lcp: 0, cls: 0 };
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__portfolioMetrics.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__portfolioMetrics.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(`http://127.0.0.1:4173${route}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  results.push({ route, ...(await page.evaluate(() => ({ ...window.__portfolioMetrics, transferredBytes: performance.getEntriesByType('resource').reduce((sum, entry) => sum + entry.transferSize, 0) }))) });
  await context.close();
}
writeFileSync('../docs/qa-evidence/throttled-mobile-metrics.json', JSON.stringify({ conditions: 'Chromium Pixel 7 emulation; cold cache; 4x CPU slowdown; 150ms latency; 1.6 Mbps downstream; local server. One run per route, no field/INP claim.', results }, null, 2));
console.log('Throttled mobile observations:', results);
await browser.close();
