import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const accessible = async (page: Page) => {
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
};

test('admin palette stays readable and does not follow View site into the public routes', async ({ page }) => {
  await page.goto('/admin/');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 241, 234)');
  const nav = page.getByRole('navigation', { name: 'Admin', exact: true });
  await expect(nav.getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute('aria-current', 'page');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await accessible(page);
  await nav.getByRole('link', { name: 'View site', exact: false }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(nav).toHaveCount(0);
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(248, 247, 242)');
  await expect(page.locator('.monogram').first()).toHaveCSS('background-color', 'rgb(44, 81, 65)');
  await page.goBack();
  await expect(nav).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 241, 234)');
});

test('profile controls, validation, focus and success keep distinct accessible colours', async ({ page }) => {
  await page.goto('/admin/profile/');
  const name = page.getByRole('textbox', { name: 'Name', exact: true });
  await expect(name).toBeEnabled();
  await expect(name).toHaveCSS('background-color', 'rgb(255, 252, 248)');
  await name.focus();
  await expect(name).toHaveCSS('outline-color', 'rgb(164, 79, 46)');
  await expect(page.locator('aside em').first()).toHaveCSS('color', 'rgb(44, 81, 65)');
  const email = page.getByLabel('Contact email', { exact: false });
  const original = await email.inputValue();
  await email.fill('invalid');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(email).toHaveCSS('border-top-color', 'rgb(169, 60, 50)');
  await accessible(page);
  await email.fill(original);
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved to');
  await expect(page.getByRole('status')).toHaveCSS('color', 'rgb(39, 99, 67)');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await accessible(page);
});

test('research card and saved article previews retain the public colours and cover', async ({ page }) => {
  await page.goto('/admin/research/qa-images/');
  const editorArt = page.locator('aside .research-art');
  const colour = await editorArt.evaluate(el => getComputedStyle(el).backgroundColor);
  const word = await editorArt.getAttribute('data-cover-word');
  await expect(page.locator('aside .research-card h3')).toHaveCSS('color', 'rgb(35, 46, 41)');
  await expect(page.locator('aside .research-card p')).toHaveCSS('color', 'rgb(99, 107, 100)');
  await accessible(page);
  // Rich image content may be normalised by the editor, triggering its unsaved-change guard.
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('link', { name: /^Preview(?: last saved version)?$/ }).click();
  await expect(page).toHaveURL(/\/admin\/research\/qa-images\/preview\/$/);
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 241, 234)');
  const previewArt = page.locator('main > .research-art');
  await expect(previewArt).toHaveCSS('background-color', colour);
  await expect(previewArt).toHaveAttribute('data-cover-word', word!);
  await expect(page.locator('blockquote')).toHaveCSS('border-left-color', 'rgb(44, 81, 65)');
  await accessible(page);
  await page.getByRole('link', { name: 'Open public page', exact: true }).click();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(248, 247, 242)');
  await expect(page.locator('main > .research-art')).toHaveCSS('background-color', colour);
});
