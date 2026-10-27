import { test, expect, type Page } from '@playwright/test';
async function signIn(page: Page) {
  await page.goto('/me');
  await page.getByRole('button', { name: 'Open your space', exact: true }).click();
  await page.getByRole('button', { name: 'Continue as demo shop owner' }).click();
  await expect(page.getByRole('heading', { name: 'Studio Hening', level: 1 })).toBeVisible();
  await page.goto('/me/edit');
  await expect(page.getByRole('status').first()).toContainText('All changes saved');
}
test('block library, duplicate, accessible reorder and delete persist', async ({ page }, info) => {
  await signIn(page);
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Add', exact: true }).click();
  else await page.getByRole('button', { name: 'Add a block', exact: true }).click();
  await page.getByRole('button', { name: 'Story & text', exact: true }).click();
  await page.getByLabel('Heading', { exact: true }).fill('An independent little story');
  await expect(page.getByRole('status').first()).toContainText('All changes saved');
  await page.getByRole('button', { name: 'Duplicate block', exact: true }).click();
  await expect(
    page.locator('.sf-text').filter({ hasText: 'An independent little story' }),
  ).toHaveCount(2);
  await page.getByRole('button', { name: 'Layout', exact: true }).click();
  await page.getByRole('button', { name: 'Move up', exact: true }).click();
  await page.getByRole('button', { name: 'Delete block', exact: true }).click();
  await expect(
    page.locator('.sf-text').filter({ hasText: 'An independent little story' }),
  ).toHaveCount(1);
  await expect(page.getByRole('status').first()).toContainText('All changes saved');
  await page.reload();
  await expect(
    page.locator('.sf-text').filter({ hasText: 'An independent little story' }),
  ).toHaveCount(1);
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.getByRole('button', { name: 'Version history', exact: true }).last().click();
  await page.getByRole('button', { name: 'Restore', exact: true }).last().click();
  await expect(page.getByRole('status').last()).toContainText('restored as a new draft');
});
test('two devices preserve local edits on stale revision; offline edits recover', async ({
  page,
  browser,
}, info) => {
  test.skip(
    info.project.name === 'mobile',
    'The same database conflict path is exercised once on desktop.',
  );
  await signIn(page);
  const token = await page.evaluate(() => localStorage.getItem('lilac-token'));
  const context = await browser.newContext();
  await context.addInitScript((value) => localStorage.setItem('lilac-token', value!), token);
  const second = await context.newPage();
  await second.goto('http://127.0.0.1:3000/me/edit');
  await expect(second.getByRole('status').first()).toContainText('All changes saved');
  await page.getByLabel('Heading', { exact: true }).fill('First device saved');
  await expect(page.getByRole('status').first()).toContainText('All changes saved');
  await second.getByLabel('Heading', { exact: true }).fill('Second device local copy');
  await expect(
    second.getByText('This shop changed on another device. Your edits are kept here.'),
  ).toBeVisible();
  await expect(second.getByLabel('Heading', { exact: true })).toHaveValue(
    'Second device local copy',
  );
  await second.getByRole('button', { name: 'Reload latest', exact: true }).click();
  await expect(second.getByLabel('Heading', { exact: true })).toHaveValue('First device saved');
  await context.setOffline(true);
  await second.getByLabel('Heading', { exact: true }).fill('Safely saved after reconnect');
  await expect(second.getByRole('status').first()).toContainText('Offline');
  await context.setOffline(false);
  await expect(second.getByRole('status').first()).toContainText('All changes saved');
  await second.reload();
  await expect(second.getByLabel('Heading', { exact: true })).toHaveValue(
    'Safely saved after reconnect',
  );
  await context.close();
});
test('storefront remains within narrow phone, tablet and desktop widths', async ({
  page,
}, info) => {
  test.skip(
    info.project.name === 'mobile',
    'Widths are explicitly exercised in the desktop project.',
  );
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/shop/studio-hening');
    await expect(page.locator('.storefront:visible')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    await page.screenshot({ path: `artifacts/storefront-${width}.png`, fullPage: true });
  }
});

