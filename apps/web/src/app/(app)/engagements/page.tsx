'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, ArrowRight } from '@phosphor-icons/react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { Money } from '@/components/money/Money';
import { formatDate } from '@/lib/date';
import { listEngagements, type Engagement } from '@/lib/expenses-api';

export default function EngagementsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listEngagements();
      setEngagements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load engagements');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Engagements"
        description="Accepted quotes and active client engagements with expense tracking and margin."
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <ErrorState title="Could not load engagements" description={error} onRetry={load} />
      ) : engagements.length === 0 ? (
        <EmptyState
          mood="happy"
          title="No engagements yet"
          body="When a client accepts a quote, an engagement is created automatically with its commercial baseline and expense policy."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {engagements.map((eng) => (
            <Link key={eng.id} href={`/engagements/${eng.id}`} className="block group">
              <Card className="p-5 transition-transform group-hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-caption font-mono text-text-muted">{eng.bagg_reference}</p>
                    <h2 className="mt-1 truncate text-h3 font-bold text-text">{eng.title}</h2>
                  </div>
                  <span className="inline-flex shrink-0 items-center rounded-full border-brut-thin border-ink bg-surface-tint px-2.5 py-0.5 text-caption font-bold uppercase">
                    {eng.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-caption text-text-muted">
                  <span>Created {formatDate(eng.created_at)}</span>
                  {eng.effective_expense_cap_minor != null && (
                    <span>
                      Expense cap:{' '}
                      <strong className="text-text">
                        <Money amountMinor={eng.effective_expense_cap_minor} currency={eng.currency} />
                      </strong>
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-1 text-caption font-bold text-text">
                  <span>View margin & expenses</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
