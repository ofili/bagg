
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  status: 'loading' | 'ready' | 'error';
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

  const [profileValidation, setProfileValidation] =
    useState<ValidationState>({
      has_profile: false,
      message: 'Checking payment instructions…',
      status: 'loading',
    });

  const validationRequestId = useRef(0);

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
      .then((res) => {
        if (!res.ok) throw new Error('Could not load clients');
        return res.json();
      })
      .then((data: Client[]) => {
        setClients(data);

        if (data.length > 0) {
          setSelectedClientId(data[0].id);
          setCurrency(data[0].preferred_currency || 'NGN');
          setDueDate(
            addDays(today, data[0].default_payment_terms_days || 14),
          );
        }
      })
      .catch(() => {
        setClients([]);
      })
      .finally(() => setClientsLoaded(true));

    // Initial client loading is intentionally performed only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Server-authoritative validation of the default payment profile for the
   * currently selected invoice currency.
   *
   * A network/API failure is an unknown state, not a successful validation.
   */
  const refreshProfileValidation = useCallback(async () => {
    if (!currency) return;

    const requestId = ++validationRequestId.current;

    setProfileValidation({
      has_profile: false,
      message: 'Checking payment instructions…',
      status: 'loading',
    });

    try {
      const response = await fetch(
        `${API_BASE}/payments/profiles/validate/${encodeURIComponent(currency)}`,
        {
          credentials: 'include',
          cache: 'no-store',
        },
      );

      if (!response.ok) {
        throw new Error(
          await detailOf(
            response,
            `Could not check ${currency} payment instructions.`,
          ),
        );
      }

      const data = await response.json();

      if (requestId !== validationRequestId.current) return;

      setProfileValidation({
        has_profile: Boolean(data.has_profile),
        message:
          data.message ||
          (data.has_profile
            ? `${currency} payment instructions are ready.`
            : `No usable default payment profile is configured for ${currency}.`),
        status: 'ready',
      });
    } catch (err) {
      if (requestId !== validationRequestId.current) return;

      setProfileValidation({
        has_profile: false,
        message:
          err instanceof Error
            ? err.message
            : `Could not check ${currency} payment instructions.`,
        status: 'error',
      });
    }
  }, [currency]);

  // Validate whenever the selected currency changes.
  useEffect(() => {
    void refreshProfileValidation();
  }, [refreshProfileValidation]);

  // Get Paid opens in a separate tab. When the user returns to this invoice
  // tab, re-check the server so the prompt reflects the newly saved profile.
  useEffect(() => {
    const handleFocus = () => {
      void refreshProfileValidation();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshProfileValidation();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshProfileValidation]);

  const termsFor = (clientId: string) =>
    clients.find((c) => c.id === clientId)?.default_payment_terms_days || 14;

  const addClient = (newClient: Client) => {
    setClients((prev) => [
      newClient,
      ...prev.filter((c) => c.id !== newClient.id),
    ]);
    setSelectedClientId(newClient.id);

    if (newClient.preferred_currency) {
      setCurrency(newClient.preferred_currency);
    }

    setDueDate(
      addDays(issueDate, newClient.default_payment_terms_days || 14),
    );
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);

    const client = clients.find((c) => c.id === clientId);

    if (client) {
      if (client.preferred_currency) {
        setCurrency(client.preferred_currency);
      }

      setDueDate(addDays(issueDate, termsFor(clientId)));
    }
  };

  const handleIssueDateChange = (value: string) => {
    setIssueDate(value);

    if (value) {
      setDueDate(addDays(value, termsFor(selectedClientId)));
    }
  };

  // All calculations are performed in minor currency units.
  const subtotalMinor = items.reduce(
    (acc, item) => acc + lineTotalMinor(item),
    0,
  );

  const discountMinor = toMinor(discountText);
  const discountedSubtotalMinor = Math.max(0, subtotalMinor - discountMinor);
  const taxPercent = parseFloat(taxText) || 0;
  const taxMinor = Math.round(discountedSubtotalMinor * (taxPercent / 100));
  const totalMinor = discountedSubtotalMinor + taxMinor;

  /** Returns a validation message, or null when the draft is valid. */
  const validate = (): string | null => {
    if (!selectedClientId) {
      return 'Pick a client first, or add one under Clients.';
    }

    if (items.some((item) => !item.description.trim())) {
      return 'Give every line item a description.';
    }

    if (totalMinor <= 0) {
      return 'The total is zero. Add a price to at least one line item.';
    }

    return null;
  };

  /** Creates the draft. Returns its ID, or null if creation failed. */
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
      items: items.map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity) || 1,
        unit_price_minor: toMinor(item.unit_price),
      })),
      discount_minor: discountMinor,
      tax_rate_percent: taxPercent,
      notes,
    };

    try {
      const response = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          await detailOf(response, 'Failed to save draft invoice.'),
        );
      }

      const created = await response.json().catch(() => ({}));
      return (created?.id as string) ?? '';
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error saving invoice.',
      );
      return null;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Saves the draft, then approves and issues it.
   * It does NOT send it: sending remains a separate explicit action.
   *
   * Payment-profile setup is deliberately not a prerequisite for issuing.
   */
  const saveAndIssue = async (): Promise<{
    id: string;
    issued: boolean;
  } | null> => {
    const id = await saveDraft();

    if (id === null) return null;
    if (!id) return { id: '', issued: false };

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE}/invoices/${id}/finalize`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(
          await detailOf(
            response,
            'Could not approve and issue this invoice.',
          ),
        );
      }

      return { id, issued: true };
    } catch (err: unknown) {
      setErrorMsg(
        `Saved as a draft, but it could not be issued. ${
          err instanceof Error ? err.message : ''
        }`.trim(),
      );

      return { id, issued: false };
    } finally {
      setSaving(false);
    }
  };

  const previewInvoice = {
    id: 'preview',
    invoice_number: 'to be assigned',
    client_name:
      clients.find((client) => client.id === selectedClientId)?.name ?? null,
    currency,
    status: 'draft',
    issue_date: issueDate,
    due_date: dueDate || null,
    items: items.map((item) => ({
      id: item.id,
      description: item.description || 'Line item',
      quantity: item.quantity || 1,
      unit_price_minor: toMinor(item.unit_price),
      total_minor: lineTotalMinor(item),
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
    refreshProfileValidation,
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
    addClient,
    handleIssueDateChange,
    termsFor,
    validate,
    saveDraft,
    saveAndIssue,
    previewInvoice,
  };
}

export type InvoiceDraft = ReturnType<typeof useInvoiceDraft>;
