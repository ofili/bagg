import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'mobile-390', width: 390, height: 800 },
];

const PUBLIC_PAGES = ['/i/token_demo_sample_ngn', '/q/token_demo_sample_qot', '/r/token_demo_sample_rcp'];

test.describe('Mobile Screenshots (360px / 390px)', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name}`, () => {
      for (const pagePath of PUBLIC_PAGES) {
        test(`renders ${pagePath} without layout overflow`, async ({ page }) => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await page.goto(pagePath);
          await page.waitForLoadState('networkidle');

          // Check no horizontal overflow
          const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
          const viewportWidth = page.viewportSize()!.width;
          expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);

          await page.screenshot({
            path: `e2e/screenshots/${viewport.name}${pagePath.replace(/\//g, '-')}.png`,
            fullPage: true,
          });
        });
      }
    });
  }
});
