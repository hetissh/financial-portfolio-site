// Verifies a certification PDF stays private until its profile entry is visible.
import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

test('certification PDF publishes with its entry and disappears when hidden', async ({ page }) => {
  await page.goto('/admin/profile/');
  const index = (await page.getByRole('group', { name: /^Certification \d+$/ }).count()) + 1;
  await page.getByRole('button', { name: 'Add certification' }).click();
  const group = page.getByRole('group', { name: `Certification ${index}` });
  await group
    .getByRole('textbox', { name: `Certification ${index} name` })
    .fill('Sample PDF award');
  await group.getByRole('textbox', { name: 'Issuer' }).fill('Example Institute');
  await group.getByLabel('Certification PDF').setInputFiles({
    name: 'award.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n'),
  });
  await expect(group.getByRole('link', { name: 'Open current PDF' })).toBeVisible();
  const preview = await group.getByRole('link', { name: 'Open current PDF' }).getAttribute('href');
  expect(preview).toBeTruthy();
  expect((await page.request.get(preview!)).status()).toBe(200);
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('status')).toContainText('Profile saved');
  await page.goto('/');
  await page.getByRole('link', { name: 'Credentials' }).click();
  await expect(page).toHaveURL(/#credentials$/);
  const credential = page.locator('.home-credentials li').filter({ hasText: 'Sample PDF award' });
  await expect(credential.getByRole('link', { name: /PDF/ })).toBeVisible();
  const publicUrl = await credential.getByRole('link', { name: /PDF/ }).getAttribute('href');
  const publicRoot = process.env.PORTFOLIO_ADMIN_TEST_PUBLIC;
  expect(publicRoot).toBeTruthy();
  const publishedFile = path.join(publicRoot!, publicUrl!);
  expect(readFileSync(publishedFile).subarray(0, 5).toString()).toBe('%PDF-');
  await page.goto('/admin/profile/');
  await page
    .getByRole('group', { name: `Certification ${index}` })
    .getByRole('checkbox', { name: 'Show on site' })
    .uncheck();
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('status')).toContainText('Profile saved');
  await page.goto('/');
  await expect(page.locator('.home-credentials')).not.toContainText('Sample PDF award');
  expect(existsSync(publishedFile)).toBe(false);
});
