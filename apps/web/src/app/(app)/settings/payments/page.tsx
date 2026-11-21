
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  CircleAlert,
  ExternalLink,
  FileText,
  Globe,
  Landmark,
  LoaderCircle,
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
  Card,
  Checkbox,
  Dialog,
  DialogFooter,
  FormGrid,
  FormSection,
  FormSubsection,
  OtpField,
  PageContainer,
  PageHeader,
  PhoneField,
  RadioGroup,
  StatCard,
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

interface PendingStepUp {
  challengeId: string;
  purpose:
    | 'payment_profile_create'
    | 'payment_profile_update'
    | 'payment_profile_delete';
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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank transfer',
  payment_link: 'Payment link',
  mobile_money: 'Mobile money',
  instructions: 'Payment instructions',
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

function methodFromProfile(profile: PaymentProfile): PaymentMethod {
  if (profile.bank_name || profile.account_number) return 'bank';
  if (profile.payment_link) return 'link';
  if (profile.mobile_money_number) return 'mobile_money';
  return 'instructions';
}

function profileMethods(profile: PaymentProfile): string[] {
  if (Array.isArray(profile.methods)) {
    return profile.methods.map(
      (method) => PAYMENT_METHOD_LABELS[method] ?? method,
    );
  }

  // Compatibility fallback for API responses that do not yet expose methods.
  const methods: string[] = [];

  if (profile.bank_name || profile.account_number) {
    methods.push('Bank transfer');
  }

  if (profile.payment_link) {
    methods.push('Payment link');
  }

  if (profile.mobile_money_number) {
    methods.push('Mobile money');
  }

  if (profile.instructions && methods.length === 0) {
    methods.push('Payment instructions');
  }

  return methods;
}

function profileIsUsable(profile: PaymentProfile): boolean {
  if (typeof profile.is_usable === 'boolean') {
    return profile.is_usable;
  }

  // Compatibility fallback for older API responses.
  const bankValues = [
    profile.bank_name,
    profile.account_name,
    profile.account_number,
  ];

  const hasAnyBankValue = bankValues.some((value) =>
    Boolean(value?.trim()),
  );

  const hasCompleteBank = bankValues.every((value) =>
    Boolean(value?.trim()),
  );

  if (hasAnyBankValue && !hasCompleteBank) {
    return false;
  }

  const hasLink = Boolean(profile.payment_link?.trim());

  if (hasLink) {
    try {
      const url = new URL(profile.payment_link!);

      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return false;
      }
    } catch {
      return false;
    }
  }

  const hasMobile = Boolean(profile.mobile_money_number?.trim());

  if (hasMobile && !profile.account_name?.trim()) {
    return false;
  }

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
    account_number:
      method === 'bank' ? form.account_number.trim() || null : null,
    routing_number:
      method === 'bank' ? form.routing_number.trim() || null : null,
    payment_link: method === 'link' ? form.payment_link.trim() || null : null,
    mobile_money_number:
      method === 'mobile_money'
        ? form.mobile_money_number.trim() || null
        : null,
    instructions: form.instructions.trim() || null,
    is_default: form.is_default,
  };
}

