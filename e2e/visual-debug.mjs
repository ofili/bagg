import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3000';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

const login = await context.request.post(`${BASE}/api/auth/verify`, {
  data: { email: 'demo@bagg.app', code: process.env.AUDIT_CODE },
});
console.log('login', login.status());
await context.storageState({ path: 'C:/Users/ofili/AppData/Local/Temp/opencode/shots/state.json' });

const page = await context.newPage();
const failed = [];
page.on('response', (res) => {
  if (res.status() >= 400) failed.push(`${res.status()} ${res.url()}`);
});
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('console:', msg.text().slice(0, 160));
});

await page.goto(`${BASE}/clients/cl_demo_sample`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
console.log('url', page.url());
console.log('h1', await page.locator('h1').allTextContents());
console.log('buttons', (await page.getByRole('button').allTextContents()).slice(0, 25));
console.log('body', (await page.locator('main').innerText()).slice(0, 700));
console.log('failed', failed.slice(0, 10));

const quotePage = await context.newPage();
await quotePage.goto(`${BASE}/quotes/qot_a1aad6da6a2c4eac8a85d8608193eebc`, { waitUntil: 'domcontentloaded' });
await quotePage.waitForTimeout(5000);
console.log('\nquote url', quotePage.url());
console.log('quote h1', await quotePage.locator('h1').allTextContents());
console.log('quote buttons', (await quotePage.getByRole('button').allTextContents()).slice(0, 25));
console.log('quote body', (await quotePage.locator('main').innerText()).slice(0, 700));

await browser.close();
