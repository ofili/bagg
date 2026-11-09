'use client';

/*
* State and API logic for creating a quote on phones. The maths, validation
* messages and POST body match quotes/new/page.tsx. It also adds
* saveAndIssue: create the draft, then approve and issue it (not send it).
*
* Assumption to check: POST /quotes returns the created quote with an `id`.
*/

import { useEffect, useMemo, useState } from 'react';
import {
    lineTotalMinor,
    newLineItem,
    type LineItem,
} from '@/components/invoice';
import { toMinor } from '@/lib/amount';

const API_BASE = '/api';

export interface QuoteClient {
    id: string;
    name: string;
    email?: string | null;
    preferred_currency: string;
}

export const SUPPORTED_CURRENCIES = [
    { code: 'NGN', label: 'NGN · Nigerian naira' },
    { code: 'USD', label: 'USD · US dollar' },
    { code: 'GBP', label: 'GBP · British pound' },
    { code: 'EUR', label: 'EUR · Euro' },
    { code: 'GHS', label: 'GHS · Ghanaian cedi' },
    { code: 'KES', label: 'KES · Kenyan shilling' },
    { code: 'ZAR', label: 'ZAR · South African rand' },
] as const;

/**
 * These are the available quote validity periods.
 * The selected value is sent to the API as validity_days.
 */
export const VALIDITY_OPTIONS = [
    { value: 7, label: '7 days' },
    { value: 14, label: '14 days' },
    { value: 30, label: '30 days' },
    { value: 60, label: '60 days' },
    { value: 90, label: '90 days' },
] as const;

async function detailOf(
    response: Response,
    fallback: string,
): Promise<string> {
    const body = await response.json().catch(() => ({}));

    return (
        (body.detail as string | undefined) ||
        (body.message as string | undefined) ||
        fallback
    );
}

function percentageOf(value: string): number {
    const parsed = Number.parseFloat(value);

    if (!Number.isFinite(parsed)) return 0;

    return Math.min(100, Math.max(0, parsed));
}

