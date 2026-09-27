import { defineConfig, devices } from '@playwright/test';
const port = process.env.PORTFOLIO_PREVIEW_PORT || '4187';
const baseURL = `http://127.0.0.1:${port}`;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
export default defineConfig({
  outputDir: './test-results-public',
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 }, launchOptions: { executablePath } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], launchOptions: { executablePath } } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
  ],
  webServer: { command: 'npm run preview', url: baseURL, reuseExistingServer: false, timeout: 15000, env: { PORT: port } },
});
