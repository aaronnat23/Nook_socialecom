import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.goto('http://127.0.0.1:3000');
await page.locator('.product-card').first().waitFor();
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
  .analyze();
await writeFile('artifacts/accessibility.json', JSON.stringify(results.violations, null, 2));
console.log(
  JSON.stringify(
    results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      count: v.nodes.length,
      examples: v.nodes.slice(0, 5).map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
    null,
    2,
  ),
);
await browser.close();
