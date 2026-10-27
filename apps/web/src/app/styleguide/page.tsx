'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import { Button, Card, Chip, Dialog, TextField, Toggle } from '@/components/ui';
import { StatusPill } from '@/components/status';
import { Money } from '@/components/money/Money';

// Dev-only review page for the neo-brutalist primitives. Hidden in production.
export default function StyleguidePage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const [currency, setCurrency] = useState('NGN');
  const [reminders, setReminders] = useState(true);
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  return (
    <main className="mx-auto max-w-3xl space-y-10 p-6 safe-bottom">
      <header className="flex items-center justify-between">
        <h1 className="text-display">styleguide</h1>
        <Toggle
          label="Dark mode"
          checked={dark}
          onChange={(v) => {
            setDark(v);
            document.documentElement.setAttribute('data-theme', v ? 'dark' : 'light');
          }}
        />
      </header>

      <section className="space-y-3">
        <h2 className="text-title">buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button>Send invoice</Button>
          <Button variant="accent">New invoice</Button>
          <Button variant="outline">Save draft</Button>
          <Button variant="danger">Void invoice</Button>
          <Button variant="link">Send a nudge</Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button size="lg">Pay ₦450,000.00</Button>
        </div>
        <p className="text-caption text-text-muted">Calm zone (client pages): same button, no shadow.</p>
        <Button zone="calm" size="lg" fullWidth>Pay $850.00</Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-title">cards</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card tone="mango">
            <p className="text-caption">Earned this month</p>
            <p className="text-amount-xl">₦1,240,000</p>
          </Card>
          <Card>
            <p className="text-caption text-text-muted">Waiting on clients</p>
            <p className="text-amount-l">$850.00</p>
          </Card>
          <Card zone="calm" className="sm:col-span-2">
            <p className="text-body">Calm card: client pages, tables and anywhere money is the focus.</p>
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-title">fields, chips, toggles</h2>
        <TextField label="Client name" placeholder="Tolu Studio" hint="Shown on the invoice." />
        <TextField label="Amount" defaultValue="abc" error="Enter a number, like 450000." />
        <div className="flex flex-wrap gap-3" role="group" aria-label="Currency">
          {['NGN', 'USD', 'GBP', 'EUR'].map((c) => (
            <Chip key={c} selected={currency === c} onClick={() => setCurrency(c)}>
              {c}
            </Chip>
          ))}
        </div>
        <Toggle
          label="Automatic reminders"
          hint="Stops as soon as the invoice is paid."
          checked={reminders}
          onChange={setReminders}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-title">status and money</h2>
        <div className="flex flex-wrap gap-2">
          {['draft', 'sent', 'payment_claimed', 'partially_paid', 'paid', 'overdue', 'cancelled'].map((s) => (
            <StatusPill key={s} status={s} />
          ))}
        </div>
        <div className="space-y-1">
          <Money amountMinor={45000000} currency="NGN" className="text-amount-l" hideCurrencyCode />
          <br />
          <Money amountMinor={85000} currency="USD" variant="paid" className="text-amount-m" hideCurrencyCode />
          <br />
          <Money amountMinor={32000} currency="GBP" variant="muted" className="text-amount-s" hideCurrencyCode />
          <br />
          <Money amountMinor={21000} currency="EUR" className="text-amount-s" hideCurrencyCode />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-title">dialog</h2>
        <Button variant="outline" onClick={() => setOpen(true)}>Open dialog</Button>
        <Dialog open={open} onClose={() => setOpen(false)} title="void invoice 0041?">
          <p className="text-body text-text-soft">
            Tolu Studio won&rsquo;t be able to pay it. This can&rsquo;t be undone.
          </p>
          <div className="flex justify-between gap-3">
            <Button variant="outline" zone="calm" onClick={() => setOpen(false)}>Keep it</Button>
            <Button variant="danger" zone="calm" onClick={() => setOpen(false)}>Void invoice</Button>
          </div>
        </Dialog>
      </section>
    </main>
  );
}
