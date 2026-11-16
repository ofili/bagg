import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = 'http://localhost:3000';
const OUT = 'C:/Users/ofili/AppData/Local/Temp/opencode/shots';
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: '360', width: 360, height: 800 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1440', width: 1440, height: 900 },
];

const browser = await chromium.launch();

// --- Sign in once and persist the session cookie -------------------------
const authContext = await browser.newContext();
const login = await authContext.request.post(`${BASE}/api/auth/verify`, {
  data: { email: 'demo@bagg.app', code: process.env.AUDIT_CODE },
});
if (!login.ok()) {
  console.error('login failed', login.status(), await login.text());
  process.exit(1);
}
await authContext.storageState({ path: `${OUT}/state.json` });

// --- Fixtures: a draft quote and a contact --------------------------------
let draftQuoteId = null;
let contactId = null;

const asArray = (value) => (Array.isArray(value) ? value : value?.items ?? []);

const existingQuotes = asArray(
  await (await authContext.request.get(`${BASE}/api/quotes`)).json(),
);
const draft = existingQuotes.find((q) => q.status === 'draft');
if (draft) {
  draftQuoteId = draft.id;
} else {
  const created = await authContext.request.post(`${BASE}/api/quotes`, {
    data: {
      client_id: 'cl_demo_sample',
      currency: 'NGN',
      validity_days: 14,
      items: [
        { description: 'Brand identity design', quantity: 1, unit_price_minor: 45000000 },
        { description: 'Logo refinement', quantity: 2, unit_price_minor: 7500000 },
      ],
      discount_minor: 250000,
      tax_rate_percent: 7.5,
      wht_rate_percent: 5,
      deposit_percentage: 50,
      notes: 'Includes two rounds of revisions.',
    },
  });
  if (created.ok()) draftQuoteId = (await created.json()).id;
  else console.error('draft quote create failed', created.status(), await created.text());
}

const contacts = asArray(
  await (await authContext.request.get(`${BASE}/api/clients/contacts`)).json(),
);
if (contacts.length > 0) {
  contactId = contacts[0].id;
} else {
  const created = await authContext.request.post(`${BASE}/api/clients/contacts`, {
    data: {
      client_id: 'cl_demo_sample',
      name: 'Ngozi Adeyemi',
      job_title: 'Finance Lead',
      email: 'ngozi@lagoscreative.studio',
      phone: '+234 802 555 0110',
      is_primary: false,
      notes: 'Prefers WhatsApp for payment confirmations.',
    },
  });
  if (created.ok()) contactId = (await created.json()).id;
  else console.error('contact create failed', created.status(), await created.text());
}

console.log(JSON.stringify({ draftQuoteId, contactId }));
await authContext.close();

