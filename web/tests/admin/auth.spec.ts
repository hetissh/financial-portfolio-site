// Checks anonymous denial, real sign-in, and the two-account management boundary.
import { test, expect } from '@playwright/test';
import testAdminFixture from '../fixtures/admin-accounts.json' with { type: 'json' };

test('anonymous visitors reach sign-in and cannot read admin pages or APIs', async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:4186',
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await page.goto('/');
  const mainNav = page.getByRole('navigation', { name: 'Main navigation' });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(mainNav.getByRole('link', { name: 'Admin' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
  await mainNav.getByRole('link', { name: 'Admin' }).click();
  await expect(page).toHaveURL(/\/login\/$/);
  await expect(page.getByRole('heading', { name: 'Sign in.' })).toBeVisible();
  const password = page.getByLabel('Password', { exact: true });
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password' }).click();
  await expect(password).toHaveAttribute('type', 'password');
  const response = await context.request.get(
    'http://127.0.0.1:4186/admin/api/images/90f3fe01-a1b2-4c33-8d44-e55500000001/',
  );
  expect(response.status()).toBe(401);
  const publicCover = await context.request.get(
    'http://127.0.0.1:4186/media/images/90f3fe01-a1b2-4c33-8d44-e55500000001/',
  );
  expect(publicCover.status()).toBe(200);
  await page.getByLabel('Email').fill(testAdminFixture.accounts[0].email);
  await password.fill(testAdminFixture.accounts[0].password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/$/);
  await page.goto('/');
  await mainNav.getByRole('link', { name: 'Admin' }).click();
  await expect(page).toHaveURL(/\/admin\/$/);
  await context.close();
});

test('the signed-in admin sees two accounts and cannot remove their own access', async ({
  page,
}) => {
  await page.goto('/admin/admins/');
  await expect(page.getByRole('heading', { name: 'Two accounts.' })).toBeVisible();
  const firstAdmin = page.getByRole('region', {
    name: `${testAdminFixture.accounts[0].name} admin account`,
  });
  const secondAdmin = page.getByRole('region', {
    name: `${testAdminFixture.accounts[1].name} admin account`,
  });
  await expect(firstAdmin).toContainText('You');
  await expect(firstAdmin.getByRole('button', { name: 'Remove access' })).toHaveCount(0);
  await expect(secondAdmin.getByRole('button', { name: 'Remove access' })).toBeVisible();
  await expect(
    secondAdmin.getByRole('heading', {
      name: `Change email for ${testAdminFixture.accounts[1].name}`,
    }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your sign-in details' })).toBeVisible();
});

test('signing out returns to the main page and ends the admin session', async ({ browser }) => {
  // Use a fresh session so this test does not revoke the shared fixture token.
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:4186',
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await page.goto('/login/');
  await page.getByLabel('Email').fill(testAdminFixture.accounts[1].email);
  await page.getByLabel('Password', { exact: true }).fill(testAdminFixture.accounts[1].password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/$/);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:4186/');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await page.goto('/admin/');
  await expect(page).toHaveURL(/\/login\/$/);
  await context.close();
});
