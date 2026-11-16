
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileText,
  Globe,
  Landmark,
  Loader2,
  Plus,
  ShieldCheck,
  Smartphone,
  Star,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Alert,
  BaggSelect,
  Checkbox,
  Dialog,
  FormGrid,
  FormSection,
  FormSubsection,
  OtpField,
  PageContainer,
  PageHeader,
  PhoneField,
  RadioGroup,
  TextArea,
  TextField,
} from '@/components/ui';

const API_BASE = '/api';

const CURRENCIES = [
  { value: 'NGN', label: 'NGN · Nigerian naira' },
  { value: 'USD', label: 'USD · US dollar' },
  { value: 'GBP', label: 'GBP · British pound' },
  { value: 'EUR', label: 'EUR · Euro' },
  { value: 'GHS', label: 'GHS · Ghanaian cedi' },
  { value: 'KES', label: 'KES · Kenyan shilling' },
  { value: 'ZAR', label: 'ZAR · South African rand' },
];

interface PaymentProfile {
  id: string;
  workspace_id?: string;
  currency: string;
  bank_name?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  routing_number?: string | null;
  payment_link?: string | null;
  mobile_money_number?: string | null;
  instructions?: string | null;
  is_default: boolean;
  is_usable?: boolean;
  methods?: string[];
  created_at?: string;
}

interface ProfileForm {
  currency: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  routing_number: string;
  payment_link: string;
  mobile_money_number: string;
  instructions: string;
  is_default: boolean;
}

type PaymentMethod = 'bank' | 'link' | 'mobile_money' | 'instructions';

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'bank',
    label: 'Bank transfer',
    description: 'Account name, bank and account number.',
    icon: <Landmark className="h-5 w-5" aria-hidden="true" />,
  },
  {
    value: 'link',
    label: 'Payment link',
    description: 'A URL to your payment provider.',
    icon: <Globe className="h-5 w-5" aria-hidden="true" />,
  },
  {
    value: 'mobile_money',
    label: 'Mobile money',
    description: 'A mobile wallet number and account name.',
    icon: <Smartphone className="h-5 w-5" aria-hidden="true" />,
  },
  {
    value: 'instructions',
    label: 'Payment instructions',
    description: 'Written instructions for your client.',
    icon: <FileText className="h-5 w-5" aria-hidden="true" />,
  },
];

function methodFromProfile(profile: PaymentProfile): PaymentMethod {
  if (profile.bank_name || profile.account_number) return 'bank';
  if (profile.payment_link) return 'link';
  if (profile.mobile_money_number) return 'mobile_money';
  return 'instructions';
}

interface PendingStepUp {
  challengeId: string;
  purpose: 'payment_profile_create' | 'payment_profile_update' | 'payment_profile_delete';
  action: 'create' | 'update' | 'delete';
  profileId?: string;
  payload: Record<string, unknown>;
  resumeEditor: boolean;
}

const EMPTY_FORM: ProfileForm = {
  currency: 'NGN',
  bank_name: '',
  account_name: '',
  account_number: '',
  routing_number: '',
  payment_link: '',
  mobile_money_number: '',
  instructions: '',
  is_default: true,
};

function errorText(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

async function responseError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}));
  return data.detail || data.message || fallback;
}

function normaliseProfile(profile: PaymentProfile): PaymentProfile {
  return {
    ...profile,
    bank_name: profile.bank_name || null,
    account_name: profile.account_name || null,
    account_number: profile.account_number || null,
    routing_number: profile.routing_number || null,
    payment_link: profile.payment_link || null,
    mobile_money_number: profile.mobile_money_number || null,
    instructions: profile.instructions || null,
  };
}

function profileMethods(profile: PaymentProfile) {
  const methods: string[] = [];

  if (profile.bank_name || profile.account_number) methods.push('Bank transfer');
  if (profile.payment_link) methods.push('Payment link');
  if (profile.mobile_money_number) methods.push('Mobile money');
  if (profile.instructions && methods.length === 0) methods.push('Payment instructions');

  return methods;
}

