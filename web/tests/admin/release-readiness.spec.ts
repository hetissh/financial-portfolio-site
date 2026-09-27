import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('release checklist reports every production blocker with working actions and accessible layout', async ({ page }) => {
  const errors: string[]=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/admin/');
  const release=page.getByRole('region',{name:'Release',exact:true});
  await expect(release).toContainText('3 items block a production build.');
  await expect(release).toContainText('Profile approved');
  await expect(release).toContainText('Production address');
  await expect(release).toContainText('At least one published note');
  await expect(release).toContainText('Sources are optional.');
  await expect(release).toContainText('Citations and résumé are optional.');
  for(const width of [320,390,1440]) {
    await page.setViewportSize({width,height:1000});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  await release.getByRole('link',{name:'Edit profile',exact:true}).click();
  await expect(page.getByRole('checkbox',{name:/Approved for release/})).not.toBeChecked();
  await page.goto('/admin/');
  await page.getByRole('region',{name:'Release',exact:true}).getByRole('link',{name:'Create a note',exact:true}).click();
  await expect(page.getByRole('heading',{level:1})).toContainText('Start a note.');
  expect(errors).toEqual([]);
});
