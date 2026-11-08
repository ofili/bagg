'use client';

/*
 * Phone step flow for creating a quote (4 steps): client, items, terms, review.
 * Review ends in "Approve & issue", not "send". Issuing and sharing stay two
 * separate actions: after issuing, the person lands on the quote page where
 * "Share quote" is the main action.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Key, useState} from 'react';
import {Check, UserPlus} from 'lucide-react';
import {BagCharacter} from '@/components/brand';
import {LineItemsEditor} from '@/components/invoice';
import {FlowShell} from '@/components/mobile/FlowShell';
import {MoneyInput} from '@/components/mobile/MoneyInput';
import {Money} from '@/components/money/Money';
import {BaggSelect, Button, Card, Chip, Field, Input, buttonStyles, inputStyles} from '@/components/ui';
import {VALIDITY_OPTIONS, useQuoteDraft} from '@/hooks/useQuoteDraft';
import {cleanAmount} from '@/lib/amount';
import {cn} from '@/lib/cn';

const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'];
const TITLES = ['Who is it for?', 'What are you quoting?', 'What are the terms?', 'Looks good?'];
const initials = (n: string) => {
    const p = n.trim().split(/\s+/);
    return ((p[0]?.[0] ?? '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
};

export function NewQuoteFlow() {
    const router = useRouter();
    const d = useQuoteDraft();
    const [step, setStep] = useState(0);
    const [query, setQuery] = useState('');
    const client = d.clients.find((c: { id: any; }) => c.id === d.selectedClientId);
    const filtered = d.clients.filter((c: {
        name: string;
    }) => c.name.toLowerCase().includes(query.trim().toLowerCase()));

    function next() {
        d.setErrorMsg(null);
        if (step === 0 && !d.selectedClientId) return d.setErrorMsg('Pick a client first, or add one.');
        if (step === 1) {
            const p = d.validateItems();
            if (p) return d.setErrorMsg(p);
        }
        if (step === 2) {
            const p = d.validate();
            if (p) return d.setErrorMsg(p);
        }
        setStep((s) => Math.min(3, s + 1));
    }

    const back = () => {
        d.setErrorMsg(null);
        setStep((s) => Math.max(0, s - 1));
    };

    async function issue() {
        const r = await d.saveAndIssue();
        if (!r) return;
        router.push(r.id ? `/quotes/${r.id}` : '/quotes');
    }

    async function saveOnly() {
        const id = await d.saveDraft();
        if (id !== null) router.push(id ? `/quotes/${id}` : '/quotes');
    }

    const footer =
        step < 3 ? (
            <>
                {step > 0 && d.netMinor > 0 && (
                    <div className="flex items-baseline justify-between">
                        <span className="text-body text-text-soft">Net payable</span>
                        <Money amountMinor={d.netMinor} currency={d.currency} className="text-amount-m"
                               hideCurrencyCode/>
                    </div>
                )}
                <div className="flex gap-3 pb-3">
                    {step > 0 && (
                        <Button variant="outline" zone="calm" size="lg" onClick={back}>
                            Back
                        </Button>
                    )}
                    <Button size="lg" fullWidth onClick={next}>
                        {step === 2 ? 'Review' : 'Next'}
                    </Button>
                </div>
            </>
        ) : (
            <div className="space-y-2 pb-3">
                <Button size="lg" fullWidth loading={d.saving} onClick={issue}>
                    Approve &amp; issue
                </Button>
                <div className="flex gap-3">
                    <Button variant="outline" zone="calm" fullWidth disabled={d.saving} onClick={back}>
                        Edit
                    </Button>
                    <Button variant="outline" zone="calm" fullWidth disabled={d.saving} onClick={saveOnly}>
                        Save draft
                    </Button>
                </div>
            </div>
        );

    return (
        <FlowShell
            heading={TITLES[step]}
            title="New quote"
            steps={step}
            total={4}
            closeHref="/quotes"
            closeLabel="Close and go back to quotes"
            error={d.errorMsg}
            onDismissError={() => d.setErrorMsg(null)}
            footer={footer}
        >
            {step === 0 && (
                <div className="space-y-4">
                    {d.clientsLoaded && d.clients.length === 0 ? (
                        <Card tone="peach" className="space-y-3 p-6 text-center">
                            <BagCharacter size={72} mood="happy" className="mx-auto" decorative/>
                            <h2 className="text-title">add your first client</h2>
                            <Link href="/clients/new" className={buttonStyles({size: 'lg'})}>
                                <UserPlus aria-hidden className="h-4 w-4"/> Add a client
                            </Link>
                        </Card>
                    ) : (
                        <>
                            {d.clients.length > 6 && (
                                <Field label="Search clients">
                                    {(a) => <Input type="search" value={query}
                                                   onChange={(e) => setQuery(e.target.value)} {...a} />}
                                </Field>
                            )}
                            <div role="radiogroup" aria-label="Client"
                                 className="overflow-hidden rounded-card border-brut border-ink bg-surface">
                                <Link href="/clients/new"
                                      className="flex min-h-16 items-center gap-3 px-3 font-extrabold hover:bg-surface-tint">
                  <span
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-ink">
                    <UserPlus aria-hidden className="h-5 w-5"/>
                  </span>
                                    Add new client
                                </Link>
                                {filtered.map((c) => {
                                    const on = c.id === d.selectedClientId;
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            role="radio"
                                            aria-checked={on}
                                            onClick={() => d.handleClientChange(c.id)}
                                            className={cn('flex min-h-16 w-full items-center gap-3 border-t border-line-subtle px-3 text-left', on ? 'bg-sun' : 'hover:bg-surface-tint')}
                                        >
                      <span aria-hidden
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-brut-thin border-ink bg-mango font-extrabold">
                        {initials(c.name)}
                      </span>
                                            <span className="min-w-0 flex-1">
                        <span className="block truncate font-extrabold">{c.name}</span>
                        <span className="block text-caption text-text-soft">{c.preferred_currency}</span>
                      </span>
                                            {on && (
                                                <span
                                                    className="flex h-7 w-7 items-center justify-center rounded-full border-brut-thin border-ink bg-leaf">
                          <Check aria-hidden className="h-4 w-4"/>
                        </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            <BaggSelect
                                label="Currency"
                                className="w-full"
                                value={d.currency}
                                onChange={d.setCurrency}
                                options={CURRENCIES.map((c) => ({value: c, label: c}))}
                            />
                        </>
                    )}
                </div>
            )}

            {step === 1 && (
                <div className="space-y-4">
                    {client && <p className="-mt-3 text-body text-text-soft">For {client.name}</p>}
                    <LineItemsEditor items={d.items} onChange={d.setItems} currency={d.currency}/>
                    <details className="rounded-card border-brut border-ink bg-surface">
                        <summary className="flex min-h-12 cursor-pointer items-center px-4 font-extrabold">Add a
                            discount or taxes
                        </summary>
                        <div className="space-y-4 border-t border-line-subtle p-4">
                            <MoneyInput
                                label="Discount"
                                currency={d.currency}
                                value={d.discountText}
                                onChange={(v) => d.setDiscountText(cleanAmount(v, d.discountText))}
                            />
                            <Field label="VAT or tax (%)">
                                {(a) => (
                                    <Input type="text" inputMode="decimal" placeholder="0" value={d.taxText}
                                           onChange={(e) => d.setTaxText(cleanAmount(e.target.value, d.taxText))} {...a} />
                                )}
                            </Field>
                            <Field label="Withholding tax (%)">
                                {(a) => (
                                    <Input type="text" inputMode="decimal" placeholder="0" value={d.whtText}
                                           onChange={(e) => d.setWhtText(cleanAmount(e.target.value, d.whtText))} {...a} />
                                )}
                            </Field>
                        </div>
                    </details>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-5">
                    <div className="space-y-2">
                        <p id="validity-label" className="text-body font-extrabold">
                            Offer is valid for
                        </p>
                        <div role="group" aria-labelledby="validity-label" className="flex flex-wrap gap-2">
                            {VALIDITY_OPTIONS.map((days) => (
                                <Chip key={days} selected={d.validityDays === days}
                                      onClick={() => d.setValidityDays(days)}>
                                    {days} days
                                </Chip>
                            ))}
                        </div>
                    </div>
                    <Field label="Deposit (%)"
                           hint="Optional. Your client sees the amount due upfront when they accept.">
                        {(a) => (
                            <Input type="text" inputMode="decimal" placeholder="0" value={d.depositText}
                                   onChange={(e) => d.setDepositText(cleanAmount(e.target.value, d.depositText))} {...a} />
                        )}
                    </Field>
                    {d.depositMinor > 0 && (
                        <p className="text-body">
                            Deposit on acceptance: <Money amountMinor={d.depositMinor} currency={d.currency}
                                                          className="font-extrabold" hideCurrencyCode/>
                        </p>
                    )}
                    <Field label="Note for your client" hint="Scope, timelines or terms.">
                        {(a) => (
                            <textarea rows={4} value={d.notes} onChange={(e) => d.setNotes(e.target.value)}
                                      className={cn(inputStyles, 'min-h-28 py-2')} {...a} />
                        )}
                    </Field>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4">
                    <Card zone="calm" className="space-y-3 p-4">
                        <div>
                            <p className="text-caption text-text-soft">For</p>
                            <p className="text-body-l font-extrabold">{client?.name ?? 'No client'}</p>
                        </div>
                        <ul className="divide-y divide-line-subtle border-y border-line-subtle">
                            {d.items.map((it: { id: Key | null | undefined; description: any; quantity: any; }) => (
                                <li key={it.id} className="py-2 text-body">
                  <span className="block truncate">
                    {it.description || 'Line item'}
                      {Number(it.quantity) !== 1 ? ` × ${it.quantity}` : ''}
                  </span>
                                </li>
                            ))}
                        </ul>
                        {d.discountMinor > 0 && (
                            <div className="flex justify-between text-body text-text-soft">
                                <span>Discount</span>
                                <Money amountMinor={d.discountMinor} currency={d.currency} hideCurrencyCode />
                            </div>
                        )}
                        {d.taxMinor > 0 && (
                            <div className="flex justify-between text-body text-text-soft">
                                <span>Tax ({d.taxPercent}%)</span>
                                <Money amountMinor={d.taxMinor} currency={d.currency} hideCurrencyCode />
                            </div>
                        )}
                        {d.whtMinor > 0 && (
                            <div className="flex justify-between text-body text-text-soft">
                                <span>Less withholding tax</span>
                                <Money amountMinor={d.whtMinor} currency={d.currency} hideCurrencyCode />
                            </div>
                        )}
                        <div className="flex items-baseline justify-between">
                            <span className="font-extrabold">Net payable</span>
                            <Money amountMinor={d.netMinor} currency={d.currency} className="text-amount-m" hideCurrencyCode />
                        </div>
                        {d.depositMinor > 0 && (
                            <div className="flex justify-between text-body text-text-soft">
                                <span>Deposit on acceptance</span>
                                <Money amountMinor={d.depositMinor} currency={d.currency} hideCurrencyCode />
                            </div>
                        )}
                        <p className="text-body text-text-soft">Valid for {d.validityDays} days</p>
                    </Card>
                    <p className="text-body text-text-soft">
                        Approving issues the quote and locks it. It is not shared yet. You choose how to share it next.
                    </p>
                </div>
            )}
        </FlowShell>
    );
}
