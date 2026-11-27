'use client';

import { useEffect, useState, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowsClockwise,
  Camera,
  Plus,
  Receipt,
} from '@phosphor-icons/react';
import { ApprovalLinkPanel } from '@/components/engagements/ApprovalLinkPanel';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  Field,
  Input,
  MoneyField,
  Skeleton,
  Toggle,
} from '@/components/ui';
import { Money } from '@/components/money/Money';
import { formatDate } from '@/lib/date';
import {
  addExpensesToInvoice,
  createScopeChange,
  getEngagement,
  getReceiptUploadUrl,
  listEngagementExpenses,
  recordExpense,
  regenerateExpenseApprovalLink,
  updateExpense,
  uploadReceipt,
  type Engagement,
  type Expense,
} from '@/lib/expenses-api';

export default function EngagementExpensesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const engagementId = params.id;

  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
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

  // Inline edit state (only for expenses that have not been put on an invoice)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmountMajor, setEditAmountMajor] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editBillable, setEditBillable] = useState(true);
  const [editSaving, setEditSaving] = useState(false);

  // Add expense form state (camera-first on mobile)
  const [showAddForm, setShowAddForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amountMajor, setAmountMajor] = useState('');
  const [category, setCategory] = useState('general');
  const [billable, setBillable] = useState(true);
  const [emailApprovalLink, setEmailApprovalLink] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Selection for billing to invoice
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [billingSubmitting, setBillingSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eng, expList] = await Promise.all([
        getEngagement(engagementId),
        listEngagementExpenses(engagementId),
      ]);
      setEngagement(eng);
      setExpenses(expList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load expenses');
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    void load();
  }, [load]);

  const billableTotalMinor = expenses
    .filter((e) => e.billable && e.approval_status !== 'declined')
    .reduce((sum, e) => sum + e.amount_minor, 0);

  const effectiveCapMinor = engagement?.effective_expense_cap_minor ?? null;
  const remainingCapMinor =
    effectiveCapMinor != null ? Math.max(0, effectiveCapMinor - billableTotalMinor) : null;
  const isOverCap = effectiveCapMinor != null && billableTotalMinor > effectiveCapMinor;

  const eligibleExpenses = expenses.filter(
    (e) =>
      e.billable &&
      e.invoicing_status === 'uninvoiced' &&
      (e.approval_status === 'not_required' || e.approval_status === 'approved'),
  );

  const selectedTotalMinor = expenses
    .filter((e) => selectedIds.includes(e.id))
    .reduce((sum, e) => sum + e.amount_minor, 0);

  function startEdit(exp: Expense) {
    setEditingId(exp.id);
    setEditDescription(exp.description);
    setEditAmountMajor((exp.amount_minor / 100).toFixed(2));
    setEditCategory(exp.category ?? '');
    setEditBillable(exp.billable);
  }

  async function handleSaveEdit(exp: Expense) {
    const parsed = Math.round(Number(editAmountMajor.replace(/,/g, '')) * 100);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setNotice({ kind: 'error', text: 'Enter a valid expense amount greater than zero.' });
      return;
    }
    if (!editDescription.trim()) {
      setNotice({ kind: 'error', text: 'Add a short description.' });
      return;
    }

    const changes: Parameters<typeof updateExpense>[1] = {};
    if (parsed !== exp.amount_minor) changes.amount_minor = parsed;
    if (editDescription.trim() !== exp.description) changes.description = editDescription.trim();
    if (editCategory.trim() !== (exp.category ?? '')) changes.category = editCategory.trim();
    if (editBillable !== exp.billable) changes.billable = editBillable;

    if (Object.keys(changes).length === 0) {
      setEditingId(null);
      return;
    }

    setEditSaving(true);
    setNotice(null);
    try {
      const updated = await updateExpense(exp.id, changes);
      if (updated.approval_url) {
        setApprovalLink({
          url: updated.approval_url,
          title: 'Client approval needed again',
          description: `You changed \"${updated.description}\", so your client must approve it again. Send this link. It is shown only once.`,
          expiresAt: updated.approval_token_expires_at,
        });
      }
      setEditingId(null);
      setNotice({
        kind: 'success',
        text: updated.approval_url
          ? 'Expense updated. Send the new approval link to your client.'
          : 'Expense updated.',
      });
      await load();
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to update expense' });
    } finally {
      setEditSaving(false);
    }
  }

  async function handleRecordExpense(e: FormEvent) {
    e.preventDefault();
    if (!engagement) return;

    const parsed = Math.round(Number(amountMajor.replace(/,/g, '')) * 100);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setNotice({ kind: 'error', text: 'Enter a valid expense amount greater than zero.' });
      return;
    }

    setSubmitting(true);
    setNotice(null);
    try {
      let receiptFilename: string | undefined;
      let receiptStoragePath: string | undefined;
      let receiptContentType: string | undefined;

      if (receiptFile) {
        const uploadMeta = await getReceiptUploadUrl(receiptFile.name, engagement.id);
        // Without this PUT the expense would point at a file that was never stored.
        await uploadReceipt(uploadMeta.upload_url, receiptFile);
        receiptFilename = receiptFile.name;
        receiptStoragePath = uploadMeta.storage_path;
        receiptContentType = receiptFile.type || 'application/octet-stream';
      }

      const created = await recordExpense({
        engagement_id: engagement.id,
        amount_minor: parsed,
        currency: engagement.currency,
        description,
        category,
        billable,
        receipt_filename: receiptFilename,
        receipt_storage_path: receiptStoragePath,
        receipt_content_type: receiptContentType,
        send_email: emailApprovalLink,
      });

      if (created.approval_url) {
        setApprovalLink({
          url: created.approval_url,
          title: 'Client approval link ready',
          description: created.approval_email_queued
            ? `The link was emailed to your client so they can approve "${created.description}". It is also shown here only once.`
            : `Send this link to your client so they can approve "${created.description}". It is shown only once.`,
          expiresAt: created.approval_token_expires_at,
        });
      } else {
        setApprovalLink(null);
      }

      setDescription('');
      setAmountMajor('');
      setReceiptFile(null);
      setEmailApprovalLink(false);
      setShowAddForm(false);
      setNotice({
        kind: 'success',
        text: created.approval_url
          ? created.approval_email_queued
            ? 'Expense recorded. The approval link was emailed to your client.'
            : 'Expense recorded. Send the approval link to your client.'
          : 'Expense recorded.',
      });
      await load();
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to save expense' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateExpensesInvoice() {
    if (selectedIds.length === 0) return;
    setBillingSubmitting(true);
    setNotice(null);
    try {
      const res = await addExpensesToInvoice({ expense_ids: selectedIds });
      setSelectedIds([]);
      setNotice({ kind: 'success', text: 'Draft expenses invoice created.' });
      router.push(`/invoices/${res.invoice_id}`);
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Could not create invoice' });
    } finally {
      setBillingSubmitting(false);
    }
  }

  async function handleRequestCapIncrease(expense: Expense) {
    if (!engagement) return;
    setNotice(null);
    try {
      const change = await createScopeChange(engagement.id, { expense_id: expense.id });
      if (change.approval_url) {
        setApprovalLink({
          url: change.approval_url,
          title: 'Client cap-increase link ready',
          description: `Send this link to your client so they can review the cap increase for "${expense.description}". It is shown only once.`,
          expiresAt: change.approval_token_expires_at,
        });
      }
      setNotice({
        kind: 'success',
        text: `Scope-change request created for "${expense.description}".`,
      });
      await load();
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to create scope change' });
    }
  }

  async function handleRegenerateApprovalLink(expense: Expense) {
    const confirmed = window.confirm(
      'Regenerate this approval link? The previous link will stop working.',
    );
    if (!confirmed) return;

    setRegeneratingLinkId(expense.id);
    setNotice(null);
    try {
      const updated = await regenerateExpenseApprovalLink(expense.id);
      if (updated.approval_url) {
        setApprovalLink({
          url: updated.approval_url,
          title: 'New client approval link ready',
          description: `Send this link to your client so they can approve "${expense.description}". It is shown only once.`,
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
        <Skeleton className="h-32 w-full" />
      </PageContainer>
    );
  }

  if (error || !engagement) {
    return (
      <PageContainer>
        <ErrorState title="Could not load expenses" description={error || 'Not found'} onRetry={load} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-4">
        <Link
          href={`/engagements/${engagement.id}`}
          className="inline-flex items-center gap-1 text-caption font-bold text-text-muted hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {engagement.title}
        </Link>
      </div>

      <PageHeader
        title="Engagement Expenses"
        description={
          remainingCapMinor != null
            ? `Remaining cap: ${engagement.currency} ${(remainingCapMinor / 100).toLocaleString()}`
            : `${engagement.bagg_reference} • ${engagement.currency}`
        }
        actions={
          <Button onClick={() => setShowAddForm((prev) => !prev)}>
            <Plus className="mr-2 h-4 w-4" />
            {showAddForm ? 'Close Form' : 'Record Expense'}
          </Button>
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

      {isOverCap && (
        <div className="mb-4">
          <Alert variant="warning" title="Billable expenses exceed the current cap">
            Submit a scope-change request on the flagged expense so the client can approve the cap increase before billing.
          </Alert>
        </div>
      )}

      {showAddForm && (
        <Card className="mb-6 p-5">
          <h2 className="text-h3 font-bold text-text">Record Expense</h2>
          <form onSubmit={handleRecordExpense} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Description">
                {(a11y) => (
                  <Input
                    {...a11y}
                    required
                    placeholder="e.g. Studio hire or props"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                )}
              </Field>

              <MoneyField
                label="Amount"
                currency={engagement.currency}
                value={amountMajor}
                onChange={setAmountMajor}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Category" optional>
                {(a11y) => (
                  <Input
                    {...a11y}
                    placeholder="props, travel, studio_hire"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                )}
              </Field>

              <Field label="Receipt (Camera or File)" optional>
                {(a11y) => (
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-btn border-brut-thin border-ink bg-surface px-3 text-body font-medium hover:bg-surface-tint">
                    <Camera className="h-5 w-5 shrink-0" />
                    <span className="truncate">
                      {receiptFile ? receiptFile.name : 'Take photo or attach receipt'}
                    </span>
                    <input
                      id={a11y.id}
                      type="file"
                      accept="image/*,application/pdf"
                      capture="environment"
                      className="sr-only"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </Field>
            </div>

            <Toggle
              checked={billable}
              onChange={setBillable}
              label="Billable to client"
              hint="Non-billable costs are tracked for engagement margin only and never shown to the client."
            />

            {billable && (
              <Toggle
                checked={emailApprovalLink}
                onChange={setEmailApprovalLink}
                label="Email the approval link to the client"
                hint="Used only when the expense needs client approval. Requires an email address on the client record."
              />
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Expense'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {selectedIds.length > 0 && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-ink bg-mango/20 p-4">
          <div>
            <p className="font-bold text-text">
              {selectedIds.length} expense{selectedIds.length === 1 ? '' : 's'} selected for billing
            </p>
            <p className="text-caption text-text-muted">
              Total to bill: <Money amountMinor={selectedTotalMinor} currency={engagement.currency} />
            </p>
          </div>
          <Button onClick={handleCreateExpensesInvoice} disabled={billingSubmitting}>
            <Receipt className="mr-2 h-4 w-4" />
            {billingSubmitting ? 'Creating Draft...' : 'Create Expenses Invoice'}
          </Button>
        </Card>
      )}

      {expenses.length === 0 ? (
        <EmptyState
          mood="happy"
          title="No expenses recorded"
          body="Record pass-through costs or internal expenses against this engagement."
        />
      ) : (
        <div className="space-y-3">
          {expenses.map((exp) => {
            const isEligible = eligibleExpenses.some((e) => e.id === exp.id);
            const isChecked = selectedIds.includes(exp.id);

            return (
              <Card key={exp.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {isEligible && (
                      <div className="pt-1">
                        <Checkbox
                          label=""
                          checked={isChecked}
                          onChange={(checked) => {
                            setSelectedIds((prev) =>
                              checked ? [...prev, exp.id] : prev.filter((id) => id !== exp.id),
                            );
                          }}
                          aria-label={`Select ${exp.description}`}
                        />
                      </div>
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-text">{exp.description}</h3>
                        <span className="rounded-full border-brut-thin border-ink px-2 py-0.5 text-caption font-bold">
                          {exp.billable ? 'Billable' : 'Internal (Non-billable)'}
                        </span>
                      </div>
                      <p className="mt-1 text-caption text-text-muted">
                        {formatDate(exp.expense_date)}
                        {exp.category ? ` • ${exp.category}` : ''}
                        {exp.receipt_filename ? ` • Receipt: ${exp.receipt_filename}` : ''}
                      </p>
                      {exp.receipt_download_url && (
                        <a
                          href={exp.receipt_download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-caption font-bold underline"
                        >
                          View receipt
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-h3 font-extrabold text-text">
                      <Money amountMinor={exp.amount_minor} currency={exp.currency} />
                    </p>
                    {/* Independent state chips (FR-082) */}
                    <div className="mt-2 flex flex-wrap justify-end gap-1.5 text-caption">
                      <span className="rounded-full bg-surface-tint px-2 py-0.5 font-semibold">
                        Approval: {exp.approval_status}
                      </span>
                      <span className="rounded-full bg-surface-tint px-2 py-0.5 font-semibold">
                        Billing: {exp.invoicing_status}
                      </span>
                      <span className="rounded-full bg-surface-tint px-2 py-0.5 font-semibold">
                        Reimbursed: {exp.reimbursement_status}
                      </span>
                    </div>
                    {exp.invoicing_status === 'uninvoiced' && editingId !== exp.id && (
                      <div className="mt-2 flex justify-end">
                        <Button variant="outline" onClick={() => startEdit(exp)}>
                          Edit
                        </Button>
                      </div>
                    )}
                    {exp.billable && exp.approval_status === 'pending_approval' && (
                      <div className="mt-2 flex flex-wrap justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleRegenerateApprovalLink(exp)}
                          disabled={regeneratingLinkId === exp.id}
                        >
                          <ArrowsClockwise className="mr-2 h-4 w-4" />
                          {regeneratingLinkId === exp.id
                            ? 'Generating...'
                            : 'Regenerate approval link'}
                        </Button>

                        {isOverCap && (
                          <Button
                            variant="outline"
                            onClick={() => handleRequestCapIncrease(exp)}
                          >
                            Request Cap Increase
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {editingId === exp.id && (
                  <div className="mt-4 space-y-4 border-t border-line-subtle pt-4">
                    <Field label="Description">
                      {(a11y) => (
                        <Input {...a11y} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                      )}
                    </Field>
                    <MoneyField
                      label="Amount"
                      currency={exp.currency}
                      value={editAmountMajor}
                      onChange={setEditAmountMajor}
                    />
                    <Field label="Category" optional>
                      {(a11y) => (
                        <Input {...a11y} value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
                      )}
                    </Field>
                    <Toggle
                      checked={editBillable}
                      onChange={setEditBillable}
                      label="Billable to client"
                      hint="Changing the amount or this setting asks your client to approve again, if approval is needed."
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => handleSaveEdit(exp)} disabled={editSaving}>
                        {editSaving ? 'Saving...' : 'Save changes'}
                      </Button>
                      <Button variant="outline" onClick={() => setEditingId(null)} disabled={editSaving}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
