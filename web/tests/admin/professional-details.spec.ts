// Exercises the profile's contact, résumé, and certification editing controls.
import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

test('professional details can be added and reset without changing saved content', async ({
  page,
}) => {
  await page.goto('/admin/profile/');
  await expect(page.getByRole('button', { name: 'Add certification' })).toBeEnabled();
  await page.getByRole('button', { name: 'Add link' }).click();
  const linkIndex = await page.getByRole('group', { name: /^Contact link \d+$/ }).count();
  await page.getByRole('textbox', { name: `Link ${linkIndex} label` }).fill('LinkedIn');
  await page.getByRole('textbox', { name: 'Address' }).last().fill('https://example.com/profile');
  const certificationIndex =
    (await page.getByRole('group', { name: /^Certification \d+$/ }).count()) + 1;
  await page.getByRole('button', { name: 'Add certification' }).click();
  await page
    .getByRole('textbox', { name: `Certification ${certificationIndex} name` })
    .fill('Market Analysis');
  await page.getByRole('textbox', { name: 'Issuer' }).last().fill('Example Institute');
  await expect(page.getByLabel('Contact and credentials preview')).toContainText('Market Analysis');
  await page.getByRole('checkbox', { name: 'Show on site' }).last().uncheck();
  await expect(page.getByRole('status')).toContainText('Unsaved changes');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Reset edits' }).click();
  await expect(
    page.getByRole('textbox', { name: `Certification ${certificationIndex} name` }),
  ).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: `Link ${linkIndex} label` })).toHaveCount(0);
});

test('saved contact links and certifications appear on the public site', async ({ page }) => {
  await page.goto('/admin/profile/');
  const linkIndex = (await page.getByRole('group', { name: /^Contact link \d+$/ }).count()) + 1;
  const certificationIndex =
    (await page.getByRole('group', { name: /^Certification \d+$/ }).count()) + 1;
  await page.getByRole('button', { name: 'Add link' }).click();
  await page.getByRole('textbox', { name: `Link ${linkIndex} label` }).fill('Portfolio network');
  await page.getByRole('textbox', { name: 'Address' }).last().fill('https://example.org/network');
  await page.getByRole('button', { name: 'Add certification' }).click();
  await page
    .getByRole('textbox', { name: `Certification ${certificationIndex} name` })
    .fill('Financial Modelling');
  await page.getByRole('textbox', { name: 'Issuer' }).last().fill('Example Institute');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('status')).toContainText('Profile saved');
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Contact', exact: true })).toBeVisible();
  await expect(page.locator('#contact')).toContainText('Portfolio network');
  await expect(page.locator('#credentials')).toContainText('Financial Modelling');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
  await page.getByRole('link', { name: 'Contact', exact: true }).click();
  await expect(page).toHaveURL(/#contact$/);
  await page.goto('/admin/profile/');
  await page.getByRole('button', { name: `Remove contact link ${linkIndex}` }).click();
  await page.getByRole('button', { name: `Remove certification ${certificationIndex}` }).click();
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('status')).toContainText('Profile saved');
});

test('PDF résumé stays private until publication and is removed when unlinked', async ({
  page,
}) => {
  await page.goto('/admin/profile/');
  let uploaded: string | undefined;
  const previous = await page.locator('#field-resume').inputValue();
  try {
    await page.getByLabel('Upload PDF résumé').setInputFiles({
      name: 'test-resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n'),
    });
    await expect.poll(() => page.locator('#field-resume').inputValue()).not.toBe(previous);
    await expect(page.locator('#field-resume')).toHaveValue(/\/downloads\/resumes\/.*\.pdf/);
    uploaded = await page.locator('#field-resume').inputValue();
    expect((await page.request.get(uploaded)).status()).toBe(404);
    const preview = await page.request.get(
      `/admin/api/profile/resume/?path=${encodeURIComponent(uploaded)}`,
    );
    expect(preview.status()).toBe(200);
    expect((await preview.body()).subarray(0, 5).toString()).toBe('%PDF-');
    await expect(page.getByRole('status')).toContainText('Unsaved changes');
    await page.getByRole('checkbox', { name: 'Show résumé link on site' }).check();
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByRole('status')).toContainText('Profile saved');
    const testPublic = process.env.PORTFOLIO_ADMIN_TEST_PUBLIC;
    expect(testPublic).toBeTruthy();
    const publishedFile = path.join(testPublic!, uploaded);
    expect(readFileSync(publishedFile).subarray(0, 5).toString()).toBe('%PDF-');
    await page.goto('/');
    await expect(page.locator('#credentials')).toContainText('View résumé');
    await page.goto('/admin/profile/');
    await page.getByRole('button', { name: 'Remove from profile' }).click();
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByRole('status')).toContainText('Profile saved');
    expect(existsSync(publishedFile)).toBe(false);
  } finally {
    if (uploaded && /^\/downloads\/resumes\/[0-9a-f-]+\.pdf$/.test(uploaded)) {
      const root = process.env.PORTFOLIO_ADMIN_TEST_CONTENT;
      if (root) rmSync(path.join(root, 'resumes', path.basename(uploaded)), { force: true });
    }
  }
});
