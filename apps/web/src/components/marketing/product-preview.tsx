import { PaidStamp } from '@/components/brand';
import { Money } from '@/components/money/Money';
import { StatusPill } from '@/components/ui/status-pill';

export function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[30rem]">
      <div
        className="absolute -inset-3 -rotate-1 rounded-[24px] bg-peach-chip"
        aria-hidden="true"
      />
      <div className="relative rounded-card border border-line-subtle bg-surface p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-caption font-extrabold text-ink-muted">invoice 0041</p>
            <p className="mt-1 text-heading text-ink">Tolu Studio</p>
            <p className="text-caption text-ink-muted">due 4 Nov 2026</p>
          </div>
          <StatusPill status="paid" />
        </div>

        <div className="mt-5 rounded-row bg-sunken p-4">
          <p className="text-caption font-extrabold text-ink-soft">paid in full</p>
          <p className="mt-1 text-amount-l text-ink">
            <Money amountMinor={45000000} currency="NGN" hideCurrencyCode />
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <PaidStamp />
            <span className="text-caption text-ink-muted">receipt saved automatically</span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex justify-between gap-4 text-body">
            <span className="text-ink-muted">Brand identity</span>
            <Money amountMinor={35000000} currency="NGN" />
          </div>
          <div className="flex justify-between gap-4 text-body">
            <span className="text-ink-muted">Social templates</span>
            <Money amountMinor={10000000} currency="NGN" />
          </div>
          <div className="flex justify-between gap-4 border-t border-line-subtle pt-2 text-body font-extrabold">
            <span className="text-ink">total</span>
            <Money amountMinor={45000000} currency="NGN" />
          </div>
        </div>
      </div>

      <div className="relative -mt-2 ml-auto w-[88%] rounded-row border border-line bg-surface px-4 py-3 shadow-sheet">
        <p className="text-caption font-extrabold text-paid-text">payment received</p>
        <p className="mt-0.5 text-body text-ink-soft">
          Tolu paid ₦450,000. Receipt REC-0018 is ready to share.
        </p>
      </div>
    </div>
  );
}