function profileIsUsable(profile: PaymentProfile) {
  const bankValues = [
    profile.bank_name,
    profile.account_name,
    profile.account_number,
  ];

  const hasAnyBankValue = bankValues.some((value) => Boolean(value?.trim()));
  const hasCompleteBank = bankValues.every((value) => Boolean(value?.trim()));

  if (hasAnyBankValue && !hasCompleteBank) return false;

  const hasLink = Boolean(profile.payment_link?.trim());

  if (hasLink) {
    try {
      const url = new URL(profile.payment_link!);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    } catch {
      return false;
    }
  }

  const hasMobile = Boolean(profile.mobile_money_number?.trim());

  if (hasMobile && !profile.account_name?.trim()) return false;

  return (
    hasCompleteBank ||
    hasLink ||
    (hasMobile && Boolean(profile.account_name?.trim())) ||
    Boolean(profile.instructions?.trim())
  );
}

function formFromProfile(profile: PaymentProfile): ProfileForm {
  return {
    currency: profile.currency,
    bank_name: profile.bank_name || '',
    account_name: profile.account_name || '',
    account_number: profile.account_number || '',
    routing_number: profile.routing_number || '',
    payment_link: profile.payment_link || '',
    mobile_money_number: profile.mobile_money_number || '',
    instructions: profile.instructions || '',
    is_default: profile.is_default,
  };
}

function formToPayload(form: ProfileForm, method: PaymentMethod) {
  return {
    currency: form.currency,
    bank_name: method === 'bank' ? form.bank_name.trim() || null : null,
    account_name:
      method === 'bank' || method === 'mobile_money'
        ? form.account_name.trim() || null
        : null,
    account_number: method === 'bank' ? form.account_number.trim() || null : null,
    routing_number: method === 'bank' ? form.routing_number.trim() || null : null,
    payment_link: method === 'link' ? form.payment_link.trim() || null : null,
    mobile_money_number:
      method === 'mobile_money'
        ? form.mobile_money_number.trim() || null
        : null,
    instructions: form.instructions.trim() || null,
    is_default: form.is_default,
  };
}

function validateForm(form: ProfileForm, method: PaymentMethod): string | null {
  if (method === 'bank') {
    if (
      !form.bank_name.trim() ||
      !form.account_name.trim() ||
      !form.account_number.trim()
    ) {
      return 'Enter the bank name, account name and account number.';
    }
  }

  if (method === 'link') {
    if (!form.payment_link.trim()) {
      return 'Enter the payment link your clients should use.';
    }

    try {
      const url = new URL(form.payment_link.trim());

      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return 'The payment link must use HTTP or HTTPS.';
      }
    } catch {
      return 'Enter a valid payment link beginning with https:// or http://.';
    }
  }

  if (method === 'mobile_money') {
    if (!form.mobile_money_number.trim() || !form.account_name.trim()) {
      return 'Enter the mobile money number and the account name.';
    }
  }

  if (method === 'instructions' && !form.instructions.trim()) {
    return 'Enter the payment instructions your clients should follow.';
  }

  return null;
}

