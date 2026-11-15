
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  Coins,
  CreditCard,
  Download,
  FileArchive,
  FileSpreadsheet,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { ThemePreferenceSection } from '@/components/theme/theme-preference';
import { Button } from '@/components/ui/button';
import {
  Alert,
  BaggSelect,
  Dialog,
  FormGrid,
  FormSection,
  OtpField,
  PageContainer,
  PageHeader,
  TextField,
} from '@/components/ui';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';
import { formatMoney } from '@/lib/money';

const API_BASE = '/api';

const CURRENCY_OPTIONS = [
  { value: 'NGN', label: 'NGN · Nigerian naira' },
  { value: 'USD', label: 'USD · US dollar' },
  { value: 'GBP', label: 'GBP · British pound' },
  { value: 'EUR', label: 'EUR · Euro' },
  { value: 'GHS', label: 'GHS · Ghanaian cedi' },
  { value: 'KES', label: 'KES · Kenyan shilling' },
  { value: 'ZAR', label: 'ZAR · South African rand' },
];

interface WorkspaceProfile {
  business_name: string;
  tax_id: string;
  brand_color: string;
  default_currency: string;
  country: string;
  address: string;
}

interface SubscriptionData {
  tier: string;
  status: string;
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
  is_active: boolean;
  suppresses_watermark: boolean;
}

interface CreditsData {
  balance: number;
  free_sends_used_this_month: number;
  free_sends_limit: number;
  can_send_invoice: boolean;
}

interface ReminderScheduleItem {
  days_relative_to_due: number;
  reminder_type: string;
  channel: string;
  enabled: boolean;
}

interface PendingAccountDeletion {
  challengeId: string;
  confirmationPhrase: string;
  reason: string | null;
}

