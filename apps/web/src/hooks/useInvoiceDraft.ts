'use client';

/*
 * State and API logic for creating an invoice, moved out of
 * invoices/new/NewQuoteDesktop.tsx so the desktop form and the phone step flow share it.
 * The calculations, validation messages and POST body are unchanged from the
 * existing page.
 *
 * Assumption to check: POST /invoices returns the created invoice with an `id`.
 */
import { useEffect, useState } from 'react';
import { lineTotalMinor, newLineItem, type LineItem } from '@/components/invoice';
import { toMinor } from '@/lib/amount';

const API_BASE = '/api';

export interface Client {
    id: string;
    name: string;
    email?: string | null;
    preferred_currency: string;
    default_payment_terms_days: number;
}

export interface ValidationState {
    has_profile: boolean;
    message: string;
}

export const SUPPORTED_CURRENCIES = [
    { code: 'NGN', label: 'NGN · Nigerian naira' },
    { code: 'USD', label: 'USD · US dollar' },
    { code: 'GBP', label: 'GBP · British pound' },
    { code: 'EUR', label: 'EUR · Euro' },
    { code: 'GHS', label: 'GHS · Ghanaian cedi' },
    { code: 'KES', label: 'KES · Kenyan shilling' },
    { code: 'ZAR', label: 'ZAR · South African rand' },
];

export const toIsoDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Adds days in local time, so the date never shifts by a day across time zones. */
export function addDays(iso: string, days: number) {
    const [y, m, d] = iso.split('-').map(Number);
    return toIsoDate(new Date(y, m - 1, d + days));
}

async function detailOf(res: Response, fallback: string) {
    const body = await res.json().catch(() => ({}));
    return (body.detail as string) || (body.message as string) || fallback;
}

