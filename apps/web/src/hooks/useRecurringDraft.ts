'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  lineTotalMinor,
  newLineItem,
  type LineItem,
} from '@/components/invoice';
import { toMinor } from '@/lib/amount';

const API_BASE = '/api';

export interface RecurringClient {
  id: string;
  name: string;
  email?: string | null;
  preferred_currency: string;
}

export const SUPPORTED_CURRENCIES = [
  { code: 'NGN', label: 'NGN – Nigerian naira' },
  { code: 'USD', label: 'USD – US dollar' },
  { code: 'GBP', label: 'GBP – British pound' },
  { code: 'EUR', label: 'EUR – Euro' },
  { code: 'GHS', label: 'GHS – Ghanaian cedi' },
  { code: 'KES', label: 'KES – Kenyan shilling' },
  { code: 'ZAR', label: 'ZAR – South African rand' },
] as const;

export const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'daily', label: 'Daily' },
] as const;

export const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export type RecurringDraft = ReturnType<typeof useRecurringDraft>;

export function useRecurringDraft() {
  const searchParams = useSearchParams();
  const initialClientId = searchParams?.get('client_id') || '';

  const today = toIsoDate(new Date());

  const [clients, setClients] = useState<RecurringClient[]>([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(initialClientId);

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [interval, setIntervalVal] = useState(1);
  const [startDate, setStartDate] = useState(today);

  const [endRule, setEndRule] = useState<'never' | 'after_count' | 'on_date'>('never');
  const [endAfterCount, setEndAfterCount] = useState<number>(12);
  const [endDate, setEndDate] = useState<string>('');

  const [issueMode, setIssueMode] = useState<'draft' | 'auto_issue'>('draft');
  const [draftLeadDays, setDraftLeadDays] = useState(3);
  const [dueDateOffsetDays, setDueDateOffsetDays] = useState(14);
  const [directCheckout, setDirectCheckout] = useState(true);
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<LineItem[]>([
    {
      id: crypto.randomUUID(),
      description: 'Retainer Services',
      quantity: 1,
      unit_price: '50000',
    },
  ]);

  const [taxText, setTaxText] = useState('0');
  const [whtText, setWhtText] = useState('0');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load clients
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/clients`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((raw) => {
        if (cancelled) return;
        const list: RecurringClient[] = Array.isArray(raw) ? raw : raw.items || [];
        setClients(list);
        setClientsLoaded(true);
        if (!selectedClientId && list.length > 0) {
          const matched = initialClientId ? list.find((c) => c.id === initialClientId) : null;
          if (matched) {
            setSelectedClientId(matched.id);
            setCurrency(matched.preferred_currency || 'NGN');
          } else if (list.length === 1) {
            setSelectedClientId(list[0].id);
            setCurrency(list[0].preferred_currency || 'NGN');
          }
        }
      })
      .catch(() => {
        if (!cancelled) setClientsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [initialClientId, selectedClientId]);

    const addClient = (newClient: RecurringClient) => {
    setClients((prev) => [newClient, ...prev.filter((c) => c.id !== newClient.id)]);
    setSelectedClientId(newClient.id);
    if (newClient.preferred_currency) setCurrency(newClient.preferred_currency);
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client?.preferred_currency) {
      setCurrency(client.preferred_currency);
    }
  };

  // Math totals
  const subtotalMinor = useMemo(
    () => items.reduce((sum, item) => sum + lineTotalMinor(item), 0),
    [items],
  );

  const taxRate = parseFloat(taxText) || 0;
  const whtRate = parseFloat(whtText) || 0;

  const taxMinor = Math.round(subtotalMinor * (taxRate / 100));
  const whtMinor = Math.round(subtotalMinor * (whtRate / 100));
  const totalMinor = Math.max(0, subtotalMinor + taxMinor - whtMinor);

  function validate(): string | null {
    if (!selectedClientId) return 'Please pick a client for this recurring schedule.';
    if (!name.trim()) return 'Please give this recurring schedule a name.';
    if (items.length === 0) return 'Add at least one line item to the schedule.';
    for (const item of items) {
      if (!item.description.trim()) return 'All line items must have a description.';
      if (toMinor(item.unit_price) <= 0) return 'Line item prices must be greater than zero.';
    }
    if (endRule === 'after_count' && (!endAfterCount || endAfterCount < 1)) {
      return 'Please specify the number of occurrences.';
    }
    if (endRule === 'on_date' && !endDate) {
      return 'Please pick an end date for the schedule.';
    }
    return null;
  }

  async function saveSchedule(): Promise<{ id: string } | null> {
    const error = validate();
    if (error) {
      setErrorMsg(error);
      return null;
    }

    setSaving(true);
    setErrorMsg(null);

    const payload: Record<string, any> = {
      client_id: selectedClientId,
      name: name.trim(),
      currency,
      frequency,
      interval: Number(interval) || 1,
      start_date: startDate,
      end_rule: endRule,
      issue_mode: issueMode,
      draft_lead_days: Number(draftLeadDays) || 0,
      due_date_offset_days: Number(dueDateOffsetDays) || 14,
      direct_checkout_enabled: directCheckout,
      tax_rate_percent: taxRate,
      wht_rate_percent: whtRate,
      notes: notes.trim() || null,
      items: items.map((it) => ({
        description: it.description.trim(),
        quantity: it.quantity || 1,
        unit_price_minor: toMinor(it.unit_price),
      })),
    };

    if (endRule === 'after_count') {
      payload.end_after_count = Number(endAfterCount) || 1;
    } else if (endRule === 'on_date') {
      payload.end_date = endDate;
    }

    try {
      const res = await fetch(`${API_BASE}/recurring-invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to create recurring invoice schedule.');
      }

      const created = await res.json();
      return { id: created.id };
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred.');
      return null;
    } finally {
      setSaving(false);
    }
  }

  return {
    clients,
    clientsLoaded,
    selectedClientId,
    setSelectedClientId,
    handleClientChange,
    addClient,
    name,
    setName,
    currency,
    setCurrency,
    frequency,
    setFrequency,
    interval,
    setIntervalVal,
    startDate,
    setStartDate,
    endRule,
    setEndRule,
    endAfterCount,
    setEndAfterCount,
    endDate,
    setEndDate,
    issueMode,
    setIssueMode,
    draftLeadDays,
    setDraftLeadDays,
    dueDateOffsetDays,
    setDueDateOffsetDays,
    directCheckout,
    setDirectCheckout,
    notes,
    setNotes,
    items,
    setItems,
    taxText,
    setTaxText,
    whtText,
    setWhtText,
    taxRate,
    whtRate,
    subtotalMinor,
    taxMinor,
    whtMinor,
    totalMinor,
    saving,
    errorMsg,
    setErrorMsg,
    validate,
    saveSchedule,
  };
}
