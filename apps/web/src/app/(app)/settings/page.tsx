'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
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
import { ThemePreferenceSection } from '@/components/theme/theme-preference';
import { Button } from '@/components/ui/button';
import {
  Alert,
  BaggSelect,
  Checkbox,
  ColorField,
  Dialog,
  FormGrid,
  FormSection,
  OtpField,
  PageContainer,
  PageHeader,
  PhoneField,
  RadioGroup,
  TextArea,
  TextField,
} from '@/components/ui';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';

const API_BASE = '/api';

interface ReminderScheduleItem {
  days_relative_to_due: number;
  reminder_type: string;
  channel: string;
  enabled: boolean;
}

interface PendingStepUp {
  challengeId: string;
  purpose: string;
  payload: Record<string, unknown>;
  action: 'create' | 'delete' | 'delete_account';
  profileId?: string;
}

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

  const [reminderSchedules, setReminderSchedules] = useState<ReminderScheduleItem[]>([]);
  const [showStepUpModal, setShowStepUpModal] = useState(false);
  const [stepUpCode, setStepUpCode] = useState('');
  const [verifyingStepUp, setVerifyingStepUp] = useState(false);
  const [stepUpError, setStepUpError] = useState<string | null>(null);
  const [pendingStepUp, setPendingStepUp] = useState<PendingStepUp | null>(null);

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
    fetch(`${API_BASE}/reminders/settings`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.schedules)) {
          setReminderSchedules(data.schedules);
        }
      })
      .catch(() => {});
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
      setProfileError(null);
      const stepUpRes = await fetch(`${API_BASE}/security/step-up/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          purpose: 'payment_profile_create',
          resource_type: 'payment_profile',
          resource_id: null,
          payload,
        }),
      });

      if (!stepUpRes.ok) {
        const errData = await stepUpRes.json().catch(() => ({}));
        throw new Error(errData.detail || 'Could not initiate security verification.');
      }

      const stepUpData = await stepUpRes.json();
      setPendingStepUp({
        challengeId: stepUpData.challenge_id,
        purpose: 'payment_profile_create',
        payload,
        action: 'create',
      });
      if (stepUpData.code) {
        setStepUpCode(stepUpData.code);
      }
      setShowStepUpModal(true);
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
      setError(null);
      const payload = { profile_id: profile.id };
      const stepUpRes = await fetch(`${API_BASE}/security/step-up/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          purpose: 'payment_profile_delete',
          resource_type: 'payment_profile',
          resource_id: profile.id,
          payload,
        }),
      });

      if (!stepUpRes.ok) {
        const errData = await stepUpRes.json().catch(() => ({}));
        throw new Error(errData.detail || 'Could not initiate security verification.');
      }

      const stepUpData = await stepUpRes.json();
      setPendingStepUp({
        challengeId: stepUpData.challenge_id,
        purpose: 'payment_profile_delete',
        payload,
        action: 'delete',
        profileId: profile.id,
      });
      if (stepUpData.code) {
        setStepUpCode(stepUpData.code);
      }
      setShowStepUpModal(true);
    } catch (err) {
      setError(errorText(err, 'we could not delete that payment detail. Try again.'));
    }
  };

  const handleVerifyStepUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingStepUp || !stepUpCode.trim()) return;

    setVerifyingStepUp(true);
    setStepUpError(null);

    try {
      const verifyRes = await fetch(`${API_BASE}/security/step-up/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          challenge_id: pendingStepUp.challengeId,
          code: stepUpCode.trim(),
        }),
      });

      if (!verifyRes.ok) {
        const errData = await verifyRes.json().catch(() => ({}));
        throw new Error(errData.detail || 'Invalid verification code. Please check and try again.');
      }

      if (pendingStepUp.action === 'delete_account') {
        const res = await fetch(`${API_BASE}/compliance/delete-account`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            challenge_id: pendingStepUp.challengeId,
            confirmation_phrase: pendingStepUp.payload.confirmation_phrase,
            reason: pendingStepUp.payload.reason || undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || 'we could not delete your account. Try again.');
        }

        // Full reload on purpose: the account no longer exists, so every
        // cached client store must be discarded.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = '/login';
        return;
      }

      if (pendingStepUp.action === 'create') {
        const res = await fetch(`${API_BASE}/payments/profiles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Security-Challenge-ID': pendingStepUp.challengeId,
          },
          credentials: 'include',
          body: JSON.stringify(pendingStepUp.payload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || 'we could not save that payment detail. Check it and try again.');
        }

        setShowStepUpModal(false);
        setShowAddProfileModal(false);
        setStepUpCode('');
        setPendingStepUp(null);
        setBankName('');
        setAccountName('');
        setAccountNumber('');
        setRoutingNumber('');
        setPaymentLink('');
        setMobileMoneyNumber('');
        setInstructions('');
        showNotice(`${newCurrency} payment details saved.`);
        await fetchProfiles();
      } else if (pendingStepUp.action === 'delete') {
        const res = await fetch(`${API_BASE}/payments/profiles/${pendingStepUp.profileId}`, {
          method: 'DELETE',
          headers: {
            'X-Security-Challenge-ID': pendingStepUp.challengeId,
          },
          credentials: 'include',
        });

        if (!res.ok) throw new Error('we could not delete that payment detail. Try again.');

        setShowStepUpModal(false);
        setStepUpCode('');
        setPendingStepUp(null);
        showNotice('Payment detail deleted.');
        await fetchProfiles();
      }
    } catch (err) {
      setStepUpError(errorText(err, 'Verification failed. Try again.'));
    } finally {
      setVerifyingStepUp(false);
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

      const stepUpRes = await fetch(`${API_BASE}/security/step-up/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          purpose: 'account_deletion',
          resource_type: 'account',
          resource_id: null,
          payload: { confirmation_phrase: deletePhrase, reason: deleteReason || null },
        }),
      });

      if (!stepUpRes.ok) {
        const errData = await stepUpRes.json().catch(() => ({}));
        throw new Error(errData.detail || 'Could not initiate security verification.');
      }

      const stepUpData = await stepUpRes.json();
      setPendingStepUp({
        challengeId: stepUpData.challenge_id,
        purpose: 'account_deletion',
        payload: { confirmation_phrase: deletePhrase, reason: deleteReason || null },
        action: 'delete_account',
      });
      setShowDeleteModal(false);
      if (stepUpData.code) {
        setStepUpCode(stepUpData.code);
      }
      setShowStepUpModal(true);
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
    <PageContainer width="form">
      <div>
        <PageHeader
            title="Settings"
            description="Your business details, payment rails and account controls."
        />
      </div>

      <ThemePreferenceSection/>

      {notice && (
          <Alert
              variant="success"
              dismissible
              onDismiss={() => setNotice(null)}
          >
            {notice}
          </Alert>
      )}

      {error && (
          <Alert
              variant="error"
              dismissible
              onDismiss={() => setError(null)}
          >
            {error}
          </Alert>
      )}

      <FormSection
        id="business-profile"
        icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
        title="Business profile"
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
        <form
          id="business-profile-form"
          onSubmit={handleSaveProfile}
          className="space-y-4"
        >
          <FormGrid>
            <TextField
              label="Business name"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />

            <TextField
              label="Tax ID or TIN"
              optional
              placeholder="e.g. TIN-98765432-0001"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />

            <BaggSelect
              label="Default currency"
              value={defaultCurrency}
              onChange={setDefaultCurrency}
              options={CURRENCY_OPTIONS}
            />

            <TextField
              label="Country"
              autoComplete="country"
              placeholder="e.g. NG"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />

            <TextField
              label="Billing address"
              autoComplete="street-address"
              placeholder="Street, city, state"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="sm:col-span-2"
            />

            <ColorField
              label="Document accent"
              hint="Used on public quote and receipt pages."
              value={brandColor}
              onChange={setBrandColor}
              className="sm:col-span-2"
            />
          </FormGrid>

          <p className="text-caption text-text-muted">
            Changes apply to new and draft invoices. Invoices already sent keep their
            original snapshot.
          </p>
        </form>
      </FormSection>

      <FormSection
        icon={<Coins className="h-4 w-4" aria-hidden="true" />}
        title="plan and sends"
        description="Free sends reset each month. Credits never expire."
      >
        {loadingBilling ? (
          <div className="grid gap-3 sm:grid-cols-2" aria-label="Loading billing">
            <div className="h-40 animate-pulse bg-surface-tint" />
            <div className="h-40 animate-pulse bg-surface-tint" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col justify-between border-brut-thin border-ink bg-surface-sunken p-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-caption font-extrabold text-text-soft">current plan</p>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-caption font-extrabold text-text-soft">
                    {planName}
                  </span>
                </div>
                <p className="mt-2 text-heading text-text">
                  {isPro ? 'Creator Pro' : 'Free to start'}
                </p>
                <p className="mt-1 text-body text-text-soft">
                  {isPro
                    ? 'Unlimited invoice sends and watermark-free PDFs.'
                    : '3 free invoice sends each month, then use credits.'}
                </p>

                {!isPro && creditsData && (
                  <div className="mt-3">
                    <div className="flex justify-between gap-3 text-caption">
                      <span className="text-text-muted">free sends this month</span>
                      <span className="font-extrabold text-text">
                        {creditsData.free_sends_used_this_month} / {creditsData.free_sends_limit}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
                      <div className="h-full rounded-full bg-mango" style={{ width: `${freeSendsPercent}%` }} />
                    </div>
                  </div>
                )}

                {isPro && subData?.current_period_end && (
                  <p className="mt-3 text-caption text-text-muted">
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
                      className="min-h-9 px-0 text-status-late-fg hover:no-underline"
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

            <div className="flex flex-col justify-between border-brut-thin border-ink bg-surface p-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-caption font-extrabold text-text-soft">prepaid credits</p>
                  <Coins className="h-4 w-4 text-text-muted" aria-hidden="true" />
                </div>
                <p className="mt-2 text-amount-l text-text">
                  {creditsData?.balance ?? 0}
                  <span className="ml-1.5 text-caption font-normal text-text-muted">credits</span>
                </p>
                <p className="mt-1 text-body text-text-soft">
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
      </FormSection>

      <FormSection
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
                    ? 'bg-status-paid text-status-paid-fg'
                    : 'bg-surface-tint text-text-muted',
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
              <div key={item} className="h-20 animate-pulse bg-surface-tint" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="border-brut-thin border-dashed border-ink p-6 text-center">
            <BagCharacter size={64} className="mx-auto" />
            <p className="mt-3 text-heading text-text">no payment details yet</p>
            <p className="mx-auto mt-1 max-w-sm text-body text-text-soft">
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
                className="flex flex-col gap-3 border-brut-thin border-ink p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-label font-extrabold text-text">{profile.currency}</span>
                    {profile.is_default && (
                      <span className="rounded-full bg-peach-chip px-2 py-0.5 text-caption font-extrabold text-text-soft">
                        default
                      </span>
                    )}
                  </div>
                  <div className="mt-1 space-y-1 text-body text-text-soft">
                    {profile.bank_name && (
                      <p className="flex items-center gap-1.5">
                        <Landmark className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                        {profile.bank_name} · {profile.account_number} · {profile.account_name}
                      </p>
                    )}
                    {profile.payment_link && (
                      <p className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
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
                        <Smartphone className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                        {profile.mobile_money_number} · {profile.account_name}
                      </p>
                    )}
                    {profile.instructions && (
                      <p className="text-caption text-text-muted">{profile.instructions}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteProfile(profile)}
                  aria-label={`Delete ${profile.currency} payment detail`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-full text-text-muted transition-colors hover:bg-status-late hover:text-status-late-fg sm:self-center"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        )}
      </FormSection>

      <FormSection
        icon={<Bell className="h-4 w-4" aria-hidden="true" />}
        title="reminder schedule"
        description="Polite reminders go out automatically. You can still nudge from any invoice."
      >
        <div className="grid gap-2 sm:grid-cols-4">
          {reminderSchedules.length > 0 ? (
            reminderSchedules.map((s, idx) => {
              const label =
                s.days_relative_to_due < 0
                  ? `${Math.abs(s.days_relative_to_due)} days before due`
                  : s.days_relative_to_due === 0
                  ? 'On the due date'
                  : `${s.days_relative_to_due} days after due`;
              return (
                <div key={idx} className="bg-surface-sunken px-3 py-3 text-caption font-bold text-text-soft">
                  <span className="capitalize">{s.channel}</span>: {label}
                </div>
              );
            })
          ) : (
            ['3 days before due', 'on the due date', '3 days after due', '7 days after due'].map(
              (label) => (
                <div key={label} className="bg-surface-sunken px-3 py-3 text-caption font-bold text-text-soft">
                  {label}
                </div>
              ),
            )
          )}
        </div>
      </FormSection>

      <FormSection
        icon={<Download className="h-4 w-4" aria-hidden="true" />}
        title="your data"
        description="Take a copy whenever you need it. Exports download immediately."
      >
        <div className="flex flex-wrap gap-2">
          <a
            href={`${API_BASE}/compliance/export/csv`}
            download
            className="inline-flex min-h-11 items-center gap-2 rounded-full border-brut-thin border-ink px-4 text-body font-extrabold text-text transition-colors hover:bg-surface-tint"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Export CSV
          </a>
          <a
            href={`${API_BASE}/compliance/export/zip`}
            download
            className="inline-flex min-h-11 items-center gap-2 rounded-full border-brut-thin border-ink px-4 text-body font-extrabold text-text transition-colors hover:bg-surface-tint"
          >
            <FileArchive className="h-4 w-4" aria-hidden="true" /> Export archive
          </a>
        </div>
      </FormSection>

      <section className="border-brut border-danger bg-surface p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-late text-status-late-fg">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-heading text-text">delete your account</h2>
            <p className="mt-1 max-w-xl text-body text-text-soft">
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
        <SheetContent className="max-h-[92dvh] overflow-hidden rounded-t-sheet border-brut border-ink bg-surface p-0 sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[88dvh] sm:w-[440px] sm:max-w-[calc(100vw-2rem)] sm:rounded-sheet">
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line sm:hidden" aria-hidden="true" />
          <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-3 sm:pt-5">
            <div>
              <h2 className="text-title text-text">new payment detail</h2>
              <p className="mt-1 text-body text-text-soft">
                Tell clients exactly where to send this currency.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddProfileModal(false)}
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-tint hover:text-text"
            >
              <span aria-hidden="true" className="text-title leading-none">
                ×
              </span>
            </button>
          </div>

          <form onSubmit={handleCreatePaymentProfile} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5">
              <FormGrid>
                <BaggSelect
                  label="Currency"
                  value={newCurrency}
                  onChange={setNewCurrency}
                  options={CURRENCY_OPTIONS}
                />

                <RadioGroup
                  label="How clients pay"
                  value={channelType}
                  onChange={(value) => setChannelType(value as ChannelType)}
                  direction="horizontal"
                  options={[
                    { value: 'bank', label: 'Bank' },
                    { value: 'digital', label: 'Link' },
                    { value: 'mobile_money', label: 'Mobile' },
                  ]}
                />
              </FormGrid>

              {channelType === 'bank' && (
                <div className="space-y-3">
                  <TextField
                    label="Bank name"
                    required
                    placeholder="e.g. Guaranty Trust Bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />

                  <FormGrid>
                    <TextField
                      label="Account name"
                      required
                      placeholder="e.g. Ada Okafor"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                    />

                    <TextField
                      label="Account or IBAN"
                      required
                      placeholder="e.g. 0123456789"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="font-mono"
                    />
                  </FormGrid>

                  <TextField
                    label="Routing, sort code or SWIFT"
                    optional
                    placeholder="e.g. GTBINGLA"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    className="font-mono"
                  />
                </div>
              )}

              {channelType === 'digital' && (
                <TextField
                  label="Payment link"
                  type="url"
                  required
                  placeholder="https://wise.com/pay/me/yourname"
                  value={paymentLink}
                  onChange={(e) => setPaymentLink(e.target.value)}
                />
              )}

              {channelType === 'mobile_money' && (
                <FormGrid>
                  <TextField
                    label="Account name"
                    required
                    placeholder="e.g. Kofi Mensah"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                  />

                  <PhoneField
                    label="Mobile money number"
                    required
                    placeholder="e.g. +233 24 123 4567"
                    value={mobileMoneyNumber}
                    onChange={(e) => setMobileMoneyNumber(e.target.value)}
                  />
                </FormGrid>
              )}

              <TextArea
                label="Instructions"
                optional
                rows={2}
                placeholder="e.g. Include the invoice number in the transfer note."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />

              <Checkbox
                label={`Use these as the default ${newCurrency} details`}
                checked={isDefault}
                onChange={setIsDefault}
              />

              {profileError && (
                  <Alert variant="error">{profileError}</Alert>
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
        <SheetContent className="max-h-[92dvh] overflow-y-auto rounded-t-sheet border-brut border-ink bg-surface p-5 pb-0 sm:inset-0 sm:m-auto sm:h-fit sm:w-[calc(100vw-2rem)] sm:max-w-md sm:rounded-sheet">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-late text-status-late-fg">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-title text-text">delete everything?</h2>
              <p className="mt-1 text-body text-text-soft">
                Your workspace, clients, invoices and public links will stop working immediately.
              </p>
            </div>
          </div>

          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <TextField
              label="Reason"
              optional
              placeholder="e.g. Switched platforms"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />

            <TextField
              label="Confirmation phrase"
              hint="Type DELETE MY ACCOUNT exactly to confirm."
              required
              placeholder="DELETE MY ACCOUNT"
              value={deletePhrase}
              onChange={(e) => setDeletePhrase(e.target.value)}
              className="font-mono font-bold"
            />

            {deleteError && (
                <Alert variant="error">{deleteError}</Alert>
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
      {/* Step-up Security Verification Dialog */}
      <Dialog
        open={showStepUpModal}
        onClose={() => {
          setShowStepUpModal(false);
          setPendingStepUp(null);
          setStepUpCode('');
          setStepUpError(null);
        }}
        title="Security verification"
      >
        <form onSubmit={handleVerifyStepUp} className="space-y-4 p-4">
          <div className="flex items-center gap-2 text-text">
            <ShieldCheck className="h-5 w-5 text-mango" />
            <p className="text-body font-bold">Confirm payout instructions change</p>
          </div>
          <p className="text-caption text-text-soft">
            A 6-digit confirmation code was dispatched to your account email. Enter it below to complete this update.
          </p>

          <OtpField
            id="stepUpCode"
            label="Verification code"
            length={12}
            placeholder="e.g. 123456"
            value={stepUpCode}
            onChange={setStepUpCode}
          />

          {stepUpError && (
              <Alert variant="error">{stepUpError}</Alert>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setShowStepUpModal(false);
                setPendingStepUp(null);
                setStepUpCode('');
                setStepUpError(null);
              }}
              disabled={verifyingStepUp}
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              type="submit"
              loading={verifyingStepUp}
              disabled={!stepUpCode.trim()}
            >
              Confirm
            </Button>
          </div>
        </form>
      </Dialog>
    </PageContainer>
  );
}


