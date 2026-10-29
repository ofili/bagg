﻿﻿'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  Coins,
  CreditCard,
  Download,
  FileArchive,
  FileSpreadsheet,
  Globe,
  Landmark,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { BagCharacter } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { BaggSelect } from '@/components/ui';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';

const API_BASE = '/api';

interface PaymentProfile {
  id: string;
  workspace_id: string;
  currency: string;
  bank_name?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  routing_number?: string | null;
  payment_link?: string | null;
  mobile_money_number?: string | null;
  instructions?: string | null;
  is_default: boolean;
  created_at: string;
}

interface SubscriptionData {
  id?: string;
  workspace_id?: string;
  tier: string;
  status: string;
  paystack_subscription_code?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
  grace_period_until?: string | null;
  is_active: boolean;
  suppresses_watermark: boolean;
}

interface CreditsData {
  workspace_id: string;
  balance: number;
  free_sends_used_this_month: number;
  free_sends_limit: number;
  can_send_invoice: boolean;
}

type ChannelType = 'bank' | 'digital' | 'mobile_money';

const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'];
const CURRENCY_OPTIONS = [
  { value: 'NGN', label: 'NGN · Nigerian naira' },
  { value: 'USD', label: 'USD · US dollar' },
  { value: 'GBP', label: 'GBP · British pound' },
  { value: 'EUR', label: 'EUR · Euro' },
  { value: 'GHS', label: 'GHS · Ghanaian cedi' },
  { value: 'KES', label: 'KES · Kenyan shilling' },
  { value: 'ZAR', label: 'ZAR · South African rand' },
];

const inputClass =
  'min-h-11 w-full rounded-input border border-line bg-surface px-3 py-2 text-body text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-cocoa focus:ring-2 focus:ring-cocoa/20';

const labelClass = 'mb-1 block text-label font-bold text-ink-soft';

