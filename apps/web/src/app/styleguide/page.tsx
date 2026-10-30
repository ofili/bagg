'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import { Button, Card, Chip, Dialog, TextField, Toggle, EmptyState, emptyStates } from '@/components/ui';
import { StatusPill } from '@/components/status';
import { Money } from '@/components/money/Money';
import { BagCharacter, BAG_MOODS, type BagMood } from '@/components/brand';

const MOOD_MOMENTS: Record<BagMood, { moment: string; note?: string }> = {
  happy: { moment: 'Payment confirmed, empty lists, normal states' },
  sleepy: { moment: 'Waiting on client approval or feedback, offline' },
  excited: { moment: 'Welcome, first client added' },
  superExcited: { moment: 'Milestones (10th invoice, files released)' },
  sad: { moment: 'Payment failed, retry button (provider only)' },
  confused: { moment: '404 page, dead or expired links, no search matches' },
  worried: { moment: 'Invoice overdue, server error 500 (provider only)' },
  thinking: { moment: 'Payment pending verification, loading/generating PDF' },
  locked: { moment: 'Protected files locked until conditions are met' },
  celebrating: { moment: 'Big milestones (first payment received)' },
};

// Dev-only review page for the neo-brutalist primitives. Hidden in production.
export default function StyleguidePage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const [currency, setCurrency] = useState('NGN');
  const [reminders, setReminders] = useState(true);
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [activeMood, setActiveMood] = useState<BagMood>('happy');
  const [compactEmpty, setCompactEmpty] = useState(false);

  return (
    <main className="mx-auto max-w-4xl space-y-12 p-6 safe-bottom">
      <header className="flex items-center justify-between border-b border-ink/10 pb-5">
        <div>
          <h1 className="text-display">styleguide</h1>
          <p className="mt-1 text-body text-text-soft">Neo-brutalist design tokens, character moods and UI components</p>
        </div>
        <Toggle
          label="Dark mode"
          checked={dark}
          onChange={(v) => {
            setDark(v);
            document.documentElement.setAttribute('data-theme', v ? 'dark' : 'light');
          }}
        />
      </header>

      {/* Bag Character Moods */}
      <section className="space-y-4">
        <div>
          <h2 className="text-title">bag character moods</h2>
          <p className="text-caption text-text-muted">
            10 product moods. Keeps calm and joyful. Never show sad or worried in client-facing views.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {BAG_MOODS.map((mood) => {
            const info = MOOD_MOMENTS[mood];
            return (
              <div
                key={mood}
                className="flex flex-col items-center justify-between rounded-card border-brut border-ink bg-surface p-4 text-center shadow-brut"
              >
                <div className="flex h-24 items-center justify-center">
                  <BagCharacter mood={mood} size={72} />
                </div>
                <div className="mt-2 w-full border-t border-ink/10 pt-2">
                  <p className="font-extrabold text-ink">{mood}</p>
                  <p className="mt-1 text-[11px] leading-tight text-text-muted">{info.moment}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* EmptyState Component */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-title">empty state component</h2>
            <p className="text-caption text-text-muted">
              Reusable empty states with preset messaging, link/button actions, and compact mode.
            </p>
          </div>
          <Toggle
            label="Compact mode"
            checked={compactEmpty}
            onChange={setCompactEmpty}
          />
        </div>

        {/* Live Interactive Preset Tester */}
        <div className="rounded-card border-brut border-ink bg-surface p-6 shadow-brut">
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-ink/10 pb-4">
            <span className="text-caption font-extrabold text-ink">Presets:</span>
            {(['invoicesFirst', 'quotesFirst', 'clientsFirst', 'noMatches', 'allPaid', 'nothingToDo', 'filesLocked', 'firstPayment'] as const).map((key) => (
              <Chip
                key={key}
                selected={activeMood === emptyStates[key].mood}
                onClick={() => setActiveMood(emptyStates[key].mood)}
              >
                {key}
              </Chip>
            ))}
          </div>

          <div className="rounded-card border border-ink/15 bg-canvas/40">
            <EmptyState
              mood={activeMood}
              title={`Demo: ${activeMood} empty state`}
              body={MOOD_MOMENTS[activeMood].moment}
              action={{ label: 'Primary action', href: '#' }}
              compact={compactEmpty}
            />
          </div>
        </div>

        {/* Showcase of real presets */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-card border-brut border-ink bg-surface p-4 shadow-brut">
            <span className="text-caption font-bold text-text-muted">emptyStates.invoicesFirst</span>
            <EmptyState {...emptyStates.invoicesFirst} compact />
          </div>
          <div className="rounded-card border-brut border-ink bg-surface p-4 shadow-brut">
            <span className="text-caption font-bold text-text-muted">emptyStates.noMatches</span>
            <EmptyState {...emptyStates.noMatches} action={{ label: 'Clear filters', onClick: () => {} }} compact />
          </div>
          <div className="rounded-card border-brut border-ink bg-surface p-4 shadow-brut">
            <span className="text-caption font-bold text-text-muted">emptyStates.filesLocked</span>
            <EmptyState {...emptyStates.filesLocked} compact />
          </div>
          <div className="rounded-card border-brut border-ink bg-surface p-4 shadow-brut">
            <span className="text-caption font-bold text-text-muted">emptyStates.allPaid</span>
            <EmptyState {...emptyStates.allPaid} compact />
          </div>
        </div>
      </section>

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
