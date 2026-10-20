import { test, expect } from '@playwright/test';

test.describe('Bagg Smoke Suite', () => {
  test('Marketing page loads with core positioning', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Bagg/);
    await expect(page.locator('h1')).toContainText('Invoice like a pro');
    await expect(page.locator('h1')).toContainText('Get paid without chasing');
  });

  test('Freelancer dashboard displays currency breakdowns', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.getByText('NGN Accounts')).toBeVisible();
    await expect(page.getByText('USD Accounts')).toBeVisible();
  });

  test('Client invoice view displays payment instructions and I Have Paid flow', async ({ page }) => {
    await page.goto('/i/token_demo_sample_ngn');
    await expect(page.getByText('INV-0001')).toBeVisible();
    await expect(page.getByText('How to Pay in NGN')).toBeVisible();
    await expect(page.getByText('Guaranty Trust Bank (GTBank)')).toBeVisible();

    const claimButton = page.getByRole('button', { name: /I Have Paid This Invoice/i });
    await expect(claimButton).toBeVisible();
  });
});