// --- Pages ---------------------------------------------------------------
const PAGES = [
  { name: 'dashboard', path: '/dashboard', waitForText: 'Dashboard' },
  { name: 'clients', path: '/clients', waitForText: 'Clients' },
  { name: 'client-new', path: '/clients/new', waitForText: 'Add client' },
  { name: 'client-detail', path: '/clients/cl_demo_sample', waitForText: 'Kofi Mensah' },
  {
    name: 'client-edit',
    path: '/clients/cl_demo_sample',
    waitForText: 'Kofi Mensah',
    prepare: async (page) => {
      await page.getByRole('button', { name: 'Edit Details' }).click({ timeout: 8000 });
      await page.waitForTimeout(500);
    },
  },
  { name: 'contacts', path: '/clients/contacts', waitForText: 'Contacts' },
  { name: 'contact-new', path: '/clients/contacts/new', waitForText: 'Contact' },
  { name: 'contact-edit', path: `/clients/contacts/${contactId}/edit`, waitForText: 'Ngozi', skipIf: !contactId },
  { name: 'invoices', path: '/invoices', waitForText: 'Invoices' },
  { name: 'invoice-new', path: '/invoices/new', waitForText: 'New invoice' },
  { name: 'invoice-detail', path: '/invoices/inv_demo_sample_ngn', waitForText: 'INV-0001' },
  { name: 'quotes', path: '/quotes', waitForText: 'Quotes' },
  { name: 'quote-new', path: '/quotes/new', waitForText: 'New quote' },
  { name: 'quote-detail', path: '/quotes/qot_demo_sample', waitForText: 'QOT-0001' },
  {
    name: 'quote-edit',
    path: `/quotes/${draftQuoteId}`,
    waitForText: 'Draft',
    skipIf: !draftQuoteId,
    prepare: async (page) => {
      await page.getByRole('button', { name: /Edit draft/i }).first().click({ timeout: 8000 });
      await page.waitForTimeout(500);
    },
  },
  { name: 'recurring-new', path: '/recurring-invoices/new', waitForText: 'recurring' },
  { name: 'settings', path: '/settings', waitForText: 'Settings' },
  { name: 'settings-payments', path: '/settings/payments', waitForText: 'Payment' },
  { name: 'profile', path: '/profile', waitForText: 'Profile' },
  { name: 'onboarding', path: '/onboarding', waitForText: 'Business' },
  { name: 'onboarding-plan', path: '/onboarding/plan', waitForText: 'plan' },
  { name: 'public-quote', path: '/q/token_demo_sample_qot', waitForText: 'QOT-0001', loggedOut: true },
  { name: 'public-invoice', path: '/i/token_demo_sample_ngn', waitForText: 'INV-0001', loggedOut: true },
  { name: 'public-invoice-paid', path: '/i/token_demo_sample_paid', waitForText: 'INV-0002', loggedOut: true },
  { name: 'marketing-home', path: '/', waitForText: 'Bagg', loggedOut: true },
  { name: 'marketing-receipts', path: '/features/receipts', waitForText: 'receipt', loggedOut: true },
  { name: 'styleguide', path: '/styleguide', waitForText: 'Styleguide' },
];

