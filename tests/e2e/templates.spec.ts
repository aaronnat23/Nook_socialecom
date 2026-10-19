import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('template previews preserve drafts; applying a design backs up and can be undone', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'Phone verification uses the physical iPhone.');
  await page.goto('/me');
  await page.getByRole('button', { name: 'Open your space', exact: true }).click();
  await page.getByRole('button', { name: 'Continue as demo shop owner' }).click();
  const gallery = page.getByRole('region', { name: 'Storefront templates' });
  await expect(gallery).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem('lilac-token'));
  const headers = { Authorization: `Bearer ${token}` };
  const me = await (await page.request.get('http://127.0.0.1:8000/api/v1/me', { headers })).json();
  const base = `http://127.0.0.1:8000/api/v1/shops/${me.shop.id}`;
  const original = await (await page.request.get(`${base}/draft`, { headers })).json();
  const publication = await (await page.request.get(`${base}/published`)).json();
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
  const accessibility = await new AxeBuilder({ page }).include('.template-section').analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({
    path: 'artifacts/my-space-redesign-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await gallery.screenshot({
    path: 'artifacts/template-collection-desktop.png',
    animations: 'disabled',
  });
  await gallery.getByRole('button', { name: 'Browse all 8' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: /^Preview .* template$/ })).toHaveCount(8);
  await dialog
    .getByRole('button', { name: 'Preview Dark Editorial template', exact: true })
    .click();
  await expect(dialog.getByRole('heading', { name: 'Dark Editorial', exact: true })).toBeVisible();
  await expect(dialog.locator('.template-live-preview .storefront')).toHaveCSS(
    'background-color',
    'rgb(30, 24, 39)',
  );
  expect((await (await page.request.get(`${base}/draft`, { headers })).json()).document).toEqual(
    original.document,
  );
  await page.screenshot({
    path: 'artifacts/template-dark-preview-desktop.png',
    animations: 'disabled',
  });
  await dialog.getByRole('link', { name: 'Customize Dark Editorial' }).click();
  const choice = page.getByRole('dialog', { name: 'A fresh look for your space.' });
  await expect(choice).toBeVisible();
  expect((await (await page.request.get(`${base}/draft`, { headers })).json()).document).toEqual(
    original.document,
  );
  await choice.getByRole('button', { name: /Replace layout/ }).click();
  await expect(page.locator('.sf-hero h1')).toHaveText('Less ordinary. More you.');
  await expect(page.getByRole('status').first()).toContainText('All changes saved');
  const versions = await (await page.request.get(`${base}/versions`, { headers })).json();
  expect(versions.items[0].note).toContain('Before applying a new template');
  expect((await (await page.request.get(`${base}/published`)).json()).document).toEqual(
    publication.document,
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('All changes saved');
  expect((await (await page.request.get(`${base}/draft`, { headers })).json()).document).toEqual(
    original.document,
  );
});
