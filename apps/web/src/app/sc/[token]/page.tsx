'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Check, XCircle } from 'lucide-react';
import { Alert, Button, Card, Input, TextArea } from '@/components/ui';
import { Money } from '@/components/money/Money';
import { formatDate } from '@/lib/date';
import { type ScopeChangeRequest } from '@/lib/expenses-api';

const API_BASE = '/api';

export default function PublicScopeChangeApprovalPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [changeReq, setChangeReq] = useState<ScopeChangeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [approverName, setApproverName] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [showDecline, setShowDecline] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Direct fetch of public scope change details
      const res = await fetch(`${API_BASE}/engagements/scope-changes/public/${token}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.message || 'Scope change link is invalid or expired.');
      }
      const data = await res.json();
      setChangeReq(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scope change link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAccept() {
    if (!approverName.trim()) {
      setActionError('Please enter your name to accept this cap increase.');
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`${API_BASE}/engagements/scope-changes/public/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted_by_name: approverName.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.message || 'Failed to accept scope change');
      }
      const updated = await res.json();
      setChangeReq(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not accept scope change');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline() {
    if (!declineReason.trim()) {
      setActionError('Please provide a reason for declining.');
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`${API_BASE}/engagements/scope-changes/public/${token}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.message || 'Failed to decline scope change');
      }
      const updated = await res.json();
      setChangeReq(updated);
      setShowDecline(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not decline scope change');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <Card className="p-6 text-center text-body text-text-muted">Loading scope change details...</Card>
      </main>
    );
  }

  if (error || !changeReq) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <Alert variant="error" title="Link Unavailable">
          {error || 'Invalid link'}
        </Alert>
      </main>
    );
  }

  const isPending = changeReq.status === 'pending';

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <Card className="p-6">
        <h1 className="text-h2 font-extrabold text-text">Scope & Expense Cap Change Request</h1>
        <p className="mt-1 text-body text-text-muted">{changeReq.title}</p>

        <div className="mt-6 rounded-card border-brut-thin border-ink bg-surface-tint p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-bold text-text">Requested Cap Increase</p>
              {changeReq.description && (
                <p className="mt-1 text-caption text-text-muted">{changeReq.description}</p>
              )}
            </div>
            <p className="text-h2 font-extrabold text-text">
              +<Money amountMinor={changeReq.delta_amount_minor} currency={changeReq.currency} />
            </p>
          </div>
        </div>

        {actionError && (
          <div className="mt-4">
            <Alert variant="error" title="Action failed">
              {actionError}
            </Alert>
          </div>
        )}

        {changeReq.status === 'accepted' && (
          <div className="mt-6">
            <Alert variant="success" title="Cap Increase Accepted">
              Accepted by {changeReq.accepted_by_name || 'Client'} on {formatDate(changeReq.accepted_at || '')}.
            </Alert>
          </div>
        )}

        {changeReq.status === 'declined' && (
          <div className="mt-6">
            <Alert variant="error" title="Cap Increase Declined">
              {changeReq.decline_reason || 'This cap increase was declined.'}
            </Alert>
          </div>
        )}

        {isPending && (
          <div className="mt-6 space-y-4">
            {!showDecline ? (
              <>
                <div>
                  <label className="mb-1 block text-caption font-bold text-text">Your Full Name</label>
                  <Input
                    placeholder="Enter your name to accept"
                    value={approverName}
                    onChange={(e) => setApproverName(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleAccept} disabled={submitting} className="flex-1">
                    <Check className="mr-2 h-4 w-4" />
                    {submitting ? 'Accepting...' : 'Accept Cap Increase'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowDecline(true)} disabled={submitting}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Decline
                  </Button>
                </div>
              </>
            ) : (
              <>
                <TextArea
                  label="Reason for declining"
                  rows={3}
                  placeholder="Explain why this increase is declined..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                />
                <div className="flex gap-3">
                  <Button variant="danger" onClick={handleDecline} disabled={submitting}>
                    {submitting ? 'Declining...' : 'Confirm Decline'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowDecline(false)} disabled={submitting}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </main>
  );
}
