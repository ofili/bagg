'use client';

import { Plus, Trash2 } from 'lucide-react';
import { MoneyInput } from '@/components/mobile/MoneyInput';
import { Money } from '@/components/money/Money';
import { Button, Card, Field, Input } from '@/components/ui';
import { cleanAmount, toMinor } from '@/lib/amount';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  /** Typed text in major units (for example "250.50"). Converted to minor units with toMinor. */
  unit_price: string;
}

export const newLineItem = (): LineItem => ({
  id: crypto.randomUUID(),
  description: '',
  quantity: 1,
  unit_price: '',
});

export const lineTotalMinor = (item: LineItem) => (item.quantity || 1) * toMinor(item.unit_price);

interface LineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  currency: string;
}

/** One card per line item, so it works on a phone. Shared by the invoice and quote builders. */
export function LineItemsEditor({ items, onChange, currency }: LineItemsEditorProps) {
  const update = (id: string, patch: Partial<LineItem>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  return (
    <section aria-labelledby="items-heading" className="space-y-3">
      <h2 id="items-heading" className="text-title">
        line items
      </h2>

      <ul className="space-y-3">
        {items.map((it, index) => (
          <li key={it.id}>
            <Card zone="calm" className="space-y-4 p-4">
              <Field label="Description">
                {(a) => (
                  <Input
                    type="text"
                    placeholder="e.g. Logo design"
                    value={it.description}
                    onChange={(e) => update(it.id, { description: e.target.value })}
                    {...a}
                  />
                )}
              </Field>

              <div className="grid grid-cols-[6rem_1fr] gap-3">
                <Field label="Qty">
                  {(a) => (
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => update(it.id, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      {...a}
                    />
                  )}
                </Field>
                <MoneyInput
                  label="Unit price"
                  currency={currency}
                  value={it.unit_price}
                  onChange={(v) => update(it.id, { unit_price: cleanAmount(v, it.unit_price) })}
                />
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-line-subtle pt-3">
                <div>
                  <p className="text-caption text-text-muted">Line total</p>
                  <Money amountMinor={lineTotalMinor(it)} currency={currency} className="text-amount-s" hideCurrencyCode />
                </div>
                {items.length > 1 && (
                  <Button
                    variant="link"
                    onClick={() => onChange(items.filter((x) => x.id !== it.id))}
                    aria-label={`Remove item ${index + 1}`}
                  >
                    <Trash2 aria-hidden className="h-4 w-4" /> Remove
                  </Button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Button variant="outline" zone="calm" onClick={() => onChange([...items, newLineItem()])}>
        <Plus aria-hidden className="h-4 w-4" /> Add item
      </Button>
    </section>
  );
}
