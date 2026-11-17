import { chromium } from '@playwright/test';

const BASE = process.env.AUDIT_BASE ?? 'http://localhost:3001';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 768, height: 1024 } });

for (const token of ['token_demo_sample_ngn', 'token_demo_sample_paid']) {
  const page = await context.newPage();
  const failed = [];
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(`${res.status()} ${res.request().method()} ${res.url()}`);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('console:', msg.text().slice(0, 240));
  });
  await page.goto(`${BASE}/i/${token}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log(`\n${token} -> ${page.url()}`);
  console.log('h1', await page.locator('h1').allTextContents());
  console.log('failed', failed);
  await page.close();
}

await browser.close();
