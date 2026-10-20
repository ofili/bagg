'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  CreditCard,
  Bell,
  Save,
  Check,
  Loader2,
  Plus,
  Trash2,
  Smartphone,
  Globe,
  Landmark,
  X,
  AlertCircle,
  Zap,
  Sparkles,
  ShieldCheck,
  Coins,
  RefreshCw,
  ExternalLink,
  Download,
  FileSpreadsheet,
  FileArchive,
  AlertTriangle,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

const SUPPORTED_CURRENCIES = [
  { code: 'NGN', label: '🇳🇬 NGN (Nigerian Naira)' },
  { code: 'USD', label: '🇺🇸 USD (US Dollar)' },
  { code: 'GBP', label: '🇬🇧 GBP (British Pound)' },
  { code: 'EUR', label: '🇪🇺 EUR (Euro)' },
  { code: 'GHS', label: '🇬🇭 GHS (Ghanaian Cedi)' },
  { code: 'KES', label: '🇰🇪 KES (Kenyan Shilling)' },
  { code: 'ZAR', label: '🇿🇦 ZAR (South African Rand)' },
];

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState('Studio Bagg Creative Ltd');
  const [taxId, setTaxId] = useState('TIN-98765432-0001');
  const [brandColor, setBrandColor] = useState('#10B981');
  const [defaultCurrency, setDefaultCurrency] = useState('NGN');
  const [country, setCountry] = useState('NG');
  const [address, setAddress] = useState('12 Adeola Odeku St, Victoria Island, Lagos');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Payment profiles state
  const [profiles, setProfiles] = useState<PaymentProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [addingProfile, setAddingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  // New Profile Form State
  const [channelType, setChannelType] = useState<'bank' | 'digital' | 'mobile_money'>('bank');
  const [newCurrency, setNewCurrency] = useState('NGN');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isDefault, setIsDefault] = useState(true);

  // Subscription & Credits state (US-SUB-01 - US-SUB-06)
  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);
  const [loadingBilling, setLoadingBilling] = useState(true);
  const [billingActionLoading, setBillingActionLoading] = useState(false);
  const [billingSuccessMsg, setBillingSuccessMsg] = useState<string | null>(null);

  const fetchBilling = async () => {
    try {
      setLoadingBilling(true);
      const [subRes, credRes] = await Promise.all([
        fetch(`${API_BASE}/billing/subscription`, { credentials: 'include' }),
        fetch(`${API_BASE}/billing/credits`, { credentials: 'include' }),
      ]);
      if (subRes.ok) {
        setSubData(await subRes.json());
      }
      if (credRes.ok) {
        setCreditsData(await credRes.json());
      }
    } catch {
      // Dev/offline fallback
    } finally {
      setLoadingBilling(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      setBillingActionLoading(true);
      setErrorMessage(null);
      const res = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          plan_code: 'creator_pro_monthly',
          callback_url: window.location.href,
        }),
      });
      if (!res.ok) throw new Error('Could not initialize checkout');
      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Checkout failed');
    } finally {
      setBillingActionLoading(false);
    }
  };

  const handleBuyCredits = async () => {
    try {
      setBillingActionLoading(true);
      setErrorMessage(null);
      const res = await fetch(`${API_BASE}/billing/credits/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pack_size: 200 }),
      });
      if (!res.ok) throw new Error('Could not purchase credits');
      const updated = await res.json();
      setCreditsData(updated);
      setBillingSuccessMsg('Pack of 200 credits purchased successfully! (₦2,000)');
      setTimeout(() => setBillingSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Purchase failed');
    } finally {
      setBillingActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel auto-renewal? You will keep Creator Pro benefits until your period ends.')) {
      return;
    }
    try {
      setBillingActionLoading(true);
      setErrorMessage(null);
      const res = await fetch(`${API_BASE}/billing/subscription/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Cancellation failed');
      const data = await res.json();
      setBillingSuccessMsg(data.message || 'Auto-renewal canceled');
      setTimeout(() => setBillingSuccessMsg(null), 4000);
      await fetchBilling();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel subscription');
    } finally {
      setBillingActionLoading(false);
    }
  };

  // Data Rights & Account Deletion (Lifecycle 12)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deletePhrase !== 'DELETE MY ACCOUNT') {
      alert("Please type 'DELETE MY ACCOUNT' exactly to confirm.");
      return;
    }
    try {
      setDeletingAccount(true);
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
        const err = await res.json();
        throw new Error(err.detail || 'Failed to delete account');
      }
      alert('Your account and all associated data have been permanently deleted in compliance with NDPA 2023.');
      window.location.href = '/login';
    } catch (err: any) {
      alert(err.message || 'Deletion failed');
    } finally {
      setDeletingAccount(false);
    }
  };

  // Load workspace details & payment profiles
  const fetchProfiles = async () => {
    try {
      setLoadingProfiles(true);
      const res = await fetch(`${API_BASE}/payments/profiles`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      }
    } catch {
      // Offline / dev fallback
    } finally {
      setLoadingProfiles(false);
    }
  };

  useEffect(() => {
    // Fetch active workspace
    fetch(`${API_BASE}/workspaces/current`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.business_name) {
          setBusinessName(data.business_name);
          setTaxId(data.tax_id || '');
          setBrandColor(data.brand_color || '#10B981');
          setDefaultCurrency(data.default_currency || 'NGN');
          setCountry(data.country || 'NG');
          setAddress(data.address || '');
        }
      })
      .catch(() => {});

    fetchProfiles();
    fetchBilling();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setErrorMessage(null);

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

      if (!res.ok) throw new Error('Failed to save profile changes');

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving changes');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreatePaymentProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingProfile(true);
    setErrorMessage(null);

    const payload: Record<string, any> = {
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
    } else if (channelType === 'mobile_money') {
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
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to create payment profile');
      }

      setShowAddProfileModal(false);
      // Reset form
      setBankName('');
      setAccountName('');
      setAccountNumber('');
      setRoutingNumber('');
      setPaymentLink('');
      setMobileMoneyNumber('');
      setInstructions('');
      setProfileSuccessMsg(`Payment profile for ${newCurrency} added successfully`);
      setTimeout(() => setProfileSuccessMsg(null), 3000);
      await fetchProfiles();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating payment profile');
    } finally {
      setAddingProfile(false);
    }
  };

  const handleDeleteProfile = async (id: string, currency: string) => {
    if (!confirm(`Are you sure you want to delete this payment profile for ${currency}?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/payments/profiles/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setProfileSuccessMsg(`Payment profile deleted.`);
        setTimeout(() => setProfileSuccessMsg(null), 3000);
        await fetchProfiles();
      }
    } catch {
      setErrorMessage('Could not delete payment profile');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
        <p className="text-sm text-neutral-500">Configure your business profile, payment rails, and reminders.</p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Workspace profile saved successfully. Drafts will now use your updated details.</span>
        </div>
      )}

      {profileSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{profileSuccessMsg}</span>
        </div>
      )}

      {billingSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{billingSuccessMsg}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Business Profile (US-ONB-02) */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-xl border p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-base text-neutral-900">Business Profile & Branding</h2>
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
          >
            {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Profile
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Business Name</label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-neutral-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Tax ID / TIN (Optional)</label>
            <input
              type="text"
              placeholder="e.g. TIN-98765432-0001"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-neutral-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Default Invoicing Currency</label>
            <select
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-neutral-800 bg-white"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Brand Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-10 h-9 p-0.5 border rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-xs font-mono text-neutral-800"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-neutral-600 mb-1">Physical / Billing Address</label>
            <input
              type="text"
              placeholder="e.g. 12 Adeola Odeku St, Victoria Island, Lagos"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-neutral-800"
            />
          </div>
        </div>

        <div className="pt-2 text-[11px] text-neutral-400 italic">
          Note: Updating your business profile will apply to new and draft invoices. Invoices already sent preserve their historical snapshot.
        </div>
      </form>

      {/* Subscription & Invoicing Quota (US-SUB-01 - US-SUB-06) */}
      <div className="bg-white rounded-xl border p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="font-bold text-base text-neutral-900">Subscription & Invoicing Quota</h2>
              <p className="text-xs text-neutral-500">
                Track your active tier, free monthly invoice sends, and prepaid credit balance.
              </p>
            </div>
          </div>
          {subData && (
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                subData.is_active && subData.tier !== 'free'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-neutral-100 text-neutral-700 border-neutral-200'
              }`}
            >
              {subData.tier === 'creator_pro'
                ? 'Creator Pro Plan'
                : subData.tier === 'professional'
                ? 'Professional Plan'
                : 'Free Starter Plan'}
            </span>
          )}
        </div>

        {loadingBilling ? (
          <div className="py-6 flex justify-center text-neutral-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Plan Card */}
            <div className="border rounded-xl p-4 bg-neutral-50/50 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Active Plan
                  </span>
                  {subData?.is_active && subData?.tier !== 'free' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {subData.status === 'in_grace_period' ? 'In Grace Period' : 'Active'}
                    </span>
                  ) : (
                    <span className="text-[11px] text-neutral-500 font-medium">Free Meter</span>
                  )}
                </div>

                {subData?.is_active && subData?.tier !== 'free' ? (
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">Creator Pro</h3>
                    <p className="text-xs text-neutral-600 mt-1">
                      Unlimited monthly invoice sends, polite chasing, and watermark-free PDF exports.
                    </p>
                    {subData.current_period_end && (
                      <p className="text-[11px] text-neutral-500 mt-2">
                        {subData.cancel_at_period_end
                          ? `Access active until ${new Date(subData.current_period_end).toLocaleDateString()} (Auto-renewal canceled)`
                          : `Renews on ${new Date(subData.current_period_end).toLocaleDateString()} via Paystack`}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">Free Starter</h3>
                    <p className="text-xs text-neutral-600 mt-1">
                      Includes 3 free invoice deliveries per calendar month.
                    </p>

                    {creditsData && (
                      <div className="mt-3 space-y-1.5">
                        <div className="flex justify-between text-xs font-medium text-neutral-700">
                          <span>Monthly Free Sends</span>
                          <span>{creditsData.free_sends_used_this_month} / {creditsData.free_sends_limit} used</span>
                        </div>
                        <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              creditsData.free_sends_used_this_month >= creditsData.free_sends_limit
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min(100, (creditsData.free_sends_used_this_month / creditsData.free_sends_limit) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t flex flex-wrap gap-2 items-center">
                {subData?.is_active && subData?.tier !== 'free' ? (
                  !subData.cancel_at_period_end && (
                    <button
                      type="button"
                      disabled={billingActionLoading}
                      onClick={handleCancelSubscription}
                      className="text-xs text-red-600 hover:text-red-700 font-medium transition"
                    >
                      {billingActionLoading ? 'Processing...' : 'Cancel Auto-Renewal'}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    disabled={billingActionLoading}
                    onClick={handleUpgrade}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                  >
                    {billingActionLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    Upgrade to Creator Pro (₦12,000 / mo)
                  </button>
                )}
              </div>
            </div>

            {/* Credit Ledger Card (US-SUB-03) */}
            <div className="border rounded-xl p-4 bg-neutral-50/50 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Prepaid Delivery Credits
                  </span>
                  <Coins className="w-4 h-4 text-amber-500" />
                </div>

                <div>
                  <div className="text-2xl font-bold text-neutral-900">
                    {creditsData?.balance ?? 0}
                    <span className="text-xs font-normal text-neutral-500 ml-1.5">credits</span>
                  </div>
                  <p className="text-xs text-neutral-600 mt-1">
                    Prepaid credits fund invoice sends whenever your monthly free quota is exhausted.
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    1 credit = 1 delivery send. Credits never expire and stay attached to your workspace.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t">
                <button
                  type="button"
                  disabled={billingActionLoading}
                  onClick={handleBuyCredits}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                >
                  {billingActionLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  Buy 200 Credits (₦2,000)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Currency Payment Profiles (US-PAY-01, US-PAY-02) */}
      <div className="bg-white rounded-xl border p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="font-bold text-base text-neutral-900">Payment Profiles (By Currency)</h2>
              <p className="text-xs text-neutral-500">Configure where clients send money per currency. Required to issue invoices.</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddProfileModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Profile
          </button>
        </div>

        {/* Currency Readiness Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-neutral-500 self-center mr-1">Readiness:</span>
          {SUPPORTED_CURRENCIES.map((c) => {
            const hasProf = profiles.some((p) => p.currency === c.code);
            return (
              <span
                key={c.code}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  hasProf
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-neutral-50 text-neutral-400 border-neutral-200'
                }`}
              >
                {c.code} {hasProf ? '✓' : '— No instructions'}
              </span>
            );
          })}
        </div>

        {loadingProfiles ? (
          <div className="py-6 flex justify-center text-neutral-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed rounded-xl bg-neutral-50 space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="font-semibold text-neutral-800 text-sm">No Payment Profiles Configured</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              You must add at least one bank account or payment link before you can send invoices to clients (US-PAY-02 guard).
            </p>
            <button
              onClick={() => setShowAddProfileModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-900 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Your First Profile
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map((p) => (
              <div key={p.id} className="p-4 rounded-lg bg-neutral-50 border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-neutral-900">
                      {p.currency}
                    </span>
                    {p.is_default && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                        Default for {p.currency}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-neutral-600 flex items-center gap-2">
                    {p.bank_name && (
                      <span className="inline-flex items-center gap-1">
                        <Landmark className="w-3.5 h-3.5 text-neutral-500" />
                        {p.bank_name} • <strong>{p.account_number}</strong> ({p.account_name})
                      </span>
                    )}
                    {p.payment_link && (
                      <span className="inline-flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-blue-500" />
                        Link: <a href={p.payment_link} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">{p.payment_link}</a>
                      </span>
                    )}
                    {p.mobile_money_number && (
                      <span className="inline-flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                        MoMo: <strong>{p.mobile_money_number}</strong> ({p.account_name})
                      </span>
                    )}
                  </div>

                  {p.instructions && (
                    <div className="text-[11px] text-neutral-500 italic">
                      Instructions: {p.instructions}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleDeleteProfile(p.id, p.currency)}
                    title="Delete profile"
                    className="p-1.5 text-neutral-400 hover:text-red-600 transition rounded hover:bg-white border"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Payment Profile Modal */}
      {showAddProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-neutral-900">Add Payment Profile (Payout Channel)</h3>
              <button
                onClick={() => setShowAddProfileModal(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePaymentProfile} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Currency</label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Channel Type</label>
                  <select
                    value={channelType}
                    onChange={(e) => setChannelType(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="bank">Local / Wire Bank Account</option>
                    <option value="digital">Digital Payment Link (Wise, Geegpay, Stripe)</option>
                    <option value="mobile_money">Mobile Money (M-Pesa, MTN, Telecel)</option>
                  </select>
                </div>
              </div>

              {channelType === 'bank' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Bank Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Guaranty Trust Bank, Chase, Barclays"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-neutral-800"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Account Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Lewis Tech Ventures"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-neutral-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Account / IBAN Number</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 0123456789"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-neutral-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Routing / Sort Code / SWIFT (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 058-152062 or GTBINGLA"
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-neutral-800"
                    />
                  </div>
                </div>
              )}

              {channelType === 'digital' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Payment Link URL</label>
                    <input
                      type="url"
                      required
                      placeholder="https://wise.com/pay/me/studiobagg or Geegpay link"
                      value={paymentLink}
                      onChange={(e) => setPaymentLink(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-neutral-800"
                    />
                  </div>
                </div>
              )}

              {channelType === 'mobile_money' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Subscriber / Account Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Kofi Mensah"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-neutral-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Mobile Money Number</label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. +233 24 123 4567"
                        value={mobileMoneyNumber}
                        onChange={(e) => setMobileMoneyNumber(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-neutral-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Custom Payout Instructions (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Include invoice number in payment description or reference."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs text-neutral-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultProfileCheck"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500"
                />
                <label htmlFor="defaultProfileCheck" className="text-xs text-neutral-700">
                  Set as default payout instructions for {newCurrency}
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddProfileModal(false)}
                  className="px-3 py-1.5 border rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingProfile}
                  className="inline-flex items-center gap-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                >
                  {addingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Payment Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Polite Reminder Defaults (US-REM-01) */}
      <div className="bg-white rounded-xl border p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 border-b pb-3">
          <Bell className="w-5 h-5 text-emerald-600" />
          <h2 className="font-bold text-base text-neutral-900">Automated Reminders</h2>
        </div>
        <p className="text-xs text-neutral-600">
          Polite emails and 1-tap WhatsApp nudges are scheduled automatically:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-neutral-50 border rounded-lg text-xs font-medium">3 days before due</div>
          <div className="p-3 bg-neutral-50 border rounded-lg text-xs font-medium">On due date</div>
          <div className="p-3 bg-neutral-50 border rounded-lg text-xs font-medium">3 days after due</div>
          <div className="p-3 bg-neutral-50 border rounded-lg text-xs font-medium">7 days after due</div>
        </div>
      </div>

      {/* One-Click Data Export & Portability (US-SEC-01) */}
      <div className="bg-white rounded-xl border p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 border-b pb-3">
          <Download className="w-5 h-5 text-emerald-600" />
          <div>
            <h2 className="font-bold text-base text-neutral-900">Data Rights & Portability</h2>
            <p className="text-xs text-neutral-500">
              Export all your client records, invoices, line items, and payment claims in standard formats.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <a
            href={`${API_BASE}/compliance/export/csv`}
            download
            className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Export Complete CSV
          </a>
          <a
            href={`${API_BASE}/compliance/export/zip`}
            download
            className="inline-flex items-center gap-2 px-4 py-2 border hover:bg-neutral-50 text-neutral-800 text-xs font-semibold rounded-lg transition"
          >
            <FileArchive className="w-4 h-4 text-blue-500" />
            Export Archive (ZIP)
          </a>
        </div>
        <p className="text-[11px] text-neutral-400">
          Exports are generated on-demand and download immediately without requiring support intervention.
        </p>
      </div>

      {/* Danger Zone: Account Erasure (US-SEC-03) */}
      <div className="bg-white rounded-xl border border-red-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 border-b border-red-100 pb-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <div>
            <h2 className="font-bold text-base text-red-900">Danger Zone — Right to Erasure</h2>
            <p className="text-xs text-red-600/80">
              Permanently delete your account, workspace, clients, and invoice links (NDPA 2023 compliance).
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-600 max-w-lg">
            This action is irreversible. All published invoice links will immediately return 404, payment profiles and subscriptions will be deleted, and all personal data erased.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition shrink-0"
          >
            Delete Account & All Data
          </button>
        </div>
      </div>

      {/* Delete Account Modal (US-SEC-03) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-red-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-base text-neutral-900">Confirm Account Deletion</h3>
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePhrase('');
                  setDeleteReason('');
                }}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600">
              Under NDPA 2023 regulations, all your data will be permanently wiped immediately. Active invoice share links will cease to function.
            </p>

            <form onSubmit={handleDeleteAccount} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">
                  Reason for leaving (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Switched platforms, business closed"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 text-neutral-800"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">
                  To confirm, type <strong className="text-red-600 font-mono">DELETE MY ACCOUNT</strong> below:
                </label>
                <input
                  type="text"
                  required
                  placeholder="DELETE MY ACCOUNT"
                  value={deletePhrase}
                  onChange={(e) => setDeletePhrase(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 font-mono text-neutral-900 font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-3.5 py-2 border rounded-lg text-neutral-600 hover:bg-neutral-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deletingAccount || deletePhrase !== 'DELETE MY ACCOUNT'}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {deletingAccount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Permanently Delete Everything
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
