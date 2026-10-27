'use client';

import { Check, Copy } from 'lucide-react';
import { Button, Card, buttonStyles } from '@/components/ui';

export interface PaymentProfile {
  currency?: string;
  bank_name?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  routing_number?: string | null;
  payment_link?: string | null;
  mobile_money_number?: string | null;
  instructions?: string | null;
}

interface PaymentDetailsProps {
  profile?: PaymentProfile | null;
  currency: string;
  /** Called with the text to copy, a key for the "Copied" state and a label for announcements. */
  onCopy: (text: string, key: string, label: string) => void;
  copiedKey?: string | null;
}

/** Tells the client where to send the money. Calm zone: no shadows. */
export function PaymentDetails({ profile, currency, onCopy, copiedKey }: PaymentDetailsProps) {
  if (!profile) return null;

  const rows = [
    { key: 'bank_name', label: 'Bank', value: profile.bank_name, copy: false },
    { key: 'account_name', label: 'Account name', value: profile.account_name, copy: false },
    { key: 'account_number', label: 'Account number', value: profile.account_number, copy: true },
    { key: 'routing_number', label: 'Routing number', value: profile.routing_number, copy: true },
    { key: 'mobile_money_number', label: 'Mobile money number', value: profile.mobile_money_number, copy: true },
  ].filter((r) => r.value);

  if (rows.length === 0 && !profile.payment_link && !profile.instructions) return null;

  return (
    <Card zone="calm" className="space-y-4">
      <div>
        <h2 className="text-heading">how to pay</h2>
        <p className="text-body text-text-soft">Send {currency} by bank transfer using these details.</p>
      </div>

      {rows.length > 0 && (
        <dl className="space-y-3">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <dt className="text-caption text-text-muted">{r.label}</dt>
                <dd className={r.copy ? 'tabular text-amount-s' : 'text-body-l font-medium'}>{r.value}</dd>
              </div>
              {r.copy && (
                <Button
                  variant="link"
                  onClick={() => onCopy(r.value as string, r.key, r.label)}
                  aria-label={`Copy ${r.label.toLowerCase()}`}
                >
                  {copiedKey === r.key ? (
                    <Check aria-hidden className="h-4 w-4" />
                  ) : (
                    <Copy aria-hidden className="h-4 w-4" />
                  )}
                  {copiedKey === r.key ? 'Copied' : 'Copy'}
                </Button>
              )}
            </div>
          ))}
        </dl>
      )}

      {profile.payment_link && (
        <a
          href={profile.payment_link}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonStyles({ variant: 'outline', zone: 'calm', fullWidth: true })}
        >
          Pay online
        </a>
      )}

      {profile.instructions && (
        <p className="whitespace-pre-line border-t border-line-subtle pt-3 text-body text-text-soft">
          {profile.instructions}
        </p>
      )}
    </Card>
  );
}