export default function PaymentSettingsPage() {
  const [profiles, setProfiles] = useState<PaymentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PaymentProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [method, setMethod] = useState<PaymentMethod>('bank');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [showStepUp, setShowStepUp] = useState(false);
  const [stepUpCode, setStepUpCode] = useState('');
  const [stepUpError, setStepUpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [pendingStepUp, setPendingStepUp] = useState<PendingStepUp | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<PaymentProfile | null>(null);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 4000);
  };

  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const response = await fetch(`${API_BASE}/payments/profiles`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(
          await responseError(response, 'We could not load your payment profiles.'),
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('The payment profiles response was not in the expected format.');
      }

      setProfiles(data.map(normaliseProfile));
    } catch (err) {
      setLoadError(errorText(err, 'We could not load your payment profiles.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const profilesByCurrency = useMemo(() => {
    return CURRENCIES.map((currency) => {
      const currencyProfiles = profiles.filter(
        (profile) => profile.currency === currency.value,
      );

      const defaultProfile = currencyProfiles.find((profile) => profile.is_default);
      const usableDefault = defaultProfile ? profileIsUsable(defaultProfile) : false;

      return {
        ...currency,
        profiles: currencyProfiles,
        defaultProfile,
        configured: Boolean(defaultProfile && usableDefault),
        needsAttention: Boolean(defaultProfile && !usableDefault),
      };
    });
  }, [profiles]);

  const configuredCurrencyCount = profilesByCurrency.filter(
    (currency) => currency.configured,
  ).length;

  const updateForm = <K extends keyof ProfileForm>(
    field: K,
    value: ProfileForm[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openCreateEditor = (currency = 'NGN') => {
    setEditingProfile(null);
    setForm({ ...EMPTY_FORM, currency });
    setMethod('bank');
    setFormError(null);
    setActionError(null);
    setEditorOpen(true);
  };

  const openEditEditor = (profile: PaymentProfile) => {
    setEditingProfile(profile);
    setForm(formFromProfile(profile));
    setMethod(methodFromProfile(profile));
    setFormError(null);
    setActionError(null);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditorOpen(false);
    setEditingProfile(null);
    setForm(EMPTY_FORM);
    setMethod('bank');
    setFormError(null);
  };

  const requestStepUp = async (
    purpose: PendingStepUp['purpose'],
    action: PendingStepUp['action'],
    payload: Record<string, unknown>,
    profileId?: string,
  ) => {
    const response = await fetch(`${API_BASE}/security/step-up/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        purpose,
        resource_type: 'payment_profile',
        resource_id: profileId || null,
        payload,
      }),
    });

    if (!response.ok) {
      throw new Error(
        await responseError(response, 'Could not initiate security verification.'),
      );
    }

    const data = await response.json();

    if (!data.challenge_id) {
      throw new Error('The security service did not return a challenge ID.');
    }

    setPendingStepUp({
      challengeId: data.challenge_id,
      purpose,
      action,
      profileId,
      payload,
      resumeEditor: action !== 'delete',
    });

    setStepUpCode(data.code || '');
    setStepUpError(null);
    setEditorOpen(false);
    setShowStepUp(true);
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm(form, method);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      setActionError(null);

      if (editingProfile) {
        const changes = formToPayload(form, method);

        await requestStepUp(
          'payment_profile_update',
          'update',
          {
            profile_id: editingProfile.id,
            changes,
          },
          editingProfile.id,
        );
      } else {
        const payload = formToPayload(form, method);

        await requestStepUp(
          'payment_profile_create',
          'create',
          payload,
        );
      }
    } catch (err) {
      setFormError(errorText(err, 'We could not start this payment profile update.'));
    } finally {
      setSaving(false);
    }
  };

  const handleMakeDefault = async (profile: PaymentProfile) => {
    if (profile.is_default) return;

    const changes = { is_default: true };

    try {
      setActionError(null);

      await requestStepUp(
        'payment_profile_update',
        'update',
        {
          profile_id: profile.id,
          changes,
        },
        profile.id,
      );
    } catch (err) {
      setActionError(errorText(err, 'We could not change the default profile.'));
    }
  };

  const handleRequestDelete = (profile: PaymentProfile) => {
    setProfileToDelete(profile);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!profileToDelete) return;

    const profile = profileToDelete;

    try {
      setActionError(null);

      await requestStepUp(
        'payment_profile_delete',
        'delete',
        { profile_id: profile.id },
        profile.id,
      );

      setShowDeleteConfirm(false);
      setProfileToDelete(null);
    } catch (err) {
      setActionError(errorText(err, 'We could not start the deletion process.'));
    }
  };

  const handleVerifyStepUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!pendingStepUp || stepUpCode.trim().length !== 6) return;

    try {
      setVerifying(true);
      setStepUpError(null);

      const verifyResponse = await fetch(`${API_BASE}/security/step-up/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          challenge_id: pendingStepUp.challengeId,
          code: stepUpCode.trim(),
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error(
          await responseError(
            verifyResponse,
            'Invalid or expired verification code. Check the code and try again.',
          ),
        );
      }

      let mutationResponse: Response;

      if (pendingStepUp.action === 'create') {
        mutationResponse = await fetch(`${API_BASE}/payments/profiles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Security-Challenge-ID': pendingStepUp.challengeId,
          },
          credentials: 'include',
          body: JSON.stringify(pendingStepUp.payload),
        });
      } else if (pendingStepUp.action === 'update') {
        const profileId = pendingStepUp.profileId;

        if (!profileId) {
          throw new Error('The payment profile ID is missing.');
        }

        const changes = pendingStepUp.payload.changes;

        mutationResponse = await fetch(
          `${API_BASE}/payments/profiles/${profileId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-Security-Challenge-ID': pendingStepUp.challengeId,
            },
            credentials: 'include',
            body: JSON.stringify(changes),
          },
        );
      } else {
        const profileId = pendingStepUp.profileId;

        if (!profileId) {
          throw new Error('The payment profile ID is missing.');
        }

        mutationResponse = await fetch(
          `${API_BASE}/payments/profiles/${profileId}`,
          {
            method: 'DELETE',
            headers: {
              'X-Security-Challenge-ID': pendingStepUp.challengeId,
            },
            credentials: 'include',
          },
        );
      }

      if (!mutationResponse.ok) {
        throw new Error(
          await responseError(
            mutationResponse,
            'The payment profile could not be updated.',
          ),
        );
      }

      const completedAction = pendingStepUp.action;

      setShowStepUp(false);
      setPendingStepUp(null);
      setStepUpCode('');
      setStepUpError(null);

      if (completedAction === 'delete') {
        showNotice('Payment profile deleted.');
      } else if (completedAction === 'create') {
        setEditorOpen(false);
        setEditingProfile(null);
        setForm(EMPTY_FORM);
        showNotice('Payment profile created.');
      } else {
        setEditorOpen(false);
        setEditingProfile(null);
        setForm(EMPTY_FORM);
        showNotice('Payment profile updated.');
      }

      await loadProfiles();
    } catch (err) {
      // The challenge may already have been consumed after successful OTP
      // verification. Do not retry the mutation using the same challenge.
      setShowStepUp(false);
      setPendingStepUp(null);
      setStepUpCode('');
      setActionError(errorText(err, 'The payment profile update failed.'));

      if (pendingStepUp.resumeEditor) {
        setEditorOpen(true);
      }
    } finally {
      setVerifying(false);
    }
  };

  const closeStepUp = () => {
    if (verifying) return;

    const shouldResumeEditor = Boolean(pendingStepUp?.resumeEditor);

    setShowStepUp(false);
    setPendingStepUp(null);
    setStepUpCode('');
    setStepUpError(null);

    if (shouldResumeEditor) {
      setEditorOpen(true);
    }
  };

  const getProfileTitle = (profile: PaymentProfile) => {
    if (profile.bank_name) return profile.bank_name;
    if (profile.payment_link) return 'Payment link';
    if (profile.mobile_money_number) return 'Mobile money';
    return 'Payment instructions';
  };

  const getProfileSubtitle = (profile: PaymentProfile) => {
    const details: string[] = [];

    if (profile.account_name) details.push(profile.account_name);

    if (profile.account_number) {
      const account = profile.account_number;
      details.push(`•••• ${account.slice(-4)}`);
    }

    if (profile.mobile_money_number) {
      details.push(profile.mobile_money_number);
    }

    return details.join(' · ');
  };

  return (
    <PageContainer width="form">
      <div className="space-y-2">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-caption font-bold text-text-soft hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to settings
        </Link>

        <PageHeader
          title="Get paid"
          description="Set up the payment instructions your clients will use to pay your invoices."
        />
      </div>

      {notice && (
        <Alert variant="success" dismissible onDismiss={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      {actionError && (
        <Alert variant="error" dismissible onDismiss={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <div className="border-brut-thin border-ink bg-surface-sunken p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
              Currency coverage
            </p>
            <p className="mt-1 text-title text-text">
              {configuredCurrencyCount} of {CURRENCIES.length} currencies configured
            </p>
            <p className="mt-1 text-body text-text-soft">
              A currency is ready when it has a usable default payment profile.
            </p>
          </div>

          <Button type="button" onClick={() => openCreateEditor()}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add payment profile
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-heading text-text">Payment methods by currency</h2>
          <p className="mt-1 text-body text-text-soft">
            You can add more than one profile for a currency. Choose one as the default.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3" aria-label="Loading payment profiles">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-28 animate-pulse bg-surface-tint" />
            ))}
          </div>
        ) : loadError ? (
          <div className="space-y-3">
            <Alert variant="error">{loadError}</Alert>
            <Button type="button" variant="outline" onClick={() => void loadProfiles()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {profilesByCurrency.map((currency) => (
              <section
                key={currency.value}
                className="border-brut border-ink bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-label font-extrabold text-text">
                        {currency.value}
                      </h3>

                      {currency.configured ? (
                        <span className="rounded-full bg-status-paid px-2 py-0.5 text-caption font-extrabold text-status-paid-fg">
                          Ready
                        </span>
                      ) : currency.needsAttention ? (
                        <span className="rounded-full bg-status-late px-2 py-0.5 text-caption font-extrabold text-status-late-fg">
                          Needs attention
                        </span>
                      ) : (
                        <span className="rounded-full bg-surface-tint px-2 py-0.5 text-caption font-extrabold text-text-muted">
                          Not set
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-caption text-text-muted">
                      {currency.label}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openCreateEditor(currency.value)}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add profile
                  </Button>
                </div>

                {currency.profiles.length === 0 ? (
                  <div className="mt-4 border border-dashed border-line-subtle p-4">
                    <p className="text-body text-text-soft">
                      No payment instructions have been added for this currency.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {currency.profiles.map((profile) => {
                      const usable = profileIsUsable(profile);
                      const methods = profileMethods(profile);

                      return (
                        <article
                          key={profile.id}
                          className="border-brut-thin border-ink p-3"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-extrabold text-text">
                                  {getProfileTitle(profile)}
                                </p>

                                {profile.is_default && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-peach-chip px-2 py-0.5 text-caption font-extrabold text-text-soft">
                                    <Star className="h-3 w-3" aria-hidden="true" />
                                    Default
                                  </span>
                                )}

                                {!usable && (
                                  <span className="rounded-full bg-status-late px-2 py-0.5 text-caption font-extrabold text-status-late-fg">
                                    Incomplete
                                  </span>
                                )}
                              </div>

                              {getProfileSubtitle(profile) && (
                                <p className="mt-1 text-body text-text-soft">
                                  {getProfileSubtitle(profile)}
                                </p>
                              )}

                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {methods.map((method) => (
                                  <span
                                    key={method}
                                    className="rounded-full bg-surface-tint px-2 py-1 text-caption font-bold text-text-soft"
                                  >
                                    {method}
                                  </span>
                                ))}
                              </div>

                              {profile.payment_link && (
                                <a
                                  href={profile.payment_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 inline-flex max-w-full items-center gap-1 break-all text-caption font-bold text-link hover:underline"
                                >
                                  {profile.payment_link}
                                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                                </a>
                              )}

                              {profile.instructions && (
                                <p className="mt-2 whitespace-pre-wrap text-caption text-text-muted">
                                  {profile.instructions}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                              {!profile.is_default && usable && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => void handleMakeDefault(profile)}
                                >
                                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                  Make default
                                </Button>
                              )}

                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => openEditEditor(profile)}
                              >
                                Edit
                              </Button>

                              <Button
                                type="button"
                                variant="danger"
                                onClick={() => handleRequestDelete(profile)}
                                aria-label={`Delete ${currency.value} payment profile`}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>

      <FormSection
        icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
        title="Payment information security"
        description="Sensitive payment-profile changes require an additional security check."
      >
        <p className="text-body text-text-soft">
          Bagg uses a six-digit email verification code when you create, edit or delete
          payment profiles. Your payment profiles are client-facing payment
          instructions. They do not connect a Paystack merchant account and are
          separate from your Bagg subscription payments.
        </p>
      </FormSection>

      <Dialog
        open={editorOpen}
        onClose={closeEditor}
        title={editingProfile ? 'Edit payment profile' : 'Add payment profile'}
      >
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <p className="text-body text-text-soft">
            Each profile uses one payment method. Add another profile if you need
            a different method for the same currency.
          </p>

          <BaggSelect
            label="Currency"
            value={form.currency}
            onChange={(value) => updateForm('currency', value)}
            options={CURRENCIES}
          />

          <RadioGroup
            label="Payment method"
            value={method}
            onChange={(value) => {
              setMethod(value as PaymentMethod);
              setFormError(null);
            }}
            variant="cards"
            columns={2}
            options={PAYMENT_METHODS.map(
              ({ value, label, description, icon }) => ({
                value,
                label,
                description,
                icon,
              }),
            )}
          />

          {method === 'bank' && (
            <FormSubsection title="Bank details">
              <TextField
                label="Bank name"
                required
                placeholder="e.g. Guaranty Trust Bank"
                value={form.bank_name}
                onChange={(event) => updateForm('bank_name', event.target.value)}
              />

              <FormGrid>
                <TextField
                  label="Account name"
                  required
                  placeholder="e.g. Ada Okafor"
                  value={form.account_name}
                  onChange={(event) =>
                    updateForm('account_name', event.target.value)
                  }
                />

                <TextField
                  label="Account number or IBAN"
                  required
                  placeholder="e.g. 0123456789"
                  value={form.account_number}
                  onChange={(event) =>
                    updateForm('account_number', event.target.value)
                  }
                  className="font-mono"
                />
              </FormGrid>

              <TextField
                label="Routing number, sort code or SWIFT"
                optional
                placeholder="e.g. GTBINGLA"
                value={form.routing_number}
                onChange={(event) =>
                  updateForm('routing_number', event.target.value)
                }
                className="font-mono"
              />
            </FormSubsection>
          )}

          {method === 'link' && (
            <FormSubsection title="Payment link">
              <TextField
                label="Payment URL"
                required
                type="url"
                placeholder="https://..."
                value={form.payment_link}
                onChange={(event) =>
                  updateForm('payment_link', event.target.value)
                }
              />
            </FormSubsection>
          )}

          {method === 'mobile_money' && (
            <FormSubsection title="Mobile money details">
              <FormGrid>
                <TextField
                  label="Account name"
                  required
                  placeholder="e.g. Ada Okafor"
                  value={form.account_name}
                  onChange={(event) =>
                    updateForm('account_name', event.target.value)
                  }
                />

                <PhoneField
                  label="Mobile money number"
                  required
                  placeholder="e.g. +233 24 123 4567"
                  value={form.mobile_money_number}
                  onChange={(event) =>
                    updateForm('mobile_money_number', event.target.value)
                  }
                />
              </FormGrid>
            </FormSubsection>
          )}

          <TextArea
            label={
              method === 'instructions'
                ? 'Payment instructions'
                : 'Additional payment instructions'
            }
            required={method === 'instructions'}
            optional={method !== 'instructions'}
            rows={3}
            hint={
              method === 'instructions'
                ? 'Shown to your client on the invoice.'
                : undefined
            }
            placeholder="e.g. Include the invoice number in the transfer reference."
            value={form.instructions}
            onChange={(event) => updateForm('instructions', event.target.value)}
          />

          <Checkbox
            label={`Use this as the default ${form.currency} payment profile`}
            checked={form.is_default}
            onChange={(checked) => updateForm('is_default', checked)}
          />

          {formError && <Alert variant="error">{formError}</Alert>}

          <div className="flex justify-end gap-2 border-t border-line-subtle pt-4">
            <Button type="button" variant="outline" onClick={closeEditor}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Continue to verification
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete payment profile?"
      >
        <div className="space-y-4">
          <p className="text-body text-text-soft">
            {profileToDelete
              ? `You are about to delete the ${profileToDelete.currency} profile "${getProfileTitle(profileToDelete)}". This action cannot be undone.`
              : 'This payment profile will be deleted.'}
          </p>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setProfileToDelete(null);
              }}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="danger"
              onClick={() => void handleConfirmDelete()}
              disabled={!profileToDelete}
            >
              Continue
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={showStepUp}
        onClose={closeStepUp}
        title="Security verification"
      >
        <form onSubmit={handleVerifyStepUp} className="space-y-4">
          <div className="flex items-center gap-2 text-text">
            <ShieldCheck className="h-5 w-5 text-mango" />
            <p className="text-body font-bold">Confirm payment profile change</p>
          </div>

          <p className="text-caption text-text-soft">
            Enter the six-digit verification code sent to your account email.
          </p>

          <OtpField
            id="paymentProfileStepUpCode"
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
              onClick={closeStepUp}
              disabled={verifying}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              loading={verifying}
              disabled={stepUpCode.trim().length !== 6 || !pendingStepUp}
            >
              Verify and continue
            </Button>
          </div>
        </form>
      </Dialog>
    </PageContainer>
  );
}