function errorText(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

async function responseError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}));
  return data.detail || data.message || fallback;
}

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const EMPTY_PROFILE: WorkspaceProfile = {
  business_name: '',
  tax_id: '',
  brand_color: '#FF7A1A',
  default_currency: 'NGN',
  country: 'NG',
  address: '',
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<WorkspaceProfile>(EMPTY_PROFILE);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [reminders, setReminders] = useState<ReminderScheduleItem[]>([]);

  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [loadingBilling, setLoadingBilling] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [billingActionLoading, setBillingActionLoading] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [showStepUpModal, setShowStepUpModal] = useState(false);
  const [stepUpCode, setStepUpCode] = useState('');
  const [stepUpError, setStepUpError] = useState<string | null>(null);
  const [verifyingStepUp, setVerifyingStepUp] = useState(false);
  const [pendingDeletion, setPendingDeletion] =
    useState<PendingAccountDeletion | null>(null);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 4000);
  }, []);

  const loadWorkspace = useCallback(async () => {
    try {
      setLoadingWorkspace(true);

      const response = await fetch(`${API_BASE}/workspaces/current`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await responseError(response, 'Could not load your workspace.'));
      }

      const data = await response.json();

      setProfile({
        business_name: data.business_name || '',
        tax_id: data.tax_id || '',
        brand_color: data.brand_color || '#FF7A1A',
        default_currency: data.default_currency || 'NGN',
        country: data.country || 'NG',
        address: data.address || '',
      });
    } catch (err) {
      setError(errorText(err, 'Could not load your workspace. Refresh and try again.'));
    } finally {
      setLoadingWorkspace(false);
    }
  }, []);

  const loadBilling = useCallback(async () => {
    try {
      setLoadingBilling(true);

      const [subscriptionResponse, creditsResponse] = await Promise.all([
        fetch(`${API_BASE}/billing/subscription`, {
          credentials: 'include',
        }),
        fetch(`${API_BASE}/billing/credits`, {
          credentials: 'include',
        }),
      ]);

      if (subscriptionResponse.ok) {
        setSubscription(await subscriptionResponse.json());
      }

      if (creditsResponse.ok) {
        setCredits(await creditsResponse.json());
      }
    } catch {
      setError('We could not load your billing details. Try again.');
    } finally {
      setLoadingBilling(false);
    }
  }, []);

  const loadReminders = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/reminders/settings`, {
        credentials: 'include',
      });

      if (!response.ok) return;

      const data = await response.json();

      if (Array.isArray(data.schedules)) {
        setReminders(data.schedules);
      }
    } catch {
      // Reminder overview is non-critical to the Settings page.
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
    void loadBilling();
    void loadReminders();
  }, [loadWorkspace, loadBilling, loadReminders]);

  const updateProfileField = <K extends keyof WorkspaceProfile>(
    field: K,
    value: WorkspaceProfile[K],
  ) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile.business_name.trim()) {
      setError('Enter your business name before saving.');
      return;
    }

    try {
      setSavingProfile(true);
      setError(null);

      const response = await fetch(`${API_BASE}/workspaces/current`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          business_name: profile.business_name.trim(),
          tax_id: profile.tax_id.trim() || null,
          brand_color: profile.brand_color,
          default_currency: profile.default_currency,
          country: profile.country.trim(),
          address: profile.address.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await responseError(response, 'We could not save your business profile.'),
        );
      }

      showNotice('Business profile saved. New and draft documents will use these details.');
    } catch (err) {
      setError(errorText(err, 'We could not save your business profile.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      setBillingActionLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          plan_code: 'creator_pro_monthly',
          callback_url: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error(await responseError(response, 'We could not start checkout.'));
      }

      const data = await response.json();

      if (!data.authorization_url) {
        throw new Error('The payment provider did not return a checkout URL.');
      }

      window.location.assign(data.authorization_url);
    } catch (err) {
      setError(errorText(err, 'We could not start checkout. Try again.'));
      setBillingActionLoading(false);
    }
  };

  const handleBuyCredits = async () => {
    try {
      setBillingActionLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/billing/credits/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pack_size: 200 }),
      });

      if (!response.ok) {
        throw new Error(await responseError(response, 'We could not buy credits.'));
      }

      const data = await response.json();
      setCredits(data);
      showNotice('Your credit purchase has been processed.');
    } catch (err) {
      setError(errorText(err, 'We could not buy credits. Try again.'));
    } finally {
      setBillingActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      'Stop auto-renewal? You will retain your paid access until the current billing period ends.',
    );

    if (!confirmed) return;

    try {
      setBillingActionLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/billing/subscription/cancel`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await responseError(response, 'We could not stop auto-renewal.'));
      }

      const data = await response.json();

      showNotice(data.message || 'Auto-renewal stopped.');
      await loadBilling();
    } catch (err) {
      setError(errorText(err, 'We could not stop auto-renewal.'));
    } finally {
      setBillingActionLoading(false);
    }
  };

  const handleDeleteAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (deletePhrase !== 'DELETE MY ACCOUNT') {
      setDeleteError('Type DELETE MY ACCOUNT exactly to confirm.');
      return;
    }

    try {
      setDeletingAccount(true);
      setDeleteError(null);

      const payload = {
        confirmation_phrase: deletePhrase,
        reason: deleteReason.trim() || null,
      };

      const response = await fetch(`${API_BASE}/security/step-up/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          purpose: 'account_deletion',
          resource_type: 'account',
          resource_id: null,
          payload,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await responseError(response, 'Could not initiate security verification.'),
        );
      }

      const data = await response.json();

      setPendingDeletion({
        challengeId: data.challenge_id,
        confirmationPhrase: payload.confirmation_phrase,
        reason: payload.reason,
      });

      setStepUpCode(data.code || '');
      setStepUpError(null);
      setShowDeleteModal(false);
      setShowStepUpModal(true);
    } catch (err) {
      setDeleteError(errorText(err, 'We could not initiate account deletion.'));
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleVerifyDeletion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!pendingDeletion || stepUpCode.trim().length !== 6) return;

    try {
      setVerifyingStepUp(true);
      setStepUpError(null);

      const verifyResponse = await fetch(`${API_BASE}/security/step-up/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          challenge_id: pendingDeletion.challengeId,
          code: stepUpCode.trim(),
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error(
          await responseError(
            verifyResponse,
            'Invalid or expired verification code. Try again.',
          ),
        );
      }

      const deleteResponse = await fetch(`${API_BASE}/compliance/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          challenge_id: pendingDeletion.challengeId,
          confirmation_phrase: pendingDeletion.confirmationPhrase,
          reason: pendingDeletion.reason || undefined,
        }),
      });

      if (!deleteResponse.ok) {
        throw new Error(
          await responseError(deleteResponse, 'We could not delete your account.'),
        );
      }

      window.location.assign('/login');
    } catch (err) {
      setStepUpError(errorText(err, 'Verification failed. Try again.'));
    } finally {
      setVerifyingStepUp(false);
    }
  };

  const isPaid = Boolean(subscription?.is_active && subscription.tier !== 'free');

  const planName =
    subscription?.tier === 'creator_pro'
      ? 'Creator Pro'
      : subscription?.tier === 'professional'
        ? 'Professional'
        : 'Free';

  const freeSendsPercent = credits
    ? Math.min(
        100,
        (credits.free_sends_used_this_month /
          Math.max(credits.free_sends_limit, 1)) *
          100,
      )
    : 0;

  return (
    <PageContainer width="form">
      <PageHeader
        title="Settings"
        description="Manage your business details, subscription and account."
      />

      <ThemePreferenceSection />

      {notice && (
        <Alert variant="success" dismissible onDismiss={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <FormSection
        id="business-profile"
        icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
        title="Business profile"
        description="The business identity and contact details displayed on your documents."
        action={
          <Button
            type="submit"
            form="business-profile-form"
            disabled={savingProfile || loadingWorkspace}
          >
            {savingProfile ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            Save profile
          </Button>
        }
      >
        {loadingWorkspace ? (
          <div className="h-36 animate-pulse bg-surface-tint" aria-label="Loading workspace" />
        ) : (
          <form
            id="business-profile-form"
            onSubmit={handleSaveProfile}
            className="space-y-4"
          >
            <FormGrid>
              <TextField
                label="Business name"
                required
                value={profile.business_name}
                onChange={(event) =>
                  updateProfileField('business_name', event.target.value)
                }
              />

              <TextField
                label="Tax ID or TIN"
                optional
                placeholder="e.g. TIN-98765432-0001"
                value={profile.tax_id}
                onChange={(event) => updateProfileField('tax_id', event.target.value)}
              />

              <BaggSelect
                label="Default currency"
                value={profile.default_currency}
                onChange={(value) => updateProfileField('default_currency', value)}
                options={CURRENCY_OPTIONS}
              />

              <TextField
                label="Country code"
                placeholder="e.g. NG"
                value={profile.country}
                onChange={(event) => updateProfileField('country', event.target.value)}
              />

              <TextField
                label="Billing address"
                optional
                autoComplete="street-address"
                placeholder="Street, city, state"
                value={profile.address}
                onChange={(event) => updateProfileField('address', event.target.value)}
                className="sm:col-span-2"
              />

              <TextField
                label="Document accent colour"
                hint="Hex colour used on supported public document pages."
                value={profile.brand_color}
                onChange={(event) => updateProfileField('brand_color', event.target.value)}
                className="sm:col-span-2"
              />
            </FormGrid>

            <p className="text-caption text-text-muted">
              Changes apply to new and draft documents. Documents already sent retain
              their original details.
            </p>
          </form>
        )}
      </FormSection>

      <FormSection
        icon={<Coins className="h-4 w-4" aria-hidden="true" />}
        title="Plan and invoice sends"
        description="Review your subscription and available invoice sends."
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
                  <p className="text-caption font-extrabold text-text-soft">
                    Current plan
                  </p>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-caption font-extrabold text-text-soft">
                    {planName}
                  </span>
                </div>

                <p className="mt-2 text-heading text-text">
                  {isPaid ? planName : 'Free to start'}
                </p>

                <p className="mt-1 text-body text-text-soft">
                  {isPaid
                    ? 'Your paid plan benefits are active for this workspace.'
                    : 'Start free. Upgrade when you need more capacity and features.'}
                </p>

                {!isPaid && credits && (
                  <div className="mt-3">
                    <div className="flex justify-between gap-3 text-caption">
                      <span className="text-text-muted">Free invoice sends this month</span>
                      <span className="font-extrabold text-text">
                        {credits.free_sends_used_this_month} / {credits.free_sends_limit}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-mango"
                        style={{ width: `${freeSendsPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {subscription?.current_period_end && isPaid && (
                  <p className="mt-3 text-caption text-text-muted">
                    {subscription.cancel_at_period_end
                      ? `Access until ${formatDate(subscription.current_period_end)}`
                      : `Renews ${formatDate(subscription.current_period_end)}`}
                  </p>
                )}
              </div>

              <div className="mt-4 border-t border-line-subtle pt-3">
                {isPaid ? (
                  subscription?.cancel_at_period_end ? (
                    <p className="text-caption text-text-muted">
                      Auto-renewal is already stopped.
                    </p>
                  ) : (
                    <Button
                      type="button"
                      variant="link"
                      disabled={billingActionLoading}
                      onClick={handleCancelSubscription}
                      className="min-h-9 px-0 text-status-late-fg hover:no-underline"
                    >
                      {billingActionLoading ? 'Processing…' : 'Stop auto-renewal'}
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
                    Explore Creator Pro
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-between border-brut-thin border-ink bg-surface p-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-caption font-extrabold text-text-soft">
                    Prepaid credits
                  </p>
                  <Coins className="h-4 w-4 text-text-muted" aria-hidden="true" />
                </div>

                <p className="mt-2 text-amount-l text-text">
                  {credits?.balance ?? 0}
                  <span className="ml-1.5 text-caption font-normal text-text-muted">
                    credits
                  </span>
                </p>

                <p className="mt-1 text-body text-text-soft">
                  Credits can be used for eligible invoice sends after your free monthly
                  allowance.
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
                  {billingActionLoading && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
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
        title="Get paid"
        description="Configure the payment instructions your clients see on invoices."
        action={
          <Link
            href="/settings/payments"
            className="inline-flex min-h-10 items-center justify-center rounded-full border-brut-thin border-ink px-4 text-caption font-extrabold text-text transition-colors hover:bg-surface-tint"
          >
            Manage payment settings
          </Link>
        }
      >
        <div className="flex flex-col gap-3 border-brut-thin border-ink bg-surface-sunken p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-extrabold text-text">Payment instructions by currency</p>
            <p className="mt-1 text-body text-text-soft">
              Add bank accounts, payment links and mobile money details. You can keep
              multiple profiles and choose a default for each currency.
            </p>
          </div>
          <Link
            href="/settings/payments"
            className="shrink-0 text-body font-extrabold text-link hover:underline"
          >
            Open Get Paid settings →
          </Link>
        </div>
        <p className="text-caption text-text-muted">
          These are payment instructions for your clients. They are not a connection
          to a Paystack merchant account or to Bagg subscription billing.
        </p>
      </FormSection>

      <FormSection
        icon={<Bell className="h-4 w-4" aria-hidden="true" />}
        title="Reminder schedule"
        description="A preview of the automatic invoice reminder schedule."
      >
        {reminders.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {reminders.map((item, index) => {
              const timing =
                item.days_relative_to_due < 0
                  ? `${Math.abs(item.days_relative_to_due)} days before due`
                  : item.days_relative_to_due === 0
                    ? 'On the due date'
                    : `${item.days_relative_to_due} days after due`;

              return (
                <div
                  key={`${item.reminder_type}-${item.channel}-${index}`}
                  className="bg-surface-sunken px-3 py-3 text-caption font-bold text-text-soft"
                >
                  <span className="capitalize">{item.channel}</span>: {timing}
                  {!item.enabled && (
                    <span className="ml-2 font-normal text-text-muted">Disabled</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-body text-text-soft">
            Your reminder schedule will appear here when it is available.
          </p>
        )}
      </FormSection>

      <FormSection
        icon={<Download className="h-4 w-4" aria-hidden="true" />}
        title="Your data"
        description="Download a copy of your workspace data."
      >
        <div className="flex flex-wrap gap-2">
          <a
            href={`${API_BASE}/compliance/export/csv`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border-brut-thin border-ink px-4 text-body font-extrabold text-text transition-colors hover:bg-surface-tint"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </a>

          <a
            href={`${API_BASE}/compliance/export/zip`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border-brut-thin border-ink px-4 text-body font-extrabold text-text transition-colors hover:bg-surface-tint"
          >
            <FileArchive className="h-4 w-4" aria-hidden="true" />
            Export archive
          </a>
        </div>
      </FormSection>

      <section className="border-brut border-danger bg-surface p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-late text-status-late-fg">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-heading text-text">Delete your account</h2>
            <p className="mt-1 max-w-xl text-body text-text-soft">
              This permanently removes your workspace, clients, invoices and public
              links. This action cannot be undone.
            </p>

            <Button
              type="button"
              variant="danger"
              onClick={() => {
                setDeleteError(null);
                setDeletePhrase('');
                setDeleteReason('');
                setShowDeleteModal(true);
              }}
              className="mt-4"
            >
              Delete account and data
            </Button>
          </div>
        </div>
      </section>

      <Sheet open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <SheetContent className="max-h-[92dvh] overflow-y-auto rounded-t-sheet border-brut border-ink bg-surface p-5 pb-0 sm:inset-0 sm:m-auto sm:h-fit sm:w-[calc(100vw-2rem)] sm:max-w-md sm:rounded-sheet">
          <div className="mb-4 flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-status-late-fg" />
            <div>
              <h2 className="text-title text-text">Delete your account?</h2>
              <p className="mt-1 text-body text-text-soft">
                Your workspace, clients, invoices and public links will stop working.
              </p>
            </div>
          </div>

          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <TextField
              label="Reason"
              optional
              placeholder="e.g. I am moving to another platform"
              value={deleteReason}
              onChange={(event) => setDeleteReason(event.target.value)}
            />

            <TextField
              label="Confirmation phrase"
              hint="Type DELETE MY ACCOUNT exactly to continue."
              required
              placeholder="DELETE MY ACCOUNT"
              value={deletePhrase}
              onChange={(event) => setDeletePhrase(event.target.value)}
              className="font-mono font-bold"
            />

            {deleteError && <Alert variant="error">{deleteError}</Alert>}

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
              >
                Keep my account
              </Button>

              <Button
                type="submit"
                variant="danger"
                disabled={
                  deletingAccount || deletePhrase !== 'DELETE MY ACCOUNT'
                }
              >
                {deletingAccount && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                Continue
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog
        open={showStepUpModal}
        onClose={() => {
          if (verifyingStepUp) return;
          setShowStepUpModal(false);
          setPendingDeletion(null);
          setStepUpCode('');
          setStepUpError(null);
        }}
        title="Security verification"
      >
        <form onSubmit={handleVerifyDeletion} className="space-y-4 p-4">
          <div className="flex items-center gap-2 text-text">
            <ShieldCheck className="h-5 w-5 text-mango" />
            <p className="text-body font-bold">Confirm account deletion</p>
          </div>

          <p className="text-caption text-text-soft">
            Enter the six-digit security code sent to your account email.
          </p>

          <OtpField
            id="accountDeletionCode"
            label="Verification code"
            length={6}
            placeholder="123456"
            value={stepUpCode}
            onChange={setStepUpCode}
          />

          {stepUpError && <Alert variant="error">{stepUpError}</Alert>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={verifyingStepUp}
              onClick={() => {
                setShowStepUpModal(false);
                setPendingDeletion(null);
                setStepUpCode('');
                setStepUpError(null);
              }}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="danger"
              loading={verifyingStepUp}
              disabled={stepUpCode.trim().length !== 6 || !pendingDeletion}
            >
              Confirm deletion
            </Button>
          </div>
        </form>
      </Dialog>
    </PageContainer>
  );
}
