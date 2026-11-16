import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3000';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

const login = await context.request.post(`${BASE}/api/auth/verify`, {
  data: { email: 'demo@bagg.app', code: '123456' },
});
console.log('login', login.status());

for (const [name, path] of [
  ['invoices', '/api/invoices'],
  ['quotes', '/api/quotes'],
  ['clients', '/api/clients'],
  ['recurring', '/api/recurring-invoices'],
]) {
  const res = await context.request.get(`${BASE}${path}`);
  const body = await res.json().catch(() => null);
  const items = Array.isArray(body) ? body : body?.items ?? body;
  console.log(`\n${name} ${res.status()}`);
  if (Array.isArray(items)) {
    for (const item of items.slice(0, 8)) {
      console.log(
        JSON.stringify({
          id: item.id,
          number: item.invoice_number ?? item.quote_number ?? item.name,
          status: item.status,
          client: item.client_name ?? item.client?.name,
        }),
      );
    }
  } else {
    console.log(JSON.stringify(body)?.slice(0, 400));
  }
}

await context.storageState({ path: 'C:/Users/ofili/AppData/Local/Temp/opencode/shots/state.json' });
await browser.close();