function validateForm(
  form: ProfileForm,
  method: PaymentMethod,
): string | null {
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
    if (
      !form.mobile_money_number.trim() ||
      !form.account_name.trim()
    ) {
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
  const [editingProfile, setEditingProfile] =
    useState<PaymentProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [method, setMethod] = useState<PaymentMethod>('bank');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [showStepUp, setShowStepUp] = useState(false);
  const [stepUpCode, setStepUpCode] = useState('');
  const [stepUpError, setStepUpError] = useState<string | null>(null);
  const [requestingStepUp, setRequestingStepUp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [pendingStepUp, setPendingStepUp] =
    useState<PendingStepUp | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [profileToDelete, setProfileToDelete] =
    useState<PaymentProfile | null>(null);

  const busy = requestingStepUp || verifying;

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
          await responseError(
            response,
            'We could not load your payment profiles.',
          ),
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          'The payment profiles response was not in the expected format.',
        );
      }

      setProfiles(data.map(normaliseProfile));
    } catch (err) {
      setLoadError(
        errorText(err, 'We could not load your payment profiles.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const profilesByCurrency = useMemo(
    () =>
      CURRENCIES.map((currency) => {
        const currencyProfiles = profiles.filter(
          (profile) => profile.currency === currency.value,
        );

        const defaultProfile = currencyProfiles.find(
          (profile) => profile.is_default,
        );

        const usableDefault = defaultProfile
          ? profileIsUsable(defaultProfile)
          : false;

        return {
          ...currency,
          profiles: currencyProfiles,
          defaultProfile,
          configured: Boolean(defaultProfile && usableDefault),
          needsAttention: Boolean(defaultProfile && !usableDefault),
        };
      }),
    [profiles],
  );

  const configuredCurrencyCount = profilesByCurrency.filter(
    (currency) => currency.configured,
  ).length;

  const incompleteProfileCount = profiles.filter(
    (profile) => !profileIsUsable(profile),
  ).length;

  const updateForm = <K extends keyof ProfileForm>(
    field: K,
    value: ProfileForm[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openCreateEditor = (currency = 'NGN') => {
    if (busy || saving) return;

    setEditingProfile(null);
    setForm({ ...EMPTY_FORM, currency });
    setMethod('bank');
    setFormError(null);
    setActionError(null);
    setEditorOpen(true);
  };

  const openEditEditor = (profile: PaymentProfile) => {
    if (busy || saving) return;

    setEditingProfile(profile);
    setForm(formFromProfile(profile));
    setMethod(methodFromProfile(profile));
    setFormError(null);
    setActionError(null);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (saving || busy) return;

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
    if (requestingStepUp || verifying) {
      return;
    }

    setRequestingStepUp(true);

    try {
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
          await responseError(
            response,
            'Could not initiate security verification.',
          ),
        );
      }

      const data = await response.json();

      if (!data.challenge_id) {
        throw new Error(
          'The security service did not return a challenge ID.',
        );
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
    } finally {
      setRequestingStepUp(false);
    }
  };

  const handleSaveProfile = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
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
        await requestStepUp(
          'payment_profile_create',
          'create',
          formToPayload(form, method),
        );
      }
    } catch (err) {
      setFormError(
        errorText(err, 'We could not start this payment profile update.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleMakeDefault = async (profile: PaymentProfile) => {
    if (profile.is_default || busy) return;

    try {
      setActionError(null);

      await requestStepUp(
        'payment_profile_update',
        'update',
        {
          profile_id: profile.id,
          changes: { is_default: true },
        },
        profile.id,
      );
    } catch (err) {
      setActionError(
        errorText(err, 'We could not change the default profile.'),
      );
    }
  };

  const handleRequestDelete = (profile: PaymentProfile) => {
    if (busy) return;

    setProfileToDelete(profile);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!profileToDelete || busy) return;

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
      setActionError(
        errorText(err, 'We could not start the deletion process.'),
      );
    }
  };

  const handleVerifyStepUp = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!pendingStepUp || stepUpCode.trim().length !== 6 || verifying) {
      return;
    }

    try {
      setVerifying(true);
      setStepUpError(null);

      const verifyResponse = await fetch(
        `${API_BASE}/security/step-up/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            challenge_id: pendingStepUp.challengeId,
            code: stepUpCode.trim(),
          }),
        },
      );

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

        mutationResponse = await fetch(
          `${API_BASE}/payments/profiles/${profileId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-Security-Challenge-ID': pendingStepUp.challengeId,
            },
            credentials: 'include',
            body: JSON.stringify(pendingStepUp.payload.changes),
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
      // A challenge may already have been consumed. Never retry the
      // mutation with the same challenge ID.
      setShowStepUp(false);
      setPendingStepUp(null);
      setStepUpCode('');

      setActionError(
        errorText(err, 'The payment profile update failed.'),
      );

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

    if (profile.account_name) {
      details.push(profile.account_name);
    }

    if (profile.account_number) {
      details.push(`•••• ${profile.account_number.slice(-4)}`);
    }

    if (profile.mobile_money_number) {
      details.push(profile.mobile_money_number);
    }

    return details.join(' · ');
  };

  return (
    <PageContainer width="wide">
      <div className="space-y-5">
        <Link
          href="/settings"
          className="inline-flex min-h-11 items-center gap-2 text-caption font-bold text-text-soft transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to settings
        </Link>

        <PageHeader
          eyebrow="Workspace settings"
          title="Get paid"
          description="Manage the payment methods and instructions your clients see when they pay your invoices."
          actions={
            <Button
              type="button"
              zone="expressive"
              onClick={() => openCreateEditor()}
              disabled={busy || saving}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add payment profile
            </Button>
          }
        />

        {notice && (
          <Alert
            variant="success"
            dismissible
            onDismiss={() => setNotice(null)}
          >
            {notice}
          </Alert>
        )}

        {actionError && (
          <Alert
            variant="error"
            dismissible
            onDismiss={() => setActionError(null)}
          >
            {actionError}
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Currencies ready"
            value={`${configuredCurrencyCount} / ${CURRENCIES.length}`}
            description="Usable default profiles"
            icon={<Globe />}
            zone="expressive"
          />

          <StatCard
            label="Payment profiles"
            value={profiles.length}
            description="Across all currencies"
            icon={<Landmark />}
          />

          <StatCard
            label="Needs attention"
            value={incompleteProfileCount}
            description="Incomplete or invalid profiles"
            icon={<CircleAlert />}
          />
        </div>

        <FormSection
          title="Payment methods by currency"
          description="Each currency can have multiple payment profiles, with one selected as its default."
        >
          {loading ? (
            <div
              className="space-y-3"
              aria-label="Loading payment profiles"
              aria-busy="true"
            >
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse border-brut-thin border-ink bg-surface-tint motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : loadError ? (
            <div className="space-y-3">
              <Alert variant="error">{loadError}</Alert>

              <Button
                type="button"
                variant="outline"
                onClick={() => void loadProfiles()}
              >
                Try again
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {profilesByCurrency.map((currency) => (
                <section
                  key={currency.value}
                  aria-labelledby={`currency-${currency.value}`}
                  className="border-brut-thin border-ink bg-surface p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          id={`currency-${currency.value}`}
                          className="text-heading font-extrabold text-text"
                        >
                          {currency.value}
                        </h3>

                        {currency.configured ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-status-paid px-2.5 py-1 text-caption font-bold text-status-paid-fg">
                            <Check
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Ready
                          </span>
                        ) : currency.needsAttention ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-status-late px-2.5 py-1 text-caption font-bold text-status-late-fg">
                            <CircleAlert
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Needs attention
                          </span>
                        ) : (
                          <span className="rounded-full bg-surface-tint px-2.5 py-1 text-caption font-bold text-text-muted">
                            Not configured
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
                      disabled={busy || saving}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Add {currency.value} profile
                    </Button>
                  </div>

                  {currency.profiles.length === 0 ? (
                    <div className="mt-4 border border-dashed border-line-subtle bg-surface-sunken p-4">
                      <p className="text-body text-text-soft">
                        No payment instructions have been added for this
                        currency.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {currency.profiles.map((profile) => {
                        const usable = profileIsUsable(profile);
                        const methods = profileMethods(profile);
                        const profileTitle = getProfileTitle(profile);

                        return (
                          <Card
                            key={profile.id}
                            zone="calm"
                            className="p-3 sm:p-4"
                          >
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="font-extrabold text-text">
                                      {profileTitle}
                                    </h4>

                                    {profile.is_default && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-peach-chip px-2.5 py-1 text-caption font-bold text-text">
                                        <Star
                                          className="h-3.5 w-3.5"
                                          aria-hidden="true"
                                        />
                                        Default
                                      </span>
                                    )}

                                    {!usable && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-status-late px-2.5 py-1 text-caption font-bold text-status-late-fg">
                                        <CircleAlert
                                          className="h-3.5 w-3.5"
                                          aria-hidden="true"
                                        />
                                        Incomplete
                                      </span>
                                    )}
                                  </div>

                                  {getProfileSubtitle(profile) && (
                                    <p className="mt-1 break-words text-body text-text-soft">
                                      {getProfileSubtitle(profile)}
                                    </p>
                                  )}

                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {methods.map((item) => (
                                      <span
                                        key={item}
                                        className="rounded-full bg-surface-tint px-2.5 py-1 text-caption font-semibold text-text-soft"
                                      >
                                        {item}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                  {!profile.is_default && usable && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="md"
                                      onClick={() =>
                                        void handleMakeDefault(profile)
                                      }
                                      disabled={busy || saving}
                                    >
                                      <Check
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                      />
                                      Make default
                                    </Button>
                                  )}

                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="md"
                                    onClick={() => openEditEditor(profile)}
                                    disabled={busy || saving}
                                    aria-label={`Edit ${currency.value} payment profile: ${profileTitle}`}
                                  >
                                    Edit
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="danger"
                                    size="md"
                                    onClick={() => handleRequestDelete(profile)}
                                    disabled={busy || saving}
                                    aria-label={`Delete ${currency.value} payment profile: ${profileTitle}`}
                                  >
                                    <Trash2
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    />
                                  </Button>
                                </div>
                              </div>

                              {(profile.payment_link || profile.instructions) && (
                                <div className="border-t border-line-subtle pt-3">
                                  {profile.payment_link && (
                                    <a
                                      href={profile.payment_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex max-w-full items-center gap-1 break-all text-caption font-bold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                                    >
                                      {profile.payment_link}

                                      <ExternalLink
                                        className="h-3.5 w-3.5 shrink-0"
                                        aria-hidden="true"
                                      />

                                      <span className="sr-only">
                                        (opens in a new tab)
                                      </span>
                                    </a>
                                  )}

                                  {profile.instructions && (
                                    <p className="mt-2 whitespace-pre-wrap text-caption text-text-muted">
                                      {profile.instructions}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </FormSection>

        <FormSection
          icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          title="Payment information security"
          description="Sensitive payment-profile changes require an additional security check."
        >
          <div className="flex items-start gap-3">
            <ShieldCheck
              className="mt-0.5 h-5 w-5 shrink-0 text-text-muted"
              aria-hidden="true"
            />

            <p className="text-body text-text-soft">
              Bagg uses a six-digit email verification code when you create,
              edit or delete payment profiles. Your payment profiles are
              client-facing payment instructions. They do not connect a
              Paystack merchant account and are separate from your Bagg
              subscription payments.
            </p>
          </div>
        </FormSection>
      </div>

      {/* Create / edit profile */}
      <Dialog
        open={editorOpen}
        onClose={closeEditor}
        title={editingProfile ? 'Edit payment profile' : 'Add payment profile'}
        description="Configure how clients can pay invoices in this currency."
        className="max-w-[640px]"
      >
        <form onSubmit={handleSaveProfile} className="space-y-5">
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
                onChange={(event) =>
                  updateForm('bank_name', event.target.value)
                }
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
            onChange={(event) =>
              updateForm('instructions', event.target.value)
            }
          />

          <Checkbox
            label={`Use this as the default ${form.currency} payment profile`}
            checked={form.is_default}
            onChange={(checked) => updateForm('is_default', checked)}
          />

          {formError && <Alert variant="error">{formError}</Alert>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeEditor}
              disabled={saving || busy}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              loading={saving}
              disabled={saving || busy}
            >
              Continue to verification
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => {
          if (!busy) {
            setShowDeleteConfirm(false);
          }
        }}
        title="Delete payment profile?"
        description="This action cannot be undone."
      >
        <div className="space-y-4">
          <p className="text-body text-text-soft">
            {profileToDelete
              ? `You are about to delete the ${profileToDelete.currency} profile "${getProfileTitle(profileToDelete)}".`
              : 'This payment profile will be deleted.'}
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setProfileToDelete(null);
              }}
              disabled={busy}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="danger"
              onClick={() => void handleConfirmDelete()}
              disabled={!profileToDelete || busy}
              loading={requestingStepUp}
            >
              Continue
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* Step-up verification */}
      <Dialog
        open={showStepUp}
        onClose={closeStepUp}
        title="Security verification"
        description="A six-digit verification code has been sent to your account email. The code expires after five minutes."
      >
        <form onSubmit={handleVerifyStepUp} className="space-y-4">
          <div className="flex items-center gap-3 border-brut-thin border-ink bg-surface-sunken p-3">
            <ShieldCheck
              className="h-6 w-6 shrink-0 text-mango"
              aria-hidden="true"
            />

            <div>
              <p className="font-bold text-text">
                Verify your identity
              </p>

              <p className="text-caption text-text-muted">
                Enter the six-digit code sent to your account email.
              </p>
            </div>
          </div>

          <OtpField
            id="paymentProfileStepUpCode"
            label="Verification code"
            length={6}
            placeholder="123456"
            value={stepUpCode}
            onChange={setStepUpCode}
          />

          {stepUpError && (
            <Alert variant="error">{stepUpError}</Alert>
          )}

          <DialogFooter>
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
              disabled={
                stepUpCode.trim().length !== 6 ||
                !pendingStepUp ||
                verifying
              }
            >
              Verify and continue
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </PageContainer>
  );
}
