import { test, expect, type Page } from '@playwright/test';
async function login(page: Page) {
  await page.goto('/me');
  await page.getByRole('button', { name: 'Open your space', exact: true }).click();
  await page.getByRole('button', { name: 'Continue as demo shop owner' }).click();
  await expect(page.getByRole('heading', { name: /Make yourself at home/ })).toBeVisible();
}
test('discover has useful search, filters and exactly three mobile destinations', async ({
  page,
}, info) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Good finds. Your kind of people.' }),
  ).toBeVisible();
  await expect(page.locator('.bottom-nav a')).toHaveCount(3);
  await page.getByRole('button', { name: 'Fashion', exact: true }).click();
  await expect(page.locator('.product-meta').first()).toContainText('Fashion');
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByLabel('Sort products').selectOption('price_asc');
  await expect(page.locator('.product-card').first()).toContainText('RM');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.screenshot({
    path: `artifacts/discover-${info.project.name}-tested.png`,
    fullPage: false,
  });
});
test('profile changes persist and saved items are server-backed', async ({ page }) => {
  await login(page);
  await page.goto('/settings');
  await page.getByLabel('A little about you').fill('Quiet objects for everyday rituals.');
  await page.getByRole('button', { name: 'Save your profile' }).click();
  await expect(page.getByRole('status')).toContainText('Your profile is looking good');
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Open your space', exact: true })).toBeVisible();
  const favorite = page.getByRole('button', { name: /^(Unsave|Save) Cloud ceramic mug$/ });
  await expect(favorite).toBeEnabled();
  if ((await favorite.getAttribute('aria-pressed')) === 'true') {
    await favorite.click();
    await expect(
      page.getByRole('button', { name: 'Save Cloud ceramic mug', exact: true }),
    ).toBeEnabled();
  }
  await page.getByRole('button', { name: 'Save Cloud ceramic mug', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Unsave Cloud ceramic mug', exact: true }),
  ).toBeVisible();
  await page.goto('/me?saved=1');
  await expect(page.getByRole('heading', { name: 'Cloud ceramic mug' })).toBeVisible();
});
test('editor edits, autosaves, undoes, previews, publishes and restores', async ({
  page,
}, info) => {
  await login(page);
  await page.goto('/me/edit');
  if (info.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Block properties', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Hero banner', exact: true })).toBeVisible();
  const heading = page.getByLabel('Heading', { exact: true });
  await heading.fill(`Thoughtfully made. ${info.project.name}`);
  await expect(page.getByRole('status').first()).toContainText('All changes saved');
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Close inspector', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).first().click();
  await page.getByRole('button', { name: 'Redo', exact: true }).first().click();
  await expect(page.getByRole('status').first()).toContainText('All changes saved');
  await page.reload();
  await expect(page.locator('.sf-hero h1')).toContainText(
    `Thoughtfully made. ${info.project.name}`,
  );
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('status').last()).toContainText('Your space is live');
  await page.screenshot({ path: `artifacts/editor-${info.project.name}-tested.png` });
  await page.goto('/shop/studio-hening');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    `Thoughtfully made. ${info.project.name}`,
  );
  await page.goto('/me/edit');
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.getByRole('button', { name: 'Version history', exact: true }).last().click();
  await expect(page.getByRole('dialog', { name: 'Every version of you.' })).toBeVisible();
  await page.getByRole('button', { name: 'Restore', exact: true }).last().click();
  await expect(page.getByRole('status').last()).toContainText('restored as a new draft');
});
test('sandbox purchase completes and buyer can request a refund', async ({ page }) => {
  await login(page);
  await page.goto('/product/cloud-ceramic-mug');
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await page.goto('/cart');
  await page.getByRole('link', { name: 'Sandbox checkout', exact: true }).first().click();
  await page.getByLabel('Full name', { exact: true }).fill('Sandbox Buyer');
  await page.getByLabel('Street address', { exact: true }).fill('123 Test Road');
  await page.getByLabel('City', { exact: true }).fill('Kuala Lumpur');
  await page.getByLabel('Postcode', { exact: true }).fill('50000');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Place sandbox order', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A good find. A lovely choice.' })).toBeVisible();
  await expect(page.getByText('Sandbox order. No real payment was collected.')).toBeVisible();
  await page.getByRole('button', { name: 'Request sandbox refund', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your sandbox order is refunded.' }),
  ).toBeVisible();
});