function errorText(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [brandColor, setBrandColor] = useState('#FF7A1A');
  const [defaultCurrency, setDefaultCurrency] = useState('NGN');
  const [country, setCountry] = useState('NG');
  const [address, setAddress] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<PaymentProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [addingProfile, setAddingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [channelType, setChannelType] = useState<ChannelType>('bank');
  const [newCurrency, setNewCurrency] = useState('NGN');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isDefault, setIsDefault] = useState(true);

  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);
  const [loadingBilling, setLoadingBilling] = useState(true);
  const [billingActionLoading, setBillingActionLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 4000);
  };

  const fetchBilling = async () => {
    try {
      setLoadingBilling(true);
      const [subRes, credRes] = await Promise.all([
        fetch(`${API_BASE}/billing/subscription`, { credentials: 'include' }),
        fetch(`${API_BASE}/billing/credits`, { credentials: 'include' }),
      ]);
      if (subRes.ok) setSubData(await subRes.json());
      if (credRes.ok) setCreditsData(await credRes.json());
    } catch {
      setError('we could not load your billing details. Try again.');
    } finally {
      setLoadingBilling(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      setLoadingProfiles(true);
      const res = await fetch(`${API_BASE}/payments/profiles`, { credentials: 'include' });
      if (res.ok) setProfiles(await res.json());
    } catch {
      setError('we could not load your payment details. Try again.');
    } finally {
      setLoadingProfiles(false);
    }
  };

  useEffect(() => {
    fetch(`${API_BASE}/workspaces/current`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('workspace'))))
      .then((data) => {
        setBusinessName(data.business_name || '');
        setTaxId(data.tax_id || '');
        setBrandColor(data.brand_color || '#FF7A1A');
        setDefaultCurrency(data.default_currency || 'NGN');
        setCountry(data.country || 'NG');
        setAddress(data.address || '');
      })
      .catch(() => setError('we could not load your workspace. Refresh and try again.'));

    fetchProfiles();
    fetchBilling();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/workspaces/current`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          business_name: businessName,
          tax_id: taxId,
          brand_color: brandColor,
          default_currency: defaultCurrency,
          country,
          address,
        }),
      });

      if (!res.ok) throw new Error('we could not save your profile. Check the details and try again.');
      showNotice('Workspace profile saved. Drafts will use your updated details.');
    } catch (err) {
      setError(errorText(err, 'we could not save your profile. Check the details and try again.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      setBillingActionLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          plan_code: 'creator_pro_monthly',
          callback_url: window.location.href,
        }),
      });
      if (!res.ok) throw new Error('we could not start checkout. Try again.');
      const data = await res.json();
      if (data.authorization_url) window.location.href = data.authorization_url;
    } catch (err) {
      setError(errorText(err, 'we could not start checkout. Try again.'));
    } finally {
      setBillingActionLoading(false);
    }
  };

  const handleBuyCredits = async () => {
    try {
      setBillingActionLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/billing/credits/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pack_size: 200 }),
      });
      if (!res.ok) throw new Error('we could not buy credits. Try again.');
      setCreditsData(await res.json());
      showNotice('200 credits added to your workspace.');
    } catch (err) {
      setError(errorText(err, 'we could not buy credits. Try again.'));
    } finally {
      setBillingActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      'stop auto-renewal? You keep Creator Pro until the current period ends.',
    );
    if (!confirmed) return;

    try {
      setBillingActionLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/billing/subscription/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('we could not cancel auto-renewal. Try again.');
      const data = await res.json();
      showNotice(data.message || 'Auto-renewal stopped.');
      await fetchBilling();
    } catch (err) {
      setError(errorText(err, 'we could not cancel auto-renewal. Try again.'));
    } finally {
      setBillingActionLoading(false);
    }
  };

  const handleCreatePaymentProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingProfile(true);
    setProfileError(null);

    const payload: Record<string, unknown> = {
      currency: newCurrency,
      is_default: isDefault,
      instructions: instructions || null,
    };

    if (channelType === 'bank') {
      payload.bank_name = bankName;
      payload.account_name = accountName;
      payload.account_number = accountNumber;
      if (routingNumber) payload.routing_number = routingNumber;
    } else if (channelType === 'digital') {
      payload.payment_link = paymentLink;
    } else {
      payload.mobile_money_number = mobileMoneyNumber;
      if (accountName) payload.account_name = accountName;
    }

    try {
      const res = await fetch(`${API_BASE}/payments/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'we could not save that payment detail. Check it and try again.');
      }

      setShowAddProfileModal(false);
      setBankName('');
      setAccountName('');
      setAccountNumber('');
      setRoutingNumber('');
      setPaymentLink('');
      setMobileMoneyNumber('');
      setInstructions('');
      showNotice(`${newCurrency} payment details saved.`);
      await fetchProfiles();
    } catch (err) {
      setProfileError(errorText(err, 'we could not save that payment detail. Check it and try again.'));
    } finally {
      setAddingProfile(false);
    }
  };

  const handleDeleteProfile = async (profile: PaymentProfile) => {
    const label = profile.bank_name || profile.payment_link || profile.mobile_money_number || profile.currency;
    const confirmed = window.confirm(`delete the ${profile.currency} payment detail for ${label}?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/payments/profiles/${profile.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('we could not delete that payment detail. Try again.');
      showNotice('Payment detail deleted.');
      await fetchProfiles();
    } catch (err) {
      setError(errorText(err, 'we could not delete that payment detail. Try again.'));
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deletePhrase !== 'DELETE MY ACCOUNT') {
      setDeleteError('Type DELETE MY ACCOUNT exactly to confirm.');
      return;
    }

    try {
      setDeletingAccount(true);
      setDeleteError(null);
      const res = await fetch(`${API_BASE}/compliance/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          confirmation_phrase: deletePhrase,
          reason: deleteReason || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'we could not delete your account. Try again.');
      }
      window.location.href = '/login';
    } catch (err) {
      setDeleteError(errorText(err, 'we could not delete your account. Try again.'));
    } finally {
      setDeletingAccount(false);
    }
  };

  const freeSendsPercent = creditsData
    ? Math.min(
        100,
        (creditsData.free_sends_used_this_month / Math.max(creditsData.free_sends_limit, 1)) * 100,
      )
    : 0;
  const isPro = Boolean(subData?.is_active && subData.tier !== 'free');
  const planName =
    subData?.tier === 'creator_pro'
      ? 'Creator Pro'
      : subData?.tier === 'professional'
        ? 'Professional'
        : 'Free';

  return (
    <div className="w-full max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-title-l text-ink">settings</h1>
        <p className="mt-1 text-body text-ink-soft">
          your business details, payment rails and account controls.
        </p>
      </div>

      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-input bg-pill-paid/20 px-3 py-2 text-body text-paid-text">
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          {notice}
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-input bg-pill-late/40 px-3 py-2 text-body text-late-text">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      <Section
        icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
        title="business profile"
        description="This is the name and address your clients see on invoices."
        action={
          <Button type="submit" form="business-profile-form" disabled={savingProfile}>
            {savingProfile ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            Save profile
          </Button>
        }
      >
        <form id="business-profile-form" onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="business-name" className={labelClass}>
                business name
              </label>
              <input
                id="business-name"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="business-tax" className={labelClass}>
                tax ID or TIN <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <input
                id="business-tax"
                type="text"
                placeholder="e.g. TIN-98765432-0001"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <BaggSelect
                label="default currency"
                className="w-full"
                value={defaultCurrency}
                onChange={setDefaultCurrency}
                options={CURRENCY_OPTIONS}
              />
            </div>
            <div>
              <label htmlFor="business-country" className={labelClass}>
                country
              </label>
              <input
                id="business-country"
                type="text"
                autoComplete="country"
                placeholder="e.g. NG"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="business-address" className={labelClass}>
                billing address
              </label>
              <input
                id="business-address"
                type="text"
                autoComplete="street-address"
                placeholder="Street, city, state"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="brand-color" className={labelClass}>
                document accent
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="brand-color"
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-input border border-line bg-surface p-1"
                />
                <input
                  type="text"
                  aria-label="Document accent hex value"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className={cn(inputClass, 'max-w-40 font-mono uppercase')}
                />
                <span className="text-caption text-ink-muted">used on public quote and receipt pages</span>
              </div>
            </div>
          </div>
          <p className="text-caption text-ink-muted">
            Changes apply to new and draft invoices. Invoices already sent keep their original
            snapshot.
          </p>
        </form>
      </Section>

      <Section
        icon={<Coins className="h-4 w-4" aria-hidden="true" />}
        title="plan and sends"
        description="Free sends reset each month. Credits never expire."
      >
        {loadingBilling ? (
          <div className="grid gap-3 sm:grid-cols-2" aria-label="Loading billing">
            <div className="h-40 animate-pulse rounded-row bg-tint" />
            <div className="h-40 animate-pulse rounded-row bg-tint" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col justify-between rounded-row bg-sunken p-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-caption font-extrabold text-ink-soft">current plan</p>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-caption font-extrabold text-ink-soft">
                    {planName}
                  </span>
                </div>
                <p className="mt-2 text-heading text-ink">
                  {isPro ? 'Creator Pro' : 'Free to start'}
                </p>
                <p className="mt-1 text-body text-ink-soft">
                  {isPro
                    ? 'Unlimited invoice sends and watermark-free PDFs.'
                    : '3 free invoice sends each month, then use credits.'}
                </p>

                {!isPro && creditsData && (
                  <div className="mt-3">
                    <div className="flex justify-between gap-3 text-caption">
                      <span className="text-ink-muted">free sends this month</span>
                      <span className="font-extrabold text-ink">
                        {creditsData.free_sends_used_this_month} / {creditsData.free_sends_limit}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
                      <div className="h-full rounded-full bg-mango" style={{ width: `${freeSendsPercent}%` }} />
                    </div>
                  </div>
                )}

                {isPro && subData?.current_period_end && (
                  <p className="mt-3 text-caption text-ink-muted">
                    {subData.cancel_at_period_end
                      ? `Access until ${formatDate(subData.current_period_end)}`
                      : `Renews ${formatDate(subData.current_period_end)}`}
                  </p>
                )}
              </div>

              <div className="mt-4 border-t border-line-subtle pt-3">
                {isPro ? (
                  !subData?.cancel_at_period_end && (
                    <Button
                      type="button"
                      variant="link"
                      disabled={billingActionLoading}
                      onClick={handleCancelSubscription}
                      className="min-h-9 px-0 text-late-text hover:no-underline"
                    >
                      {billingActionLoading ? 'Stopping…' : 'Stop auto-renewal'}
                    </Button>
                  )
                ) : (
                  <Button
                    type="button"
                    disabled={billingActionLoading}
                    onClick={handleUpgrade}
                    className="min-h-10 px-4 text-caption"
                  >
                    {billingActionLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Upgrade to Pro · {formatMoney(1200000, 'NGN', 'list')} / month
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-row border border-line-subtle bg-surface p-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-caption font-extrabold text-ink-soft">prepaid credits</p>
                  <Coins className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                </div>
                <p className="mt-2 text-amount-l text-ink">
                  {creditsData?.balance ?? 0}
                  <span className="ml-1.5 text-caption font-normal text-ink-muted">credits</span>
                </p>
                <p className="mt-1 text-body text-ink-soft">
                  One credit sends one invoice after your free monthly sends are used.
                </p>
              </div>
              <div className="mt-4 border-t border-line-subtle pt-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={billingActionLoading}
                  onClick={handleBuyCredits}
                  className="min-h-10 px-4 text-caption"
                >
                  {billingActionLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Coins className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Buy 200 credits · {formatMoney(200000, 'NGN', 'list')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Section>

      <Section
        icon={<CreditCard className="h-4 w-4" aria-hidden="true" />}
        title="payment details"
        description="Where clients send money, by currency. Add at least one before you send an invoice."
        action={
          <Button onClick={() => setShowAddProfileModal(true)} className="min-h-10 px-4 text-caption">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add details
          </Button>
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {CURRENCIES.map((code) => {
            const hasProfile = profiles.some((profile) => profile.currency === code);
            return (
              <span
                key={code}
                className={cn(
                  'rounded-full px-2.5 py-1 text-caption font-extrabold',
                  hasProfile
                    ? 'bg-pill-paid/20 text-paid-text'
                    : 'bg-tint text-ink-muted',
                )}
              >
                {code} {hasProfile ? 'ready' : 'not set'}
              </span>
            );
          })}
        </div>

        {loadingProfiles ? (
          <div className="space-y-2" aria-label="Loading payment details">
            {[0, 1].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-row bg-tint" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="rounded-row border border-dashed border-line p-6 text-center">
            <BagCharacter size={64} className="mx-auto" />
            <p className="mt-3 text-heading text-ink">no payment details yet</p>
            <p className="mx-auto mt-1 max-w-sm text-body text-ink-soft">
              Add a bank account, payment link or mobile money number so clients know where to send
              the money.
            </p>
            <Button onClick={() => setShowAddProfileModal(true)} className="mt-4">
              <Plus className="h-4 w-4" aria-hidden="true" /> Add your first detail
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {profiles.map((profile) => (
              <article
                key={profile.id}
                className="flex flex-col gap-3 rounded-row border border-line-subtle p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-label font-extrabold text-ink">{profile.currency}</span>
                    {profile.is_default && (
                      <span className="rounded-full bg-peach-chip px-2 py-0.5 text-caption font-extrabold text-ink-soft">
                        default
                      </span>
                    )}
                  </div>
                  <div className="mt-1 space-y-1 text-body text-ink-soft">
                    {profile.bank_name && (
                      <p className="flex items-center gap-1.5">
                        <Landmark className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                        {profile.bank_name} · {profile.account_number} · {profile.account_name}
                      </p>
                    )}
                    {profile.payment_link && (
                      <p className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                        <a
                          href={profile.payment_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-link hover:underline"
                        >
                          {profile.payment_link}
                        </a>
                      </p>
                    )}
                    {profile.mobile_money_number && (
                      <p className="flex items-center gap-1.5">
                        <Smartphone className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                        {profile.mobile_money_number} · {profile.account_name}
                      </p>
                    )}
                    {profile.instructions && (
                      <p className="text-caption text-ink-muted">{profile.instructions}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteProfile(profile)}
                  aria-label={`Delete ${profile.currency} payment detail`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-full text-ink-muted transition-colors hover:bg-pill-late/40 hover:text-late-text sm:self-center"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        )}
      </Section>

      <Section
        icon={<Bell className="h-4 w-4" aria-hidden="true" />}
        title="reminder schedule"
        description="Polite reminders go out automatically. You can still nudge from any invoice."
      >
        <div className="grid gap-2 sm:grid-cols-4">
          {['3 days before due', 'on the due date', '3 days after due', '7 days after due'].map(
            (label) => (
              <div key={label} className="rounded-row bg-sunken px-3 py-3 text-caption font-bold text-ink-soft">
                {label}
              </div>
            ),
          )}
        </div>
      </Section>

      <Section
        icon={<Download className="h-4 w-4" aria-hidden="true" />}
        title="your data"
        description="Take a copy whenever you need it. Exports download immediately."
      >
        <div className="flex flex-wrap gap-2">
          <a
            href={`${API_BASE}/compliance/export/csv`}
            download
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink px-4 text-body font-extrabold text-ink transition-colors hover:bg-tint"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Export CSV
          </a>
          <a
            href={`${API_BASE}/compliance/export/zip`}
            download
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink px-4 text-body font-extrabold text-ink transition-colors hover:bg-tint"
          >
            <FileArchive className="h-4 w-4" aria-hidden="true" /> Export archive
          </a>
        </div>
      </Section>

      <section className="rounded-card border border-line bg-surface p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pill-late/40 text-late-text">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-heading text-ink">delete your account</h2>
            <p className="mt-1 max-w-xl text-body text-ink-soft">
              This permanently removes your workspace, clients, invoices and public links. It cannot
              be undone.
            </p>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                setDeleteError(null);
                setShowDeleteModal(true);
              }}
              className="mt-4"
            >
              Delete account and data
            </Button>
          </div>
        </div>
      </section>

      <Sheet open={showAddProfileModal} onOpenChange={setShowAddProfileModal}>
        <SheetContent className="max-h-[92dvh] overflow-hidden rounded-t-sheet border border-line-subtle bg-surface p-0 sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[88dvh] sm:w-[440px] sm:max-w-[calc(100vw-2rem)] sm:rounded-sheet">
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line sm:hidden" aria-hidden="true" />
          <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-3 sm:pt-5">
            <div>
              <h2 className="text-title text-ink">new payment detail</h2>
              <p className="mt-1 text-body text-ink-soft">
                Tell clients exactly where to send this currency.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddProfileModal(false)}
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-tint hover:text-ink"
            >
              <span aria-hidden="true" className="text-title leading-none">
                ×
              </span>
            </button>
          </div>

          <form onSubmit={handleCreatePaymentProfile} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <BaggSelect
                    label="currency"
                    className="w-full"
                    value={newCurrency}
                    onChange={setNewCurrency}
                    options={CURRENCY_OPTIONS}
                  />
                </div>
                <div>
                  <span className={labelClass}>how clients pay</span>
                  <div className="flex gap-1 rounded-full bg-tint p-1">
                    {(
                      [
                        ['bank', 'Bank'],
                        ['digital', 'Link'],
                        ['mobile_money', 'Mobile'],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setChannelType(value)}
                        className={cn(
                          'min-h-9 flex-1 rounded-full px-2 text-caption font-extrabold transition-colors',
                          channelType === value ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {channelType === 'bank' && (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="profile-bank" className={labelClass}>
                      bank name
                    </label>
                    <input
                      id="profile-bank"
                      type="text"
                      required
                      placeholder="e.g. Guaranty Trust Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="profile-account-name" className={labelClass}>
                        account name
                      </label>
                      <input
                        id="profile-account-name"
                        type="text"
                        required
                        placeholder="e.g. Ada Okafor"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="profile-account-number" className={labelClass}>
                        account or IBAN
                      </label>
                      <input
                        id="profile-account-number"
                        type="text"
                        required
                        placeholder="e.g. 0123456789"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className={cn(inputClass, 'font-mono')}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="profile-routing" className={labelClass}>
                      routing, sort code or SWIFT <span className="font-normal text-ink-muted">(optional)</span>
                    </label>
                    <input
                      id="profile-routing"
                      type="text"
                      placeholder="e.g. GTBINGLA"
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      className={cn(inputClass, 'font-mono')}
                    />
                  </div>
                </div>
              )}

              {channelType === 'digital' && (
                <div>
                  <label htmlFor="profile-link" className={labelClass}>
                    payment link
                  </label>
                  <input
                    id="profile-link"
                    type="url"
                    required
                    placeholder="https://wise.com/pay/me/yourname"
                    value={paymentLink}
                    onChange={(e) => setPaymentLink(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

              {channelType === 'mobile_money' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="profile-mobile-name" className={labelClass}>
                      account name
                    </label>
                    <input
                      id="profile-mobile-name"
                      type="text"
                      required
                      placeholder="e.g. Kofi Mensah"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-mobile-number" className={labelClass}>
                      mobile money number
                    </label>
                    <input
                      id="profile-mobile-number"
                      type="tel"
                      required
                      placeholder="e.g. +233 24 123 4567"
                      value={mobileMoneyNumber}
                      onChange={(e) => setMobileMoneyNumber(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="profile-instructions" className={labelClass}>
                  instructions <span className="font-normal text-ink-muted">(optional)</span>
                </label>
                <textarea
                  id="profile-instructions"
                  rows={2}
                  placeholder="e.g. Include the invoice number in the transfer note."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className={cn(inputClass, 'min-h-20 resize-y')}
                />
              </div>

              <label className="flex min-h-11 items-center gap-2 text-body text-ink-soft">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 accent-cocoa"
                />
                Use these as the default {newCurrency} details
              </label>

              {profileError && (
                <div role="alert" className="rounded-input bg-pill-late/40 px-3 py-2 text-body text-late-text">
                  {profileError}
                </div>
              )}
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-line-subtle bg-surface px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddProfileModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addingProfile}>
                {addingProfile && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Save details
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <SheetContent className="max-h-[92dvh] overflow-y-auto rounded-t-sheet border border-line-subtle bg-surface p-5 pb-0 sm:inset-0 sm:m-auto sm:h-fit sm:w-[calc(100vw-2rem)] sm:max-w-md sm:rounded-sheet">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pill-late/40 text-late-text">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-title text-ink">delete everything?</h2>
              <p className="mt-1 text-body text-ink-soft">
                Your workspace, clients, invoices and public links will stop working immediately.
              </p>
            </div>
          </div>

          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div>
              <label htmlFor="delete-reason" className={labelClass}>
                reason <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <input
                id="delete-reason"
                type="text"
                placeholder="e.g. Switched platforms"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="delete-phrase" className={labelClass}>
                type <strong className="font-mono text-late-text">DELETE MY ACCOUNT</strong> to confirm
              </label>
              <input
                id="delete-phrase"
                type="text"
                required
                placeholder="DELETE MY ACCOUNT"
                value={deletePhrase}
                onChange={(e) => setDeletePhrase(e.target.value)}
                className={cn(inputClass, 'font-mono font-bold')}
              />
            </div>

            {deleteError && (
              <div role="alert" className="rounded-input bg-pill-late/40 px-3 py-2 text-body text-late-text">
                {deleteError}
              </div>
            )}

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setShowDeleteModal(false)}>
                Keep my account
              </Button>
              <Button
                type="submit"
                variant="danger"
                disabled={deletingAccount || deletePhrase !== 'DELETE MY ACCOUNT'}
              >
                {deletingAccount && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Delete everything
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Section({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-line-subtle bg-surface p-5">
      <div className="flex flex-col gap-3 border-b border-line-subtle pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-peach-chip text-ink">
            {icon}
          </span>
          <div>
            <h2 className="text-heading text-ink">{title}</h2>
            <p className="mt-0.5 text-caption text-ink-muted">{description}</p>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}
