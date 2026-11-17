import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.env.AUDIT_BASE ?? 'http://localhost:3001';
const OUT = 'C:/Users/ofili/AppData/Local/Temp/opencode/shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const authContext = await browser.newContext();
const login = await authContext.request.post(`${BASE}/api/auth/verify`, {
  data: { email: 'demo@bagg.app', code: process.env.AUDIT_CODE },
});
if (!login.ok()) {
  console.error('login failed', login.status(), await login.text());
  process.exit(1);
}
const STATE = `${OUT}/state-final.json`;
await authContext.storageState({ path: STATE });
await authContext.close();

const CASES = [
  { name: 'dashboard', path: '/dashboard', auth: true },
  { name: 'quote-detail', path: '/quotes/qot_demo_sample', auth: true },
  { name: 'onboarding-plan', path: '/onboarding/plan', auth: true },
  { name: 'invoice-detail', path: '/invoices/inv_demo_sample_ngn', auth: true },
  { name: 'marketing-home', path: '/', auth: false },
];

for (const theme of ['light', 'dark']) {
  for (const viewport of [
    { name: '1440', width: 1440, height: 900 },
    { name: '360', width: 360, height: 800 },
  ]) {
    for (const testCase of CASES) {
      if (testCase.name === 'marketing-home' && theme === 'dark') continue;

      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        storageState: testCase.auth ? STATE : undefined,
      });
      await context.addInitScript((value) => {
        try {
          localStorage.setItem('bagg-theme', value);
        } catch {}
      }, theme);

      const page = await context.newPage();
      await page.goto(`${BASE}${testCase.path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      await page.waitForTimeout(700);
      await page.screenshot({
        path: `${OUT}/final-${testCase.name}-${theme}-${viewport.name}.png`,
      });
      await context.close();
    }
  }
}

// Print + reduced-motion checks on the public documents.
for (const path of ['/i/token_demo_sample_ngn', '/q/token_demo_sample_qot']) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await context.newPage();
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' });
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(700);
  const result = await page.evaluate(() => ({
    print: matchMedia('print').matches,
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  const slug = path.includes('/i/') ? 'invoice' : 'quote';
  await page.screenshot({ path: `${OUT}/print-${slug}.png`, fullPage: true });
  console.log(path, result);
  await context.close();
}

await browser.close();
