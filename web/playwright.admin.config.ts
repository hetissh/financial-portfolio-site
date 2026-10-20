// Runs admin browser tests against an isolated copy of private content.
import { defineConfig, devices } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { initializeAdmins, logIn } from './src/lib/admin/auth-store';
import testAdminFixture from './tests/fixtures/admin-accounts.json' with { type: 'json' };
// Workers re-load this config; reuse the parent-created disposable content copy.
const workerDirectory =
  process.env.TEST_WORKER_INDEX !== undefined
    ? process.env.PORTFOLIO_ADMIN_TEST_CONTENT
    : undefined;
const directory = workerDirectory || mkdtempSync(path.join(tmpdir(), 'portfolio-admin-browser-'));
if (!workerDirectory) cpSync('src/content', directory, { recursive: true });
process.env.PORTFOLIO_ADMIN_TEST_CONTENT = directory;
process.env.PORTFOLIO_ADMIN_TEST_PUBLIC = path.join(directory, 'public');
process.env.PORTFOLIO_AUTH_FILE = path.join(directory, 'auth.json');
if (!workerDirectory)
  initializeAdmins([testAdminFixture.accounts[0], testAdminFixture.accounts[1]]);
if (!workerDirectory)
  execFileSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/seed-admin-browser-content.ts', directory],
    { stdio: 'inherit' },
  );
const testSession = workerDirectory
  ? undefined
  : logIn(testAdminFixture.accounts[0].email, testAdminFixture.accounts[0].password);
if (!workerDirectory && !testSession)
  throw new Error('Could not create the isolated browser-test session.');
process.env.PORTFOLIO_ADMIN_TEST_SESSION ||= testSession;
export default defineConfig({
  outputDir: './test-results-admin',
  testDir: './tests/admin',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-admin', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4186',
    storageState: {
      cookies: [
        {
          name: 'portfolio_admin_session',
          value: process.env.PORTFOLIO_ADMIN_TEST_SESSION!,
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: true,
          secure: false,
          sameSite: 'Strict',
        },
      ],
      origins: [],
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
        launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
      },
    },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run admin -- --port 4186',
    url: 'http://127.0.0.1:4186/admin/',
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      PORTFOLIO_ADMIN: '1',
      PORTFOLIO_CONTENT_DIR: directory,
      PORTFOLIO_ADMIN_TEST_PUBLIC: path.join(directory, 'public'),
      PORTFOLIO_AUTH_FILE: path.join(directory, 'auth.json'),
      ADMIN_ORIGIN: 'http://127.0.0.1:4186',
      SITE_MODE: 'preview',
      SITE_URL: '',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
});
