import { test, expect } from '@playwright/test';

test.describe('Bagg Smoke Suite', () => {
  test('Marketing page loads with core positioning', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/bagg/i);
    await expect(page.locator('h1')).toContainText('send. chase.');
    await expect(page.locator('h1')).toContainText('get paid.');
  });

  test('Freelancer dashboard greets the user and offers a new invoice', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('hey');
    await expect(page.getByRole('link', { name: /new invoice/i }).first()).toBeVisible();
  });

  test('Client invoice view displays payment instructions and I Have Paid flow', async ({ page }) => {
    await page.goto('/i/token_demo_sample_ngn');
    await expect(page.getByText('INV-0001', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'how to pay' })).toBeVisible();
    await expect(page.getByText('Guaranty Trust Bank (GTBank)')).toBeVisible();

    const claimButton = page.getByRole('button', { name: /i have paid this invoice/i });
    await expect(claimButton).toBeVisible();
  });

  test('Public quote view displays the seeded offer', async ({ page }) => {
    await page.goto('/q/token_demo_sample_qot');
    await expect(page.getByText('QOT-0001')).toBeVisible();
    await expect(page.getByText('Brand strategy workshop')).toBeVisible();
    await expect(page.getByRole('button', { name: /accept quote/i })).toBeVisible();
  });

  test('Public receipt view displays the seeded payment', async ({ page }) => {
    await page.goto('/r/token_demo_sample_rcp');
    await expect(page.getByText('REC-0001')).toBeVisible();
    await expect(page.getByText('GTB-DEMO-4821')).toBeVisible();
    await expect(page.getByText('issuer claim review')).toBeVisible();
  });
});
