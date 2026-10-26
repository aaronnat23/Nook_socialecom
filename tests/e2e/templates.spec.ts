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
  await gallery.getByRole('button', { name: 'Browse all 14' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: /^Preview .* template$/ })).toHaveCount(14);
  await dialog
    .getByRole('button', { name: 'Preview Dark Editorial template', exact: true })
    .click();
  await expect(dialog.getByRole('heading', { name: 'Dark Editorial', exact: true })).toBeVisible();
  await expect(dialog.locator('.template-live-preview .storefront')).toHaveCSS(
    'background-color',
    'rgb(20, 17, 26)',
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
  await expect(choice).not.toBeVisible();
  await expect(page.locator('.editor-canvas .sf-hero h1')).toHaveText(
    'Quiet objects. Bold intentions.',
  );
  await expect(page.getByRole('status').first()).toContainText('All changes saved');
  const versions = await (await page.request.get(`${base}/versions`, { headers })).json();
  expect(versions.items[0].note).toContain('Before applying a new template');
  expect((await (await page.request.get(`${base}/published`)).json()).document).toEqual(
    publication.document,
  );
  await page.getByRole('button', { name: 'Edit productGrid block', exact: true }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Product grid', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('All changes saved');
  expect((await (await page.request.get(`${base}/draft`, { headers })).json()).document).toEqual(
    original.document,
  );
});

test('all fourteen previews show distinct editable structures and fit the preview panel', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'Native inspection uses the physical iPhone.');
  await page.goto('/me');
  await page.getByRole('button', { name: 'Open your space', exact: true }).click();
  await page.getByRole('button', { name: 'Continue as demo shop owner' }).click();
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await page.getByRole('button', { name: 'Browse all 14' }).click();
  const names = [
    'Minimal Studio',
    'Dark Editorial',
    'Botanical',
    'Y2K Diary',
    'Vintage Film',
    'Handmade Market',
    'Streetwear Drop',
    'Art Gallery',
    'Candy Counter',
    'Photocopy Zine',
    'Atelier',
    'Night Market',
    'Seaside Studio',
    'Terrazzo Studio',
  ];
  const structures = new Set<string>();
  for (const name of names) {
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: `Preview ${name} template`, exact: true }).click();
    const storefront = dialog.locator('.template-live-preview .storefront');
    await expect(storefront).toBeVisible();
    structures.add(
      await storefront.evaluate((node) =>
        JSON.stringify(
          Array.from(node.querySelectorAll('[data-block-type]')).map((block) => [
            block.getAttribute('data-block-type'),
            block.parentElement?.className,
          ]),
        ),
      ),
    );
    expect(await storefront.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(
      true,
    );
    await page.screenshot({
      path: `artifacts/template-layout-${name.toLowerCase().replaceAll(' ', '-')}.png`,
      animations: 'disabled',
    });
    await dialog.getByRole('button', { name: 'All templates', exact: true }).click();
  }
  expect(structures.size).toBe(14);
});
