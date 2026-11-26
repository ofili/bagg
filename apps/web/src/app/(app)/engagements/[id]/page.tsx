'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowsClockwise,
  Receipt,
  TrendUp,
} from '@phosphor-icons/react';
import { ApprovalLinkPanel } from '@/components/engagements/ApprovalLinkPanel';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button, Card, ErrorState, Skeleton, StatCard } from '@/components/ui';
import { Money } from '@/components/money/Money';
import {
  getEngagement,
  getEngagementMargin,
  listScopeChanges,
  regenerateScopeChangeApprovalLink,
  type Engagement,
  type EngagementMargin,
  type ScopeChangeRequest,
} from '@/lib/expenses-api';

export default function EngagementDetailPage() {
  const params = useParams<{ id: string }>();
  const engagementId = params.id;

  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [margin, setMargin] = useState<EngagementMargin | null>(null);
  const [scopeChanges, setScopeChanges] = useState<ScopeChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [approvalLink, setApprovalLink] = useState<{
    url: string;
    title: string;
    description: string;
    expiresAt?: string | null;
  } | null>(null);
  const [regeneratingLinkId, setRegeneratingLinkId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eng, mrg, changes] = await Promise.all([
        getEngagement(engagementId),
        getEngagementMargin(engagementId),
        listScopeChanges(engagementId),
      ]);
      setEngagement(eng);
      setMargin(mrg);
      setScopeChanges(changes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load engagement');
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRegenerateScopeChangeLink(change: ScopeChangeRequest) {
    const confirmed = window.confirm(
      'Regenerate this approval link? The previous link will stop working.',
    );
    if (!confirmed) return;

    setRegeneratingLinkId(change.id);
    setNotice(null);
    try {
      const updated = await regenerateScopeChangeApprovalLink(change.id);
      if (updated.approval_url) {
        setApprovalLink({
          url: updated.approval_url,
          title: 'New client cap-increase link ready',
          description: `Send this link to your client so they can review "${change.title}". It is shown only once.`,
          expiresAt: updated.approval_token_expires_at,
        });
      }
      setNotice({ kind: 'success', text: 'New approval link generated.' });
      await load();
    } catch (err) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to regenerate approval link',
      });
    } finally {
      setRegeneratingLinkId(null);
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-12 w-64 mb-4" />
        <Skeleton className="h-40 w-full" />
      </PageContainer>
    );
  }

  if (error || !engagement || !margin) {
    return (
      <PageContainer>
        <ErrorState title="Could not load engagement" description={error || 'Not found'} onRetry={load} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={engagement.title}
        description={`${engagement.bagg_reference} • ${engagement.currency} • ${engagement.status}`}
        actions={
          <Link href={`/engagements/${engagement.id}/expenses`}>
            <Button>
              <Receipt className="mr-2 h-4 w-4" />
              Manage Expenses
            </Button>
          </Link>
        }
      />

      {notice && (
        <div className="mb-4">
          <Alert variant={notice.kind === 'error' ? 'error' : 'success'} title={notice.text}>
            {notice.text}
          </Alert>
        </div>
      )}

      {approvalLink && (
        <ApprovalLinkPanel
          title={approvalLink.title}
          description={approvalLink.description}
          url={approvalLink.url}
          expiresAt={approvalLink.expiresAt}
          onDismiss={() => setApprovalLink(null)}
        />
      )}

      {/* Engagement Margin View (BAG-EXP-008, FR-088, AC-027) */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-h3 font-bold text-text">
            <TrendUp className="h-5 w-5" />
            Engagement Margin (Provider Only)
          </h2>
          <span className="text-caption text-text-muted">
            Confirmed payments only • Unpaid amounts shown separately
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Confirmed Received"
            value={<Money amountMinor={margin.confirmed_received_minor} currency={margin.currency} />}
            description="Verified payments only"
          />
          <StatCard
            label="Outstanding Invoiced"
            value={<Money amountMinor={margin.outstanding_invoiced_minor} currency={margin.currency} />}
            description="Unpaid balance (not in net)"
          />
          <StatCard
            label="Total Costs"
            value={<Money amountMinor={margin.total_costs_minor} currency={margin.currency} />}
            description="Billable + non-billable expenses"
          />
          <StatCard
            label="Net Margin"
            value={<Money amountMinor={margin.net_margin_minor} currency={margin.currency} />}
            description="Confirmed received minus total costs"
          />
        </div>
      </section>

      {/* Expense Policy & Cap Baseline (BAG-EXP-001, BAG-EXP-004) */}
      <section className="grid gap-6 md:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-h3 font-bold text-text">Commercial Expense Policy</h3>
          {engagement.expense_policy_snapshot ? (
            <dl className="mt-4 space-y-2 text-body">
              <div className="flex justify-between">
                <dt className="text-text-muted">Per-expense approval threshold</dt>
                <dd className="font-bold">
                  {engagement.per_expense_threshold_minor != null ? (
                    <Money amountMinor={engagement.per_expense_threshold_minor} currency={engagement.currency} />
                  ) : (
                    'None'
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Original baseline cap</dt>
                <dd className="font-bold">
                  {engagement.baseline_expense_cap_minor != null ? (
                    <Money amountMinor={engagement.baseline_expense_cap_minor} currency={engagement.currency} />
                  ) : (
                    'Uncapped'
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Effective cap (with changes)</dt>
                <dd className="font-bold">
                  {engagement.effective_expense_cap_minor != null ? (
                    <Money amountMinor={engagement.effective_expense_cap_minor} currency={engagement.currency} />
                  ) : (
                    'Uncapped'
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-body text-text-muted">No expense policy was attached to this quote.</p>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-h3 font-bold text-text">Scope & Cap Change Requests</h3>
          {scopeChanges.length === 0 ? (
            <p className="mt-3 text-body text-text-muted">No cap change requests recorded.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {scopeChanges.map((sc) => (
                <li key={sc.id} className="rounded-card border-brut-thin border-ink p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-text">{sc.title}</span>
                    <span className="rounded-full border-brut-thin border-ink px-2 py-0.5 text-caption font-bold uppercase">
                      {sc.status}
                    </span>
                  </div>
                  <p className="mt-1 text-caption text-text-muted">
                    +<Money amountMinor={sc.delta_amount_minor} currency={sc.currency} />
                    {sc.accepted_by_name ? ` • Accepted by ${sc.accepted_by_name}` : ''}
                  </p>
                  {sc.status === 'pending' && (
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        onClick={() => handleRegenerateScopeChangeLink(sc)}
                        disabled={regeneratingLinkId === sc.id}
                      >
                        <ArrowsClockwise className="mr-2 h-4 w-4" />
                        {regeneratingLinkId === sc.id
                          ? 'Generating...'
                          : 'Regenerate approval link'}
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </PageContainer>
  );
}
