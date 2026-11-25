'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Check, XCircle, FileText } from 'lucide-react';
import { Alert, Button, Card, Input, TextArea } from '@/components/ui';
import { Money } from '@/components/money/Money';
import { formatDate } from '@/lib/date';
import {
  approvePublicExpense,
  declinePublicExpense,
  getPublicExpense,
  type PublicExpenseView,
} from '@/lib/expenses-api';

export default function PublicExpenseApprovalPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [expense, setExpense] = useState<PublicExpenseView | null>(null);
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
      const data = await getPublicExpense(token);
      setExpense(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Expense approval link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApprove() {
    if (!approverName.trim()) {
      setActionError('Please enter your name to approve this expense.');
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      await approvePublicExpense(token, approverName.trim());
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not approve expense');
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
      await declinePublicExpense(token, declineReason.trim());
      setShowDecline(false);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not decline expense');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <Card className="p-6 text-center text-body text-text-muted">Loading expense details...</Card>
      </main>
    );
  }

  if (error || !expense) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <Alert variant="error" title="Link Unavailable">
          {error || 'Invalid link'}
        </Alert>
      </main>
    );
  }

  const isPending = expense.approval_status === 'pending_approval' && !expense.is_expired;

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <Card className="p-6">
        <p className="text-caption font-mono text-text-muted">{expense.bagg_reference}</p>
        <h1 className="mt-1 text-h2 font-extrabold text-text">
          Expense Approval Request from {expense.business_name}
        </h1>
        {expense.client_name && (
          <p className="mt-1 text-body text-text-muted">For {expense.client_name}</p>
        )}

        <div className="mt-6 rounded-card border-brut-thin border-ink bg-surface-tint p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-bold text-text">{expense.description}</p>
              <p className="mt-1 text-caption text-text-muted">
                {formatDate(expense.expense_date)}
                {expense.category ? ` • ${expense.category}` : ''}
              </p>
            </div>
            <p className="text-h2 font-extrabold text-text">
              <Money amountMinor={expense.amount_minor} currency={expense.currency} />
            </p>
          </div>

          {expense.receipt_download_url && (
            <div className="mt-4 border-t border-ink/15 pt-3">
              <a
                href={expense.receipt_download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-caption font-bold underline"
              >
                <FileText className="h-4 w-4" />
                View Receipt ({expense.receipt_filename || 'Attachment'})
              </a>
            </div>
          )}
        </div>

        {expense.expense_policy_snapshot && (
          <div className="mt-4 rounded-card border-brut-thin border-ink/30 p-3 text-caption text-text-muted">
            <p className="font-bold text-text">Agreed Quote Expense Terms</p>
            {expense.expense_policy_snapshot.per_expense_threshold_minor != null && (
              <p>
                Per-expense approval threshold:{' '}
                <Money
                  amountMinor={expense.expense_policy_snapshot.per_expense_threshold_minor}
                  currency={expense.currency}
                />
              </p>
            )}
            {expense.expense_policy_snapshot.total_expense_cap_minor != null && (
              <p>
                Total expense cap:{' '}
                <Money
                  amountMinor={expense.expense_policy_snapshot.total_expense_cap_minor}
                  currency={expense.currency}
                />
              </p>
            )}
          </div>
        )}

        {actionError && (
          <div className="mt-4">
            <Alert variant="error" title="Action failed">
              {actionError}
            </Alert>
          </div>
        )}

        {expense.approval_status === 'approved' && (
          <div className="mt-6">
            <Alert variant="success" title="Expense Approved">
              Approved by {expense.approved_by_name || 'Client'}.
            </Alert>
          </div>
        )}

        {expense.approval_status === 'declined' && (
          <div className="mt-6">
            <Alert variant="error" title="Expense Declined">
              {expense.decline_reason || 'This expense was declined.'}
            </Alert>
          </div>
        )}

        {isPending && (
          <div className="mt-6 space-y-4">
            {!showDecline ? (
              <>
                <div>
                  <label className="mb-1 block text-caption font-bold text-text">
                    Your Full Name
                  </label>
                  <Input
                    placeholder="Enter your name to approve"
                    value={approverName}
                    onChange={(e) => setApproverName(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleApprove} disabled={submitting} className="flex-1">
                    <Check className="mr-2 h-4 w-4" />
                    {submitting ? 'Approving...' : 'Approve Expense'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDecline(true)}
                    disabled={submitting}
                  >
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
                  placeholder="Explain why this expense is declined..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                />
                <div className="flex gap-3">
                  <Button variant="danger" onClick={handleDecline} disabled={submitting}>
                    {submitting ? 'Declining...' : 'Confirm Decline'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDecline(false)}
                    disabled={submitting}
                  >
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