test('collection edits persist and the dialog restores focus', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'Native collection QA uses the physical iPhone.');
  await signIn(page);
  await page.goto('/me/products');
  const edit = page.getByRole('button', { name: 'Edit collection', exact: true }).first();
  await edit.click();
  let dialog = page.getByRole('dialog', { name: 'Edit collection', exact: true });
  const original = await dialog.getByLabel('Collection name').inputValue();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(edit).toBeFocused();
  await edit.click();
  await dialog.getByLabel('Collection name').fill('Weekend rituals');
  await dialog.getByRole('button', { name: 'Save collection', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Weekend rituals', exact: true })).toBeVisible();
  await edit.click();
  dialog = page.getByRole('dialog', { name: 'Edit collection', exact: true });
  await expect(dialog.getByLabel('Collection name')).toHaveValue('Weekend rituals');
  await dialog.getByLabel('Collection name').fill(original);
  await dialog.getByRole('button', { name: 'Save collection', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});

test('custom heading font renders and survives reopening the editor', async ({ page }, info) => {
  test.skip(
    info.project.name === 'mobile',
    'Native font rendering is verified on the physical iPhone.',
  );
  await signIn(page);
  await page.getByRole('button', { name: 'Style', exact: true }).click();
  await page.getByRole('combobox', { name: 'Font family', exact: true }).selectOption('Georgia');
  await expect(page.locator('.sf-hero h1')).toHaveCSS('font-family', /^Georgia/);
  await page.getByRole('combobox', { name: 'Font family', exact: true }).selectOption('Arial');
  await expect(page.locator('.sf-hero h1')).toHaveCSS('font-family', /^Arial/);
  await expect(page.getByRole('status').first()).toContainText('All changes saved');
  await page.reload();
  await expect(page.locator('.sf-hero h1')).toHaveCSS('font-family', /^Arial/);
  await page.getByRole('button', { name: 'Edit productGrid block', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Style', exact: true }).click();
  await page.getByRole('combobox', { name: 'Font family', exact: true }).selectOption('Arial');
  await expect(
    page.getByRole('button', { name: 'Edit productGrid block', exact: true }).locator('h2'),
  ).toHaveCSS('font-family', /^Arial/);
  await page.getByLabel('Text size', { exact: true }).fill('36');
  await page.getByRole('combobox', { name: 'Weight', exact: true }).selectOption('700');
  const sectionHeading = page
    .getByRole('button', { name: 'Edit productGrid block', exact: true })
    .locator('h2');
  await expect(sectionHeading).toHaveCSS('font-size', '36px');
  await expect(sectionHeading).toHaveCSS('font-weight', '700');
  await expect(page.getByRole('status').first()).toContainText('All changes saved');
});

test('layout style, pattern, shape and the new fonts restyle the selected block', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile', 'Native rendering is verified separately.');
  await signIn(page);
  await page.getByRole('combobox', { name: /Layout style/ }).selectOption('poster');
  await expect(page.locator('.sf-hero')).toHaveClass(/sfv-hero-poster/);
  await page.getByRole('button', { name: 'Style', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Font family', exact: true })
    .selectOption('DM Serif Display');
  await expect(page.locator('.sf-hero h1')).toHaveCSS('font-family', /^"DM Serif Display"/);
  await page.getByRole('combobox', { name: /Background pattern/ }).selectOption('dots');
  await expect(page.locator('[data-block-type="hero"]')).toHaveCSS(
    'background-image',
    /radial-gradient/,
  );
  await page.getByRole('combobox', { name: /Image shape/ }).selectOption('arch');
  await expect(page.locator('.sf-hero')).toHaveAttribute('data-shape', 'arch');
  await expect(page.getByRole('status').first()).toContainText('All changes saved');
  await page.reload();
  await expect(page.locator('.sf-hero')).toHaveClass(/sfv-hero-poster/);
  await expect(page.locator('.sf-hero')).toHaveAttribute('data-shape', 'arch');
});

test('colour codes can be typed, edited and shortened by hand', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'Same field; the desktop flow is enough.');
  await signIn(page);
  await page.getByRole('button', { name: 'Style', exact: true }).click();
  const hex = page.getByLabel('background hex value').first();
  const hero = page.locator('[data-block-type="hero"]');
  await hex.click();
  await hex.press('End');
  await hex.press('Backspace');
  await expect(hex).toHaveValue(/^#[0-9a-f]{5}$/i);
  await hex.press('Control+A');
  await page.keyboard.type('336699');
  await expect(hero).toHaveCSS('background-color', 'rgb(51, 102, 153)');
  await expect(hex).toHaveValue('#336699');
  await hex.press('Control+A');
  await page.keyboard.type('#0af');
  await hex.press('Tab');
  await expect(hero).toHaveCSS('background-color', 'rgb(0, 170, 255)');
  await expect(hex).toHaveValue('#00AAFF');
  await hex.press('Control+A');
  await page.keyboard.type('#12');
  await hex.press('Tab');
  await expect(hex).toHaveValue('#00AAFF');
  await expect(page.getByRole('status').first()).toContainText('All changes saved');
});

test('the block library forgets its last search and explains an empty one', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile', 'Same dialog; the desktop flow is enough.');
  await signIn(page);
  const search = page.getByPlaceholder('Search blocks…');
  const library = page.getByRole('dialog');
  await page.getByRole('button', { name: 'Add a block', exact: true }).click();
  await search.fill('social');
  await expect(library.getByRole('button', { name: 'Hero banner', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Add a block', exact: true }).click();
  await expect(search).toHaveValue('');
  await expect(library.getByRole('button', { name: 'Hero banner', exact: true })).toBeVisible();
  await search.fill('zzz');
  await expect(library.getByText(/No block matches/)).toBeVisible();
});

test('"Your space style" opens page-wide colours and fonts', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'The layers list is a sheet on phones.');
  await signIn(page);
  await page.getByRole('button', { name: /Your space style/ }).click();
  await expect(page.getByRole('heading', { name: 'Your space style' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Content', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Heading font')).toBeVisible();
});