export function useInvoiceDraft() {
    const today = toIsoDate(new Date());

    const [clients, setClients] = useState<Client[]>([]);
    const [clientsLoaded, setClientsLoaded] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [currency, setCurrency] = useState('NGN');
    const [profileValidation, setProfileValidation] = useState<ValidationState | null>(null);

    const [issueDate, setIssueDate] = useState(today);
    const [dueDate, setDueDate] = useState(() => addDays(today, 14));

    const [items, setItems] = useState<LineItem[]>(() => [newLineItem()]);
    const [discountText, setDiscountText] = useState('');
    const [taxText, setTaxText] = useState('');
    const [notes, setNotes] = useState('');

    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${API_BASE}/clients`, { credentials: 'include' })
            .then((res) => res.json())
            .then((data: Client[]) => {
                setClients(data);
                if (data.length > 0) {
                    setSelectedClientId(data[0].id);
                    setCurrency(data[0].preferred_currency || 'NGN');
                    setDueDate(addDays(today, data[0].default_payment_terms_days || 14));
                }
            })
            .catch(() => {})
            .finally(() => setClientsLoaded(true));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // A payment profile for the chosen currency must exist before the invoice can be sent.
    useEffect(() => {
        if (!currency) return;
        fetch(`${API_BASE}/payments/profiles/validate/${currency}`, { credentials: 'include' })
            .then((res) => res.json())
            .then((data) => setProfileValidation({ has_profile: data.has_profile, message: data.message }))
            .catch(() => setProfileValidation({ has_profile: true, message: 'Validated' }));
    }, [currency]);

    const termsFor = (clientId: string) =>
        clients.find((c) => c.id === clientId)?.default_payment_terms_days || 14;

    const handleClientChange = (clientId: string) => {
        setSelectedClientId(clientId);
        const client = clients.find((c) => c.id === clientId);
        if (client) {
            if (client.preferred_currency) setCurrency(client.preferred_currency);
            setDueDate(addDays(issueDate, termsFor(clientId)));
        }
    };

    const handleIssueDateChange = (value: string) => {
        setIssueDate(value);
        if (value) setDueDate(addDays(value, termsFor(selectedClientId)));
    };

    // Everything is calculated in minor units.
    const subtotalMinor = items.reduce((acc, it) => acc + lineTotalMinor(it), 0);
    const discountMinor = toMinor(discountText);
    const discountedSubtotalMinor = Math.max(0, subtotalMinor - discountMinor);
    const taxPercent = parseFloat(taxText) || 0;
    const taxMinor = Math.round(discountedSubtotalMinor * (taxPercent / 100));
    const totalMinor = discountedSubtotalMinor + taxMinor;

    /** Returns the message to show, or null when the draft is valid. */
    const validate = (): string | null => {
        if (!selectedClientId) return 'Pick a client first, or add one under Clients.';
        if (items.some((it) => !it.description.trim())) return 'Give every line item a description.';
        if (totalMinor <= 0) return 'The total is zero. Add a price to at least one line item.';
        return null;
    };

    /** Creates the draft. Returns the new invoice id, or null if it failed. */
    const saveDraft = async (): Promise<string | null> => {
        const problem = validate();
        if (problem) {
            setErrorMsg(problem);
            return null;
        }

        setSaving(true);
        setErrorMsg(null);

        const payload = {
            client_id: selectedClientId,
            currency,
            issue_date: issueDate,
            due_date: dueDate || undefined,
            items: items.map((it) => ({
                description: it.description.trim(),
                quantity: Number(it.quantity) || 1,
                unit_price_minor: toMinor(it.unit_price),
            })),
            discount_minor: discountMinor,
            tax_rate_percent: taxPercent,
            notes,
        };

        try {
            const res = await fetch(`${API_BASE}/invoices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(await detailOf(res, 'Failed to save draft invoice'));
            const created = await res.json().catch(() => ({}));
            return (created?.id as string) ?? '';
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : 'Error saving invoice');
            return null;
        } finally {
            setSaving(false);
        }
    };

    /**
     * Saves the draft, then approves and issues it. It does NOT send it: sending
     * stays a separate, explicit step on the invoice page.
     * If issuing fails, the draft is kept and `issued` is false.
     */
    const saveAndIssue = async (): Promise<{ id: string; issued: boolean } | null> => {
        const id = await saveDraft();
        if (id === null) return null;
        if (!id) return { id: '', issued: false };

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/invoices/${id}/finalize`, { method: 'POST', credentials: 'include' });
            if (!res.ok) throw new Error(await detailOf(res, 'Could not approve and issue this invoice.'));
            return { id, issued: true };
        } catch (err: unknown) {
            setErrorMsg(
                `Saved as a draft, but it could not be issued. ${err instanceof Error ? err.message : ''}`.trim(),
            );
            return { id, issued: false };
        } finally {
            setSaving(false);
        }
    };

    const previewInvoice = {
        id: 'preview',
        invoice_number: 'to be assigned',
        client_name: clients.find((c) => c.id === selectedClientId)?.name ?? null,
        currency,
        status: 'draft',
        issue_date: issueDate,
        due_date: dueDate || null,
        items: items.map((it) => ({
            id: it.id,
            description: it.description || 'Line item',
            quantity: it.quantity || 1,
            unit_price_minor: toMinor(it.unit_price),
            total_minor: lineTotalMinor(it),
        })),
        subtotal_minor: subtotalMinor,
        discount_minor: discountMinor,
        tax_rate_percent: taxPercent,
        tax_minor: taxMinor,
        total_minor: totalMinor,
        notes: notes || null,
    };

    return {
        clients,
        clientsLoaded,
        selectedClientId,
        currency,
        setCurrency,
        profileValidation,
        issueDate,
        dueDate,
        setDueDate,
        items,
        setItems,
        discountText,
        setDiscountText,
        taxText,
        setTaxText,
        notes,
        setNotes,
        saving,
        errorMsg,
        setErrorMsg,
        subtotalMinor,
        discountMinor,
        taxPercent,
        taxMinor,
        totalMinor,
        handleClientChange,
        handleIssueDateChange,
        termsFor,
        validate,
        saveDraft,
        saveAndIssue,
        previewInvoice,
    };
}

export type InvoiceDraft = ReturnType<typeof useInvoiceDraft>;
