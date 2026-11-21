
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Bell,
  Building2,
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
import { UpgradeModal } from '@/components/billing';
import { Button } from '@/components/ui/button';
import {
  Alert,
  BaggSelect,
  ColorField,
  Dialog,
  FormGrid,
  FormSection,
  FormSubsection,
  OtpField,
  PageContainer,
  PageHeader,
  TextField,
  buttonStyles,
} from '@/components/ui';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/cn';
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

const SETTINGS_SECTIONS = [
  { id: 'business-profile', label: 'Business profile' },
  { id: 'plan', label: 'Plan & sends' },
  { id: 'payments', label: 'Get paid' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'data', label: 'Your data' },
  { id: 'danger', label: 'Delete account' },
] as const;

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
  in_grace_period?: boolean;
  currency?: string;
  amount_minor?: number;
  billing_interval?: string;
  free_sends_used_this_month?: number;
  free_sends_limit?: number;
  credit_balance?: number;
}

interface CreditsData {
  balance: number;
  tier: string;
  free_sends_used_this_month: number;
  free_sends_limit: number;
  history?: Array<{
    id: string;
    amount: number;
    balance_after: number;
    reason: string;
    description?: string | null;
    created_at: string;
  }>;
}

interface ReminderScheduleItem {
  days_relative_to_due: number;
  reminder_type: string;
  channel: string;
  enabled: boolean;
}

interface ReminderSettingsResponse {
  workspace_id: string;
  auto_remind: boolean;
  schedules: ReminderScheduleItem[];
}

interface PendingAccountDeletion {
  challengeId: string;
  confirmationPhrase: string;
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
  const router = useRouter();
  const [profile, setProfile] = useState<WorkspaceProfile>(EMPTY_PROFILE);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [reminders, setReminders] = useState<ReminderScheduleItem[]>([]);
const [remindersEnabled, setRemindersEnabled] = useState<boolean | null>(null);
const [loadingReminders, setLoadingReminders] = useState(true);
const [remindersError, setRemindersError] = useState<string | null>(null);

  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [loadingBilling, setLoadingBilling] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [billingActionLoading, setBillingActionLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<string>('business-profile');

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
      setLoadingReminders(true);
      setRemindersError(null);

      const response = await fetch(`${API_BASE}/reminders/settings`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(
          await responseError(
            response,
            'We could not load your reminder schedule.',
          ),
        );
      }

      const data: ReminderSettingsResponse = await response.json();

      setReminders(Array.isArray(data.schedules) ? data.schedules : []);
      setRemindersEnabled(data.auto_remind === true);
    } catch (err) {
      setRemindersError(
        errorText(err, 'We could not load your reminder schedule.'),
      );
    } finally {
      setLoadingReminders(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
    void loadBilling();
    void loadReminders();
  }, [loadWorkspace, loadBilling, loadReminders]);

