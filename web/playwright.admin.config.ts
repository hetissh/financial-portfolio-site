import { defineConfig, devices } from '@playwright/test';
import { cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const directory = mkdtempSync(path.join(tmpdir(), 'portfolio-admin-browser-'));
cpSync('src/content', directory, { recursive: true });
process.env.PORTFOLIO_ADMIN_TEST_CONTENT = directory;
export default defineConfig({
  outputDir: './test-results-admin',
  testDir: './tests/admin', fullyParallel: false, workers: 1, timeout: 60000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-admin', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4186', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 }, launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
  ],
  webServer: { command: 'npm run admin -- --port 4186', url: 'http://127.0.0.1:4186/admin/', reuseExistingServer: false, timeout: 60000, env: { PORTFOLIO_ADMIN: '1', PORTFOLIO_CONTENT_DIR: directory, SITE_MODE: 'preview', SITE_URL: '', NEXT_TELEMETRY_DISABLED: '1' } },
});
