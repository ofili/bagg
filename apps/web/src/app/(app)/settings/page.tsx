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
  AlertCircle
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
    </div>
  );
}