  useEffect(() => {
    const elements = SETTINGS_SECTIONS.map((section) =>
      document.getElementById(section.id),
    ).filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );

        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: '-100px 0px -55% 0px', threshold: 0 },
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, []);

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

  const handleUpgrade = () => {
    setShowUpgradeModal(true);
  };

  const handleBuyCredits = async () => {
    try {
      setBillingActionLoading(true);
      setError(null);

      const callbackUrl = `${window.location.origin}/billing/checkout/pending`;

      const response = await fetch(`${API_BASE}/billing/credits/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          pack: '200_credits',
          currency: 'NGN',
          callback_url: callbackUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(await responseError(response, 'We could not start credit purchase.'));
      }

      const data = await response.json();

      if (!data.authorization_url) {
        throw new Error('The payment provider did not return a checkout URL.');
      }

      try {
        window.sessionStorage.setItem('bagg:active-checkout-id', data.checkout_id);
        window.localStorage.setItem('bagg:last-checkout-id', data.checkout_id);
        window.localStorage.setItem('bagg:checkout:return-next', '/settings#plan');
      } catch {
        // Continue if storage is restricted
      }

      window.location.assign(data.authorization_url);
    } catch (err) {
      setError(errorText(err, 'We could not buy credits. Try again.'));
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
        action: 'delete_account',
        confirmation_phrase: 'DELETE MY ACCOUNT',
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
        }),
      });

      if (!deleteResponse.ok) {
        throw new Error(
          await responseError(deleteResponse, 'We could not delete your account.'),
        );
      }

      router.replace('/login');
    } catch (err) {
      setStepUpError(errorText(err, 'Verification failed. Try again.'));
    } finally {
      setVerifyingStepUp(false);
    }
  };

  const isPaid = Boolean(
    subscription &&
      subscription.tier !== 'free' &&
      (
        subscription.status === 'active' ||
        subscription.in_grace_period === true
      ),
  );

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
    <PageContainer width="list">
      <PageHeader
        title="Settings"
        description="Manage your business details, subscription and account."
      />

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

      <div className="grid gap-6 lg:grid-cols-[210px_minmax(0,1fr)] lg:items-start">
        <nav
          aria-label="Settings sections"
          className="min-w-0 max-w-full lg:sticky lg:top-6"
        >
          <div className="min-w-0 max-w-full border-brut border-ink bg-surface">
            <p className="hidden border-b border-line-subtle px-3 py-2.5 text-label font-extrabold uppercase tracking-wide text-text-muted lg:block">
              On this page
            </p>

            <ul className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:gap-0 lg:overflow-visible lg:p-0">
              {SETTINGS_SECTIONS.map((section) => (
                <li
                  key={section.id}
                  className="shrink-0 lg:border-t lg:border-line-subtle lg:first:border-t-0"
                >
                  <a
                    href={`#${section.id}`}
                    aria-current={
                      activeSection === section.id ? 'location' : undefined
                    }
                    className={cn(
                      'flex min-h-11 items-center whitespace-nowrap px-3 text-body font-bold transition-colors',
                      'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink',
                      activeSection === section.id
                        ? 'bg-peach-chip text-text'
                        : 'text-text-soft hover:bg-surface-tint hover:text-text',
                    )}
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="min-w-0 space-y-5">
          <FormSection
            id="business-profile"
            icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
            title="Business profile"
            description="The business identity and contact details displayed on your documents."
            className="scroll-mt-24"
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
              <div
                className="h-36 animate-pulse bg-surface-tint"
                aria-label="Loading workspace"
              />
            ) : (
              <form
                id="business-profile-form"
                onSubmit={handleSaveProfile}
                className="space-y-5"
              >
                <FormSubsection
                  title="Identity"
                  description="How your business is named on invoices and receipts."
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
                      onChange={(event) =>
                        updateProfileField('tax_id', event.target.value)
                      }
                    />
                  </FormGrid>
                </FormSubsection>

                <FormSubsection
                  divided
                  title="Billing details"
                  description="Where you operate and the defaults used on new documents."
                >
                  <FormGrid>
                    <BaggSelect
                      label="Default currency"
                      value={profile.default_currency}
                      onChange={(value) =>
                        updateProfileField('default_currency', value)
                      }
                      options={CURRENCY_OPTIONS}
                    />

                    <TextField
                      label="Country code"
                      placeholder="e.g. NG"
                      value={profile.country}
                      onChange={(event) =>
                        updateProfileField('country', event.target.value)
                      }
                    />
                  </FormGrid>

                  <TextField
                    label="Billing address"
                    optional
                    autoComplete="street-address"
                    placeholder="Street, city, state"
                    value={profile.address}
                    onChange={(event) =>
                      updateProfileField('address', event.target.value)
                    }
                  />
                </FormSubsection>

                <FormSubsection
                  divided
                  title="Branding"
                  description="The accent colour used on supported public document pages."
                >
                  <ColorField
                    label="Document accent colour"
                    hint="Hex colour used on supported public document pages."
                    value={profile.brand_color}
                    onChange={(value) =>
                      updateProfileField('brand_color', value)
                    }
                  />
                </FormSubsection>

                <p className="text-caption text-text-muted">
                  Changes apply to new and draft documents. Documents already sent
                  retain their original details.
                </p>
              </form>
            )}
          </FormSection>

          <FormSection
            id="plan"
            icon={<Coins className="h-4 w-4" aria-hidden="true" />}
            title="Plan and invoice sends"
            description="Review your subscription and available invoice sends."
            className="scroll-mt-24"
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
                          <span className="text-text-muted">
                            Free invoice sends this month
                          </span>
                          <span className="font-extrabold text-text">
                            {credits.free_sends_used_this_month} /{' '}
                            {credits.free_sends_limit}
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

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-subtle pt-3">
                    <Button
                      type="button"
                      variant={isPaid ? 'outline' : 'primary'}
                      onClick={handleUpgrade}
                    >
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      {isPaid ? 'Change or switch plan' : 'Upgrade plan'}
                    </Button>

                    {isPaid && (
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
                          className="min-h-9 px-2 text-status-late-fg hover:no-underline"
                        >
                          {billingActionLoading ? 'Processing…' : 'Stop auto-renewal'}
                        </Button>
                      )
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
                      Credits can be used for eligible invoice sends after your free
                      monthly allowance.
                    </p>
                  </div>

                  <div className="mt-4 border-t border-line-subtle pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      zone="calm"
                      disabled={billingActionLoading}
                      onClick={handleBuyCredits}
                    >
                      {billingActionLoading && (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      )}
                      Buy 200 credits · {formatMoney(200000, 'NGN', 'list')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </FormSection>

          <FormSection
            id="payments"
            icon={<CreditCard className="h-4 w-4" aria-hidden="true" />}
            title="Get paid"
            description="Configure the payment instructions your clients see on invoices."
            className="scroll-mt-24"
            action={
              <Link
                href="/settings/payments"
                className={buttonStyles({ variant: 'outline', zone: 'calm' })}
              >
                Manage payment settings
              </Link>
            }
          >
            <div className="border-brut-thin border-ink bg-surface-sunken p-4">
              <p className="font-extrabold text-text">
                Payment instructions by currency
              </p>
              <p className="mt-1 text-body text-text-soft">
                Add bank accounts, payment links and mobile money details. You can
                keep multiple profiles and choose a default for each currency.
              </p>
            </div>

            <p className="text-caption text-text-muted">
              These are payment instructions for your clients. They are not a
              connection to a Paystack merchant account or to Bagg subscription
              billing.
            </p>
          </FormSection>

          <FormSection
            id="reminders"
            icon={<Bell className="h-4 w-4" aria-hidden="true" />}
            title="Automatic invoice reminders"
            description="See when Bagg automatically follows up with clients about unpaid invoices."
            className="scroll-mt-24"
          >
            {loadingReminders ? (
              <div
                className="space-y-3"
                aria-label="Loading reminder schedule"
                aria-busy="true"
              >
                <div className="h-20 animate-pulse border-brut-thin border-ink bg-surface-tint motion-reduce:animate-none" />
                <div className="h-40 animate-pulse border-brut-thin border-ink bg-surface-tint motion-reduce:animate-none" />
              </div>
            ) : remindersError ? (
              <div className="space-y-3">
                <Alert variant="error">{remindersError}</Alert>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadReminders()}
                >
                  Try again
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-brut-thin border-ink bg-surface-sunken p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center border-brut-thin border-ink bg-mango text-ink">
                        <Bell className="h-5 w-5" aria-hidden="true" />
                      </span>

                      <div className="min-w-0">
                        <h3 className="font-extrabold text-text">
                          Automatic email reminders
                        </h3>

                        <p className="mt-1 text-caption text-text-soft">
                          Bagg follows up with clients at scheduled points around an
                          invoice due date.
                        </p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        'inline-flex w-fit items-center rounded-full px-3 py-1 text-caption font-bold',
                        remindersEnabled
                          ? 'bg-status-paid text-status-paid-fg'
                          : 'bg-surface-tint text-text-muted',
                      )}
                    >
                      {remindersEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                {remindersEnabled ? (
                  reminders.length > 0 ? (
                    <div className="overflow-hidden border-brut-thin border-ink bg-surface">
                      <div className="border-b border-line-subtle bg-surface-sunken px-4 py-3">
                        <h3 className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
                          Reminder timeline
                        </h3>
                      </div>

                      <ol className="divide-y divide-line-subtle">
                        {reminders.map((item, index) => {
                          const timing =
                            item.days_relative_to_due < 0
                              ? `${Math.abs(item.days_relative_to_due)} ${
                                  Math.abs(item.days_relative_to_due) === 1
                                    ? 'day'
                                    : 'days'
                                } before due`
                              : item.days_relative_to_due === 0
                                ? 'On the due date'
                                : `${item.days_relative_to_due} ${
                                    item.days_relative_to_due === 1 ? 'day' : 'days'
                                  } after due`;

                          const labels: Record<string, string> = {
                            upcoming_3d: 'Upcoming payment reminder',
                            due_today: 'Payment due today',
                            overdue_3d: 'Overdue follow-up',
                            overdue_7d: 'Overdue reminder',
                          };

                          return (
                            <li
                              key={`${item.reminder_type}-${item.channel}-${index}`}
                              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex min-w-0 items-start gap-3">
                                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-tint text-text-muted">
                                  <span className="text-caption font-extrabold">
                                    {index + 1}
                                  </span>
                                </span>

                                <div className="min-w-0">
                                  <p className="font-bold text-text">
                                    {labels[item.reminder_type] ?? 'Invoice reminder'}
                                  </p>

                                  <p className="mt-0.5 text-caption text-text-muted">
                                    {timing}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 pl-10 sm:pl-0">
                                <span className="rounded-full bg-surface-tint px-2.5 py-1 text-caption font-semibold capitalize text-text-soft">
                                  {item.channel}
                                </span>

                                <span
                                  className={cn(
                                    'rounded-full px-2.5 py-1 text-caption font-bold',
                                    item.enabled
                                      ? 'bg-status-paid text-status-paid-fg'
                                      : 'bg-surface-tint text-text-muted',
                                  )}
                                >
                                  {item.enabled ? 'Active' : 'Disabled'}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  ) : (
                    <div className="border-brut-thin border-ink bg-surface p-4">
                      <p className="font-bold text-text">
                        No reminder schedule is currently available.
                      </p>
                      <p className="mt-1 text-body text-text-soft">
                        Bagg has not returned any scheduled reminder events for this
                        workspace.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="border-brut-thin border-ink bg-surface p-4">
                    <p className="font-bold text-text">
                      Automatic reminders are disabled.
                    </p>
                    <p className="mt-1 text-body text-text-soft">
                      Automatic email reminders are not currently active for this
                      workspace.
                    </p>
                  </div>
                )}

                <div className="space-y-2 border-t border-line-subtle pt-4">
                  <div className="flex items-start gap-2">
                    <ShieldCheck
                      className="mt-0.5 h-4 w-4 shrink-0 text-text-muted"
                      aria-hidden="true"
                    />

                    <p className="text-caption text-text-soft">
                      Bagg manages this reminder schedule automatically. The timing
                      and delivery channel are currently fixed and cannot be customised
                      from workspace settings.
                    </p>
                  </div>

                  <p className="text-caption text-text-muted">
                    Reminders are scheduled for 09:00 UTC. They are only processed for
                    eligible invoices with an outstanding balance and a client email
                    address. WhatsApp reminders remain a manual action.
                  </p>
                </div>
              </div>
            )}
          </FormSection>

          <ThemePreferenceSection />

          
          <FormSection
            id="data"
            icon={<Download className="h-4 w-4" aria-hidden="true" />}
            title="Your data"
            description="Download a portable copy of your workspace records."
            className="scroll-mt-24"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col justify-between gap-4 border-brut-thin border-ink bg-surface p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet
                      className="h-5 w-5 text-text"
                      aria-hidden="true"
                    />
                    <h3 className="font-extrabold text-text">CSV export</h3>
                  </div>

                  <p className="mt-2 text-body text-text-soft">
                    A consolidated spreadsheet containing your clients, invoices
                    and payment claims. Useful for analysis and importing into
                    spreadsheet tools.
                  </p>

                  <p className="mt-3 text-caption text-text-muted">
                    One CSV file · UTF-8
                  </p>
                </div>

                <a
                  href={`${API_BASE}/compliance/export/csv`}
                  className={buttonStyles({
                    variant: 'outline',
                    zone: 'calm',
                  })}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download CSV
                </a>
              </div>

              <div className="flex flex-col justify-between gap-4 border-brut-thin border-ink bg-surface p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <FileArchive
                      className="h-5 w-5 text-text"
                      aria-hidden="true"
                    />
                    <h3 className="font-extrabold text-text">ZIP archive</h3>
                  </div>

                  <p className="mt-2 text-body text-text-soft">
                    Separate CSV files for clients, invoices and payment claims.
                    Better suited to structured migration or further processing.
                  </p>

                  <p className="mt-3 text-caption text-text-muted">
                    Three CSV files · ZIP archive
                  </p>
                </div>

                <a
                  href={`${API_BASE}/compliance/export/zip`}
                  className={buttonStyles({
                    variant: 'outline',
                    zone: 'calm',
                  })}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download ZIP
                </a>
              </div>
            </div>

            <div className="border-t border-line-subtle pt-3">
              <p className="text-caption text-text-muted">
                Exports contain records belonging to your active workspace.
                Financial amounts are represented in their currency's minor
                units. Export access requires an authenticated session.
              </p>
            </div>
          </FormSection>


          <section
            id="danger"
            className="scroll-mt-24 border-brut border-danger bg-surface p-5"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-late text-status-late-fg">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1">
                <h2 className="text-heading text-text">Delete your account</h2>
                <p className="mt-1 max-w-xl text-body text-text-soft">
                  Deactivating your account revokes active sessions and sign-in
                  credentials and anonymises your account profile. Financial documents,
                  payment records and relevant audit history are retained.
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
        </div>
      </div>

      <Sheet open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <SheetContent className="max-h-[92dvh] overflow-y-auto rounded-t-sheet border-brut border-ink bg-surface p-5 pb-0 sm:inset-0 sm:m-auto sm:h-fit sm:w-[calc(100vw-2rem)] sm:max-w-md sm:rounded-sheet">
          <div className="mb-4 flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-status-late-fg" />
            <div>
              <h2 className="text-title text-text">Delete your account?</h2>
              <p className="mt-1 text-body text-text-soft">
                Your account will be deactivated and your profile anonymised.
                Financial documents and payment records will be retained.
                You will no longer be able to sign in to this account.
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
        <form onSubmit={handleVerifyDeletion} className="space-y-4">
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

      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={subscription?.tier || 'free'}
        returnPath="/settings#plan"
      />
    </PageContainer>
  );
}
