'use client';

import { useState } from 'react';
import { Building2, UserRound } from 'lucide-react';
import { BaggSelect, Button, Dialog, Field, Input } from '@/components/ui';
import { cn } from '@/lib/cn';

const API_BASE = '/api';

export interface InlineCreatedClient {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  preferred_currency: string;
  default_payment_terms_days: number;
}

interface InlineClientModalProps {
  open: boolean;
  onClose: () => void;
  onClientCreated: (client: InlineCreatedClient) => void;
  defaultCurrency?: string;
}

const CURRENCIES = [
  { code: 'NGN', label: 'NGN – Nigerian naira' },
  { code: 'USD', label: 'USD – US dollar' },
  { code: 'GBP', label: 'GBP – British pound' },
  { code: 'EUR', label: 'EUR – Euro' },
  { code: 'GHS', label: 'GHS – Ghanaian cedi' },
  { code: 'KES', label: 'KES – Kenyan shilling' },
  { code: 'ZAR', label: 'ZAR – South African rand' },
];

export function InlineClientModal({
  open,
  onClose,
  onClientCreated,
  defaultCurrency = 'NGN',
}: InlineClientModalProps) {
  const [clientType, setClientType] = useState<'PERSON' | 'BUSINESS'>('PERSON');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName('');
    setEmail('');
    setPhone('');
    setCurrency(defaultCurrency);
    setClientType('PERSON');
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Client name is required.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      client_type: clientType,
      email: email.trim() || null,
      phone: phone.trim() || null,
      preferred_currency: currency,
      default_payment_terms_days: 14,
    };

    try {
      const res = await fetch(`${API_BASE}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        let msg = 'Failed to create client.';
        if (typeof body.detail === 'string') msg = body.detail;
        else if (Array.isArray(body.detail) && body.detail[0]?.msg) msg = body.detail[0].msg;
        throw new Error(msg);
      }

      const data = await res.json();
      const created: InlineCreatedClient = {
        default_payment_terms_days: 14,
        ...data,
      };
      onClientCreated(created);
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create client.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Add new client"
      className="max-h-[90dvh] max-w-md overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        {/* Person / Business Toggle */}
        <div>
          <label className="block text-caption font-bold text-ink mb-1">Client type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setClientType('PERSON')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-btn border p-2.5 text-body font-bold transition-colors',
                clientType === 'PERSON'
                  ? 'border-brut-thin border-ink bg-sun text-ink shadow-brut-sm'
                  : 'border-line bg-surface text-text-soft hover:bg-surface-tint',
              )}
            >
              <UserRound className="h-4 w-4" /> Individual
            </button>
            <button
              type="button"
              onClick={() => setClientType('BUSINESS')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-btn border p-2.5 text-body font-bold transition-colors',
                clientType === 'BUSINESS'
                  ? 'border-brut-thin border-ink bg-sun text-ink shadow-brut-sm'
                  : 'border-line bg-surface text-text-soft hover:bg-surface-tint',
              )}
            >
              <Building2 className="h-4 w-4" /> Business
            </button>
          </div>
        </div>

        {/* Client Name */}
        <Field label={clientType === 'BUSINESS' ? 'Company name' : 'Full name'}>
          {({ id, ...a11y }) => (
            <Input
              id={id}
              {...a11y}
              type="text"
              required
              autoFocus
              placeholder={clientType === 'BUSINESS' ? 'e.g. Acme Corp' : 'e.g. Jane Doe'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Field>

        {/* Email */}
        <Field label="Email address" hint="Where invoices and quotes will be sent">
          {({ id, ...a11y }) => (
            <Input
              id={id}
              {...a11y}
              type="email"
              placeholder="billing@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>

        {/* Phone */}
        <Field label="Phone number" hint="For WhatsApp notifications and payment reminders">
          {({ id, ...a11y }) => (
            <Input
              id={id}
              {...a11y}
              type="tel"
              placeholder="+234 801 234 5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          )}
        </Field>

        {/* Currency */}
        <BaggSelect
          label="Preferred currency"
          value={currency}
          onChange={setCurrency}
          options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
        />

        {error && (
          <div role="alert" className="rounded-card bg-[#FFB3B3]/30 border border-danger p-3 text-caption font-bold text-danger">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-line">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="accent"
            loading={saving}
          >
            Add client
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