export function useQuoteDraft() {
    const [clients, setClients] = useState<QuoteClient[]>([]);
    const [clientsLoaded, setClientsLoaded] = useState(false);

    const [selectedClientId, setSelectedClientId] = useState('');
    const [currency, setCurrency] = useState('NGN');

    const [items, setItems] = useState<LineItem[]>(() => [
        newLineItem(),
    ]);

    const [discountText, setDiscountText] = useState('');
    const [taxText, setTaxText] = useState('');
    const [whtText, setWhtText] = useState('');

    const [validityDays, setValidityDays] = useState(14);
    const [depositText, setDepositText] = useState('');

    const [notes, setNotes] = useState('');

    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    /*
     * Load the workspace's clients.
     */
    useEffect(() => {
        let active = true;

        async function loadClients() {
            try {
                const response = await fetch(`${API_BASE}/clients`, {
                    credentials: 'include',
                });

                if (!response.ok) {
                    throw new Error(
                        await detailOf(response, 'Could not load clients.'),
                    );
                }

                const data = (await response.json()) as QuoteClient[];

                if (!active) return;

                const availableClients = Array.isArray(data) ? data : [];

                setClients(availableClients);

                if (availableClients.length > 0) {
                    const firstClient = availableClients[0];

                    setSelectedClientId(firstClient.id);
                    setCurrency(
                        firstClient.preferred_currency || 'NGN',
                    );
                }
            } catch (error: unknown) {
                if (!active) return;

                setErrorMsg(
                    error instanceof Error
                        ? error.message
                        : 'Could not load clients.',
                );
            } finally {
                if (active) setClientsLoaded(true);
            }
        }

        void loadClients();

        return () => {
            active = false;
        };
    }, []);

    /*
     * Select a client and adopt their preferred currency.
     */
        const addClient = (newClient: QuoteClient) => {
        setClients((prev) => [newClient, ...prev.filter((c) => c.id !== newClient.id)]);
        setSelectedClientId(newClient.id);
        if (newClient.preferred_currency) setCurrency(newClient.preferred_currency);
    };

    const handleClientChange = (clientId: string) => {
        setSelectedClientId(clientId);

        const client = clients.find(
            (candidate) => candidate.id === clientId,
        );

        if (client?.preferred_currency) {
            setCurrency(client.preferred_currency);
        }
    };

    /*
     * All monetary calculations use minor units.
     */
    const subtotalMinor = useMemo(
        () =>
            items.reduce(
                (total, item) => total + lineTotalMinor(item),
                0,
            ),
        [items],
    );

    const discountMinor = useMemo(
        () => Math.min(subtotalMinor, Math.max(0, toMinor(discountText))),
        [discountText, subtotalMinor],
    );

    const discountedSubtotalMinor = Math.max(
        0,
        subtotalMinor - discountMinor,
    );

    const taxPercent = percentageOf(taxText);
    const whtPercent = percentageOf(whtText);
    const depositPercent = percentageOf(depositText);

    const taxMinor = Math.round(
        discountedSubtotalMinor * (taxPercent / 100),
    );

    const whtMinor = Math.round(
        discountedSubtotalMinor * (whtPercent / 100),
    );

    /*
     * WHT is treated as a deduction from the amount payable.
     * The deposit is calculated against the resulting net amount.
     */
    const grossMinor = discountedSubtotalMinor + taxMinor;

    const netMinor = Math.max(
        0,
        grossMinor - whtMinor,
    );

    const depositMinor = Math.round(
        netMinor * (depositPercent / 100),
    );

    /*
     * Validate individual line items.
     */
    const validateItems = (): string | null => {
        if (items.length === 0) {
            return 'Add at least one line item.';
        }

        if (items.some((item) => !item.description.trim())) {
            return 'Give every line item a description.';
        }

        if (
            items.some(
                (item) =>
                    !Number.isFinite(Number(item.quantity)) ||
                    Number(item.quantity) <= 0,
            )
        ) {
            return 'Every line item must have a valid quantity.';
        }

        if (
            items.some(
                (item) =>
                    !Number.isFinite(toMinor(item.unit_price)) ||
                    toMinor(item.unit_price) < 0,
            )
        ) {
            return 'Every line item must have a valid unit price.';
        }

        return null;
    };

    /*
     * Validate the complete quote before saving.
     */
    const validate = (): string | null => {
        if (!selectedClientId) {
            return 'Pick a client first, or add one under Clients.';
        }

        if (!currency) {
            return 'Select a currency for this quote.';
        }

        const itemProblem = validateItems();

        if (itemProblem) return itemProblem;

        if (subtotalMinor <= 0) {
            return 'The quote total is zero. Add a price to at least one line item.';
        }

        if (discountMinor > subtotalMinor) {
            return 'The discount cannot exceed the subtotal.';
        }

        if (taxPercent < 0 || taxPercent > 100) {
            return 'Enter a valid tax percentage.';
        }

        if (whtPercent < 0 || whtPercent > 100) {
            return 'Enter a valid withholding tax percentage.';
        }

        if (depositPercent < 0 || depositPercent > 100) {
            return 'Enter a valid deposit percentage.';
        }

        if (!Number.isInteger(validityDays) || validityDays <= 0) {
            return 'Select a valid quote validity period.';
        }

        if (netMinor <= 0) {
            return 'The net payable amount must be greater than zero.';
        }

        return null;
    };

    /*
     * Build the API payload in one place so draft saving and
     * quote issuance always use identical financial data.
     */
    const buildPayload = () => ({
        client_id: selectedClientId,
        currency,
        validity_days: validityDays,

        items: items.map((item) => ({
            description: item.description.trim(),
            quantity: Number(item.quantity) || 1,
            unit_price_minor: toMinor(item.unit_price),
        })),

        discount_minor: discountMinor,
        tax_rate_percent: taxPercent,
        withholding_tax_rate_percent: whtPercent,
        deposit_percent: depositPercent,

        notes: notes.trim() || null,
    });

    /*
     * Save the quote as a draft.
     * Returns the new quote ID, or null if saving failed.
     */
    const saveDraft = async (): Promise<string | null> => {
        const problem = validate();

        if (problem) {
            setErrorMsg(problem);
            return null;
        }

        setSaving(true);
        setErrorMsg(null);

        try {
            const response = await fetch(`${API_BASE}/quotes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(buildPayload()),
            });

            if (!response.ok) {
                throw new Error(
                    await detailOf(
                        response,
                        'Failed to save draft quote.',
                    ),
                );
            }

            const created = await response.json().catch(() => null);

            if (!created || typeof created.id !== 'string' || !created.id) {
                throw new Error(
                    'The quote was submitted, but the server did not return a quote ID. Check your quotes before retrying.',
                );
            }

            return created.id;
        } catch (error: unknown) {
            setErrorMsg(
                error instanceof Error
                    ? error.message
                    : 'Error saving quote.',
            );

            return null;
        } finally {
            setSaving(false);
        }
    };

    /*
     * Save the quote, then issue/finalize it.
     *
     * This does not send the quote to the client.
     * Sending or sharing remains a separate action.
     *
     * If issuance fails, the saved draft remains available.
     */
    const saveAndIssue = async (): Promise<{
        id: string;
        issued: boolean;
    } | null> => {
        const id = await saveDraft();

        if (id === null) return null;

        setSaving(true);

        try {
            const response = await fetch(
                `${API_BASE}/quotes/${id}/finalize`,
                {
                    method: 'POST',
                    credentials: 'include',
                },
            );

            if (!response.ok) {
                throw new Error(
                    await detailOf(
                        response,
                        'The quote was saved but could not be issued.',
                    ),
                );
            }

            return {
                id,
                issued: true,
            };
        } catch (error: unknown) {
            setErrorMsg(
                `Quote saved as a draft, but it could not be issued. ${
                    error instanceof Error ? error.message : ''
                }`.trim(),
            );

            return {
                id,
                issued: false,
            };
        } finally {
            setSaving(false);
        }
    };

    return {
        clients,
        clientsLoaded,

        selectedClientId,
        setSelectedClientId,
        handleClientChange,
        addClient,

        currency,
        setCurrency,

        items,
        setItems,

        discountText,
        setDiscountText,

        taxText,
        setTaxText,

        whtText,
        setWhtText,

        validityDays,
        setValidityDays,

        depositText,
        setDepositText,

        notes,
        setNotes,

        saving,
        errorMsg,
        setErrorMsg,

        subtotalMinor,
        discountMinor,
        discountedSubtotalMinor,
        taxPercent,
        taxMinor,
        whtPercent,
        whtMinor,
        grossMinor,
        netMinor,
        depositPercent,
        depositMinor,

        validateItems,
        validate,

        saveDraft,
        saveAndIssue,

        buildPayload,
    };
}

export type QuoteDraft = ReturnType<typeof useQuoteDraft>;
