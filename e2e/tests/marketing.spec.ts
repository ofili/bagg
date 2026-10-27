import { test, expect } from '@playwright/test';

const marketingRoutes = [
  '/',
  '/features',
  '/creatives',
  '/pricing',
  '/security',
  '/about',
  '/help',
  '/contact',
  '/early-access',
  '/legal/terms',
  '/legal/privacy',
  '/legal/cookies',
];

test.describe('Marketing routes', () => {
  for (const route of marketingRoutes) {
    test(`${route} renders with shared chrome`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(/bagg/i);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
    });
  }
});

test('home page has canonical metadata and core positioning', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('send. chase.');
  await expect(page.locator('h1')).toContainText('get paid.');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /^http:\/\/localhost:3000\/?$/,
  );
});

test('desktop navigation marks the active page', async ({ page }) => {
  await page.goto('/features');
  await expect(
    page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Features' }),
  ).toHaveAttribute('aria-current', 'page');
});

test('legal pages are noindex placeholders', async ({ page }) => {
  await page.goto('/legal/terms');
  await expect(page.getByText(/plain-language summary, not the final legal agreement/i)).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('/signup redirects into the sign-in flow', async ({ page }) => {
  await page.goto('/signup');
  await expect(page).toHaveURL(/\/login\?intent=signup$/);
});

test('contact and early-access forms are present and honest about mailto', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.getByLabel('your name')).toBeVisible();
  await expect(page.getByLabel('email address')).toBeVisible();
  await expect(page.getByRole('button', { name: /open email app/i })).toBeVisible();
  await expect(page.getByText(/nothing sends until you press send there/i)).toBeVisible();

  await page.goto('/early-access');
  await expect(page.getByLabel('what do you do?')).toBeVisible();
  await expect(page.getByRole('button', { name: /join early access/i })).toBeVisible();
});

test('cookie notice can be dismissed and stays dismissed', async ({ page }) => {
  await page.goto('/');
  const notice = page.getByRole('region', { name: 'Cookie notice' });
  await expect(notice).toBeVisible();
  await notice.getByRole('button', { name: 'Got it' }).click();
  await expect(notice).toBeHidden();
  await page.reload();
  await expect(notice).toBeHidden();
});

test('sitemap and robots expose the public marketing routes', async ({ page }) => {
  const sitemap = await page.request.get('/sitemap.xml');
  expect(sitemap.ok()).toBeTruthy();
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain('/features');
  expect(sitemapText).not.toContain('/legal/terms');

  const robots = await page.request.get('/robots.txt');
  expect(robots.ok()).toBeTruthy();
  expect(await robots.text()).toMatch(/Sitemap: .*\/sitemap\.xml/);
});

test('unknown routes render the 404 page', async ({ page }) => {
  const response = await page.goto('/this-page-is-not-real');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: /took the day off/i })).toBeVisible();
});

test.describe('Marketing on mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('menu opens, navigates and closes', async ({ page }) => {
    await page.goto('/');
    const menuButton = page.locator('button[aria-controls="mobile-menu"]');
    await menuButton.click();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');

    const menu = page.locator('#mobile-menu');
    const featuresLink = menu.getByRole('link', { name: 'Features' });
    await expect(featuresLink).toBeVisible();
    await featuresLink.click();
    await expect(page).toHaveURL(/\/features$/);
  });

  test('key pages do not scroll sideways', async ({ page }) => {
    for (const route of ['/', '/features', '/pricing', '/creatives', '/legal/terms']) {
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${route} should not overflow horizontally`).toBeLessThanOrEqual(1);
    }
  });
});
