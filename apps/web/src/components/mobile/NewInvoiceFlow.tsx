'use client';

/*
 * Phone-only step flow for creating an invoice (4 steps):
 *   1 client   2 items   3 terms   4 review
 *
 * It uses the shared useInvoiceDraft hook, so totals, validation and the API
 * calls match the desktop form exactly.
 *
 * Review ends in "Approve & issue", not "send". Issuing and sending stay two
 * separate actions: after issuing, the person lands on the invoice page with
 * the send dialog ready (?send=1) and chooses WhatsApp or email there.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useRef, useState} from 'react';
import {Check, CreditCard, UserPlus, X} from 'lucide-react';
import {BagCharacter} from '@/components/brand';
import {InvoiceDocument, LineItemsEditor} from '@/components/invoice';
import {MoneyInput} from '@/components/mobile/MoneyInput';
import {Money} from '@/components/money/Money';
import {BaggSelect, Button, Card, Dialog, Field, Input, buttonStyles, inputStyles} from '@/components/ui';
import { InlineClientModal } from '@/components/clients/InlineClientModal';
import {SUPPORTED_CURRENCIES, addDays, type InvoiceDraft, type Client} from '@/hooks/useInvoiceDraft';
import {cleanAmount} from '@/lib/amount';
import {cn} from '@/lib/cn';
import {formatDate} from '@/lib/date';

const STEPS = ['client', 'items', 'terms', 'review'] as const;
const TITLES = ['Who is it for?', 'What did you do?', 'When should they pay?', 'Looks good?'];
const DUE_OPTIONS = [
    {days: 0, label: 'On receipt'},
    {days: 7, label: '7 days'},
    {days: 14, label: '14 days'},
    {days: 30, label: '30 days'},
] as const;

const initials = (name: string) => {
    const p = name.trim().split(/\s+/);
    return ((p[0]?.[0] ?? '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
};

const daysBetween = (fromIso: string, toIso: string) => {
    const [fy, fm, fd] = fromIso.split('-').map(Number);
    const [ty, tm, td] = toIso.split('-').map(Number);
    return Math.round((new Date(ty, tm - 1, td).getTime() - new Date(fy, fm - 1, fd).getTime()) / 86400000);
};

export function NewInvoiceFlow({draft}: { draft: InvoiceDraft }) {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [query, setQuery] = useState('');
    const [pickDate, setPickDate] = useState(false);
    const [showClientModal, setShowClientModal] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const headingRef = useRef<HTMLHeadingElement>(null);

    // Move focus to the step heading so screen readers and keyboards follow the flow.
    useEffect(() => {
        headingRef.current?.focus();
    }, [step]);

    const client = draft.clients.find((c: Client) => c.id === draft.selectedClientId);
    const gap = daysBetween(draft.issueDate, draft.dueDate);
    const knownGap = DUE_OPTIONS.some((o) => o.days === gap);

    const filtered = draft.clients.filter((c: Client) => c.name.toLowerCase().includes(query.trim().toLowerCase()));

    function next() {
        draft.setErrorMsg(null);
        if (step === 0 && !draft.selectedClientId) {
            draft.setErrorMsg('Pick a client first, or add one.');
            return;
        }
        if (step === 1) {
            const problem = draft.validate();
            if (problem) {
                draft.setErrorMsg(problem);
                return;
            }
        }
        setStep((s) => Math.min(STEPS.length - 1, s + 1));
    }

    function back() {
        draft.setErrorMsg(null);
        setStep((s) => Math.max(0, s - 1));
    }

    async function issue() {
        const result = await draft.saveAndIssue();
        if (!result) return;
        if (!result.id) {
            router.push('/invoices');
            return;
        }
        router.push(result.issued ? `/invoices/${result.id}?send=1` : `/invoices/${result.id}`);
    }

    async function saveOnly() {
        const id = await draft.saveDraft();
        if (id !== null) router.push(id ? `/invoices/${id}` : '/invoices');
    }

    return (
        <div className="space-y-5 p-4 pb-44">
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <Link
                        href="/invoices"
                        aria-label="Close and go back to invoices"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-brut-thin border-ink bg-surface"
                    >
                        <X aria-hidden className="h-5 w-5"/>
                    </Link>
                    <p className="flex-1 text-body-l font-extrabold">New invoice</p>
                    <p className="text-caption text-text-soft">
                        {step + 1} of {STEPS.length}
                    </p>
                </div>
                <div
                    role="progressbar"
                    aria-label="Progress"
                    aria-valuemin={1}
                    aria-valuemax={STEPS.length}
                    aria-valuenow={step + 1}
                    className="flex gap-1.5"
                >
                    {STEPS.map((s, i) => (
                        <span
                            key={s}
                            className={cn('h-1.5 flex-1 rounded-full border border-ink', i <= step ? 'bg-mango' : 'bg-surface-tint')}
                        />
                    ))}
                </div>
            </div>

            <h1 ref={headingRef} tabIndex={-1} className="text-title-l outline-none">
                {TITLES[step]}
            </h1>

            {draft.errorMsg && (
                <div role="alert"
                     className="flex items-start justify-between gap-2 rounded-row bg-[#FFB3B3] p-3 text-body text-[#5A1010]">
                    <span className="pt-2">{draft.errorMsg}</span>
                    <button
                        type="button"
                        aria-label="Dismiss message"
                        onClick={() => draft.setErrorMsg(null)}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn"
                    >
                        <X aria-hidden className="h-5 w-5"/>
                    </button>
                </div>
            )}

            {/* Step 1: client */}
            {step === 0 && (
                <div className="space-y-4">
                    {draft.clientsLoaded && draft.clients.length === 0 ? (
                        <Card tone="peach" className="space-y-3 p-6 text-center">
                            <BagCharacter size={72} mood="happy" className="mx-auto" decorative/>
                            <h2 className="text-title">add your first client</h2>
                            <p className="text-body text-text-soft">You need a client before you can send an
                                invoice.</p>
                            <Button size="lg" onClick={() => setShowClientModal(true)}>
                                <UserPlus aria-hidden className="h-4 w-4"/> Add a client
                            </Button>
                        </Card>
                    ) : (
                        <>
                            {draft.clients.length > 6 && (
                                <Field label="Search clients">
                                    {(a) => (
                                        <Input type="search" value={query}
                                               onChange={(e) => setQuery(e.target.value)} {...a} />
                                    )}
                                </Field>
                            )}
                            <div role="radiogroup" aria-label="Client"
                                 className="overflow-hidden rounded-card border-brut border-ink bg-surface">
                                <button
                                    type="button"
                                    onClick={() => setShowClientModal(true)}
                                    className="flex min-h-16 w-full items-center gap-3 px-3 font-extrabold hover:bg-surface-tint text-left"
                                >
                  <span
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-ink">
                    <UserPlus aria-hidden className="h-5 w-5"/>
                  </span>
                                    Add new client
                                </button>
                                {filtered.map((c: Client) => {
                                    const on = c.id === draft.selectedClientId;
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            role="radio"
                                            aria-checked={on}
                                            onClick={() => draft.handleClientChange(c.id)}
                                            className={cn(
                                                'flex min-h-16 w-full items-center gap-3 border-t border-line-subtle px-3 text-left',
                                                on ? 'bg-sun' : 'hover:bg-surface-tint',
                                            )}
                                        >
                      <span
                          aria-hidden
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-brut-thin border-ink bg-mango font-extrabold"
                      >
                        {initials(c.name)}
                      </span>
                                            <span className="min-w-0 flex-1">
                        <span className="block truncate font-extrabold">{c.name}</span>
                        <span className="block text-caption text-text-soft">
                          {c.preferred_currency} · {c.default_payment_terms_days || 14}-day terms
                        </span>
                      </span>
                                            {on && (
                                                <span className="flex h-7 w-7 items-center justify-center rounded-full border-brut-thin border-ink bg-leaf">
                          <Check aria-hidden className="h-4 w-4" />
                        </span>
                                            )}
                                        </button>
                                    );
                                })}
                                {filtered.length === 0 && draft.clients.length > 0 && (
                                    <p className="border-t border-line-subtle p-4 text-body text-text-soft">No client matches that.</p>
                                )}
                            </div>
                            <BaggSelect
                                label="Currency"
                                className="w-full"
                                value={draft.currency}
                                onChange={draft.setCurrency}
                                options={SUPPORTED_CURRENCIES.map((c: { code: any; label: any; }) => ({ value: c.code, label: c.label }))}
                            />
                        </>
                    )}
                </div>
            )}

            {/* Step 2: items */}
            {step === 1 && (
                <div className="space-y-4">
                    {client && <p className="-mt-3 text-body text-text-soft">For {client.name}</p>}
                    <LineItemsEditor items={draft.items} onChange={draft.setItems} currency={draft.currency} />
                    <details className="rounded-card border-brut border-ink bg-surface">
                        <summary className="flex min-h-12 cursor-pointer items-center px-4 font-extrabold">
                            Add a discount or tax
                        </summary>
                        <div className="space-y-4 border-t border-line-subtle p-4">
                            <MoneyInput
                                label="Discount"
                                currency={draft.currency}
                                value={draft.discountText}
                                onChange={(v) => draft.setDiscountText(cleanAmount(v, draft.discountText))}
                            />
                            <Field label="VAT or tax (%)">
                                {(a) => (
                                    <Input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0"
                                        value={draft.taxText}
                                        onChange={(e) => draft.setTaxText(cleanAmount(e.target.value, draft.taxText))}
                                        {...a}
                                    />
                                )}
                            </Field>
                        </div>
                    </details>
                </div>
            )}

            {/* Step 3: terms */}
            {step === 2 && (
                <div className="space-y-5">
                    <div className="space-y-3">
                        <div role="group" aria-label="Payment due" className="flex flex-wrap gap-2">
                            {DUE_OPTIONS.map((o) => {
                                const on = !pickDate && gap === o.days;
                                return (
                                    <button
                                        key={o.days}
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => {
                                            setPickDate(false);
                                            draft.setDueDate(addDays(draft.issueDate, o.days));
                                        }}
                                        className={cn(
                                            'min-h-11 rounded-full border-brut-thin border-ink px-4 text-body',
                                            on ? 'bg-sun font-extrabold' : 'bg-surface font-medium text-text-soft',
                                        )}
                                    >
                                        {o.label}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                aria-pressed={pickDate || !knownGap}
                                onClick={() => setPickDate(true)}
                                className={cn(
                                    'min-h-11 rounded-full border-brut-thin border-ink px-4 text-body',
                                    pickDate || !knownGap ? 'bg-sun font-extrabold' : 'bg-surface font-medium text-text-soft',
                                )}
                            >
                                Pick date
                            </button>
                        </div>
                        {(pickDate || !knownGap) && (
                            <Field label="Due date">
                                {(a) => <Input type="date" value={draft.dueDate} onChange={(e) => draft.setDueDate(e.target.value)} {...a} />}
                            </Field>
                        )}
                        <p className="text-body">
                            Due <span className="font-extrabold">{formatDate(draft.dueDate)}</span>
                        </p>
                        <details>
                            <summary className="flex min-h-11 cursor-pointer items-center text-body font-bold underline underline-offset-4">
                                Change issue date
                            </summary>
                            <div className="pt-2">
                                <Field label="Issue date">
                                    {(a) => (
                                        <Input type="date" value={draft.issueDate} onChange={(e) => draft.handleIssueDateChange(e.target.value)} {...a} />
                                    )}
                                </Field>
                            </div>
                        </details>
                    </div>

                    {draft.profileValidation && !draft.profileValidation.has_profile ? (
                        <Card zone="calm" tone="sun" className="space-y-2">
                            <h2 className="text-heading">no {draft.currency} payment details yet</h2>
                            <p className="text-body">Add them before you send this invoice, so your client knows where to pay.</p>
                            <Link href="/settings" className={buttonStyles({ variant: 'link' })}>
                                <CreditCard aria-hidden className="h-4 w-4" /> Add {draft.currency} details in settings
                            </Link>
                        </Card>
                    ) : (
                        <p className="flex min-h-11 items-center gap-2 text-body text-text-soft">
                            <Check aria-hidden className="h-4 w-4 text-leaf" /> {draft.currency} payment details are set up.
                        </p>
                    )}

                    <Field label="Note for your client" hint="Shown on the invoice, for example how to reference your payment.">
                        {(a) => (
                            <textarea
                                rows={4}
                                value={draft.notes}
                                onChange={(e) => draft.setNotes(e.target.value)}
                                className={cn(inputStyles, 'min-h-28 py-2')}
                                {...a}
                            />
                        )}
                    </Field>
                </div>
            )}

            {/* Step 4: review */}
            {step === 3 && (
                <div className="space-y-4">
                    <Card zone="calm" className="space-y-3 p-4">
                        <div>
                            <p className="text-caption text-text-soft">For</p>
                            <p className="text-body-l font-extrabold">{client?.name ?? 'No client'}</p>
                        </div>
                        <ul className="divide-y divide-line-subtle border-y border-line-subtle">
                            {draft.previewInvoice.items.map((it: { id: Key | null | undefined; description: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; quantity: any; total_minor: number; }) => (
                                <li key={it.id} className="flex items-baseline justify-between gap-3 py-2 text-body">
                  <span className="min-w-0 truncate">
                    {it.description}
                      {Number(it.quantity) !== 1 ? ` × ${it.quantity}` : ''}
                  </span>
                                    <Money amountMinor={it.total_minor} currency={draft.currency} hideCurrencyCode />
                                </li>
                            ))}
                        </ul>
                        {draft.discountMinor > 0 && (
                            <div className="flex justify-between text-body text-text-soft">
                                <span>Discount</span>
                                <Money amountMinor={-draft.discountMinor} currency={draft.currency} hideCurrencyCode />
                            </div>
                        )}
                        {draft.taxMinor > 0 && (
                            <div className="flex justify-between text-body text-text-soft">
                                <span>Tax ({draft.taxPercent}%)</span>
                                <Money amountMinor={draft.taxMinor} currency={draft.currency} hideCurrencyCode />
                            </div>
                        )}
                        <div className="flex items-baseline justify-between">
                            <span className="font-extrabold">Total due</span>
                            <Money amountMinor={draft.totalMinor} currency={draft.currency} className="text-amount-m" hideCurrencyCode />
                        </div>
                        <p className="text-body text-text-soft">Due {formatDate(draft.dueDate)}</p>
                    </Card>
                    <Button variant="outline" zone="calm" fullWidth onClick={() => setPreviewOpen(true)}>
                        See what your client will see
                    </Button>
                    <p className="text-body text-text-soft">
                        Approving issues the invoice and locks it. It is not sent yet. You choose WhatsApp or email next.
                    </p>
                </div>
            )}

            {/* Fixed action bar */}
            <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 space-y-3 border-t-brut border-ink bg-surface px-4 pt-3">
                {(step === 1 || step === 2) && draft.totalMinor > 0 && (
                    <div className="flex items-baseline justify-between">
                        <span className="text-body text-text-soft">Total</span>
                        <Money amountMinor={draft.totalMinor} currency={draft.currency} className="text-amount-m" hideCurrencyCode />
                    </div>
                )}
                {step < 3 ? (
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
                ) : (
                    <div className="space-y-2 pb-3">
                        <Button size="lg" fullWidth loading={draft.saving} onClick={issue}>
                            Approve &amp; issue
                        </Button>
                        <div className="flex gap-3">
                            <Button variant="outline" zone="calm" fullWidth disabled={draft.saving} onClick={back}>
                                Edit
                            </Button>
                            <Button variant="outline" zone="calm" fullWidth disabled={draft.saving} onClick={saveOnly}>
                                Save draft
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <Dialog
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                title="what your client will see"
                className="max-h-[90dvh] max-w-lg overflow-y-auto"
            >
                <InvoiceDocument variant="issuer" invoice={draft.previewInvoice} />
                <Button variant="outline" zone="calm" fullWidth onClick={() => setPreviewOpen(false)}>
                    Close preview
                </Button>
            </Dialog>
            <InlineClientModal
                open={showClientModal}
                onClose={() => setShowClientModal(false)}
                onClientCreated={draft.addClient}
                defaultCurrency={draft.currency}
            />
        </div>
    );
}