// --- In-page audit -------------------------------------------------------
const AUDIT_FN = () => {
  const vw = document.documentElement.clientWidth;

  const parse = (value) => {
    const match = value && value.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const parts = match[1].split(',').map((n) => parseFloat(n));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };

  const lum = ({ r, g, b }) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  const ratio = (a, b) => {
    const l1 = lum(a);
    const l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  const backgroundOf = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== 'none') return null;
      const bg = parse(style.backgroundColor);
      if (bg && bg.a > 0.5) return bg;
      node = node.parentElement;
    }
    return parse(getComputedStyle(document.body).backgroundColor);
  };

  // Horizontal overflow and its culprits.
  const overflow = document.documentElement.scrollWidth - vw;
  const overflowEls = [];
  if (overflow > 1) {
    for (const el of document.querySelectorAll('body *')) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right <= vw + 1 && rect.left >= -1) continue;
      const style = getComputedStyle(el);
      if (style.position === 'fixed') continue;
      if (style.overflowX === 'hidden' || style.overflowX === 'clip') continue;
      overflowEls.push({
        tag: el.tagName,
        cls: String(el.className).slice(0, 140),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
      });
      if (overflowEls.length >= 6) break;
    }
  }

  // Visible controls without an accessible name source.
  const unlabeled = [];
  for (const el of document.querySelectorAll('input, select, textarea')) {
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (type === 'hidden') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const labelled =
      (el.labels && el.labels.length > 0) ||
      el.getAttribute('aria-label') ||
      el.getAttribute('aria-labelledby') ||
      el.closest('label');
    if (!labelled) {
      unlabeled.push({
        tag: el.tagName,
        type,
        id: el.id,
        name: el.getAttribute('name'),
        cls: String(el.className).slice(0, 120),
      });
    }
  }

  // Low-contrast text.
  const lowContrast = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'PATH', 'svg'].includes(el.tagName)) continue;
    if (el.closest('svg')) continue;
    if (el.getAttribute('aria-hidden') === 'true') continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    const hasText = [...el.childNodes].some(
      (node) => node.nodeType === 3 && node.textContent.trim().length > 1,
    );
    if (!hasText) continue;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    if (parseFloat(style.opacity) < 0.5) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (style.webkitTextFillColor && style.webkitTextFillColor === 'rgba(0, 0, 0, 0)') continue;

    const fg = parse(style.color);
    const bg = backgroundOf(el);
    if (!fg || !bg || fg.a < 0.5) continue;

    const size = parseFloat(style.fontSize);
    const weight = parseInt(style.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const min = large ? 3 : 4.5;
    const r = ratio(fg, bg);
    if (r >= min) continue;

    const text = el.textContent.trim().slice(0, 60);
    const key = `${text}|${style.color}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lowContrast.push({
      text,
      tag: el.tagName,
      cls: String(el.className).slice(0, 140),
      fg: style.color,
      bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
      ratio: Math.round(r * 100) / 100,
      min,
    });
    if (lowContrast.length >= 10) break;
  }

  return {
    overflow,
    overflowEls,
    unlabeled,
    lowContrast,
    theme: document.documentElement.dataset.theme,
    title: document.title,
  };
};

// --- Run -----------------------------------------------------------------
const results = [];
let totalIssues = 0;

for (const theme of ['light', 'dark']) {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: 'no-preference',
    });
    const loggedOutContext = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });

    for (const pageDef of PAGES) {
      if (pageDef.skipIf) continue;

      const page = await context.newPage();
      const consoleErrors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 200));
      });
      page.on('pageerror', (error) => consoleErrors.push(`PAGEERROR ${error.message}`.slice(0, 200)));

      const pageContext = pageDef.loggedOut ? loggedOutContext : context;
      const target = pageDef.loggedOut ? await pageContext.newPage() : page;

      await target.addInitScript((value) => {
        try {
          localStorage.setItem('bagg-theme', value);
        } catch {}
      }, theme);

      let status = null;
      try {
        const response = await target.goto(`${BASE}${pageDef.path}`, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
        status = response ? response.status() : null;
        if (pageDef.waitForText) {
          await target
            .getByText(pageDef.waitForText, { exact: false })
            .first()
            .waitFor({ timeout: 12000 })
            .catch(() => {});
        }
        await target.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {});
        await target.evaluate(() => document.fonts.ready).catch(() => {});
        await target.waitForTimeout(300);
        if (pageDef.prepare) {
          await pageDef.prepare(target).catch((error) => {
            console.log(`  prepare failed for ${pageDef.name}: ${String(error).slice(0, 120)}`);
          });
        }
        await target.waitForTimeout(200);

        const audit = await target.evaluate(AUDIT_FN);
        const issues = {
          overflow: audit.overflow > 1 ? audit.overflow : 0,
          overflowEls: audit.overflowEls,
          unlabeled: audit.unlabeled,
          lowContrast: audit.lowContrast,
          consoleErrors,
        };
        const issueCount =
          (issues.overflow ? 1 : 0) +
          issues.unlabeled.length +
          issues.lowContrast.length +
          consoleErrors.length;
        totalIssues += issueCount;

        results.push({
          theme,
          viewport: viewport.name,
          page: pageDef.name,
          status,
          themeResolved: audit.theme,
          ...issues,
        });

        if (issueCount > 0) {
          console.log(
            `\n[${theme} ${viewport.name}] ${pageDef.name} (${status}) ` +
              `overflow=${issues.overflow} unlabeled=${issues.unlabeled.length} contrast=${issues.lowContrast.length} errors=${consoleErrors.length}`,
          );
          if (issues.overflow) console.log('  overflow:', JSON.stringify(issues.overflowEls));
          if (issues.unlabeled.length) console.log('  unlabeled:', JSON.stringify(issues.unlabeled));
          if (issues.lowContrast.length) console.log('  contrast:', JSON.stringify(issues.lowContrast));
          if (consoleErrors.length) console.log('  errors:', JSON.stringify(consoleErrors.slice(0, 4)));
        }
      } catch (error) {
        totalIssues += 1;
        results.push({
          theme,
          viewport: viewport.name,
          page: pageDef.name,
          status,
          failure: String(error).slice(0, 300),
        });
        console.log(`\n[${theme} ${viewport.name}] ${pageDef.name} FAILED: ${String(error).slice(0, 300)}`);
      } finally {
        if (pageDef.loggedOut) await target.close();
        else await page.close();
      }
    }

    await context.close();
    await loggedOutContext.close();
  }
}

fs.writeFileSync(`${OUT}/audit.json`, JSON.stringify(results, null, 2));
console.log(`\nDone. ${results.length} page checks, ${totalIssues} issues.`);
await browser.close();
