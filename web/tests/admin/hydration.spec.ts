import { test, expect } from '@playwright/test';

for (const extension of [false, true]) {
  test(`admin hydrates and remains editable ${extension ? 'with an extension-added body attribute' : 'in a clean browser'}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', message => { if (message.type() === 'error' && /hydrated|hydration/i.test(message.text())) errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    if (extension) {
      // Run before app scripts and mark the body as soon as the parser creates it.
      await page.addInitScript(() => {
        const mark = () => {
          if (!document.body) return false;
          document.body.setAttribute('cz-shortcut-listen', 'true');
          return true;
        };
        if (mark()) return;
        const observer = new MutationObserver(() => { if (mark()) observer.disconnect(); });
        observer.observe(document.documentElement || document, { childList: true, subtree: true });
      });
    }
    for (const path of ['/admin/research/note-01/', '/admin/research/new/', '/admin/profile/']) {
      await page.goto(path);
      const save = page.getByRole('button', { name: path.endsWith('profile/') ? 'Save profile' : path.includes('/new/') ? 'Create note' : 'Save changes', exact: true });
      await expect(save).toBeEnabled();
      if (extension) await expect(page.locator('body')).toHaveAttribute('cz-shortcut-listen', 'true');
      else await expect(page.locator('body')).not.toHaveAttribute('cz-shortcut-listen');
      const field = page.getByLabel(path.endsWith('profile/') ? 'Name' : 'Title', { exact: true });
      const original = await field.inputValue();
      await field.fill('Unsaved hydration check');
      await expect(page.getByRole('status')).toContainText('Unsaved changes');
      page.once('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: 'Reset edits', exact: true }).click();
      await expect(field).toHaveValue(original);
      await expect(page.getByRole('status')).not.toContainText('Unsaved changes');
      expect(errors).toEqual([]);
    }
  });
}
