const API_BASE = '/api';

export interface ExpensePolicy {
  reimbursable_categories: string[];
  per_expense_threshold_minor?: number | null;
  total_expense_cap_minor?: number | null;
  client_approval_required: boolean;
}

export interface Engagement {
  id: string;
  bagg_reference: string;
  workspace_id: string;
  client_id: string;
  quote_id?: string | null;
  title: string;
  engagement_type: string;
  status: string;
  currency: string;
  start_date?: string | null;
  target_completion_date?: string | null;
  completed_at?: string | null;
  commercial_baseline?: Record<string, unknown> | null;
  baseline_expense_cap_minor?: number | null;
  effective_expense_cap_minor?: number | null;
  per_expense_threshold_minor?: number | null;
  expense_policy_snapshot?: ExpensePolicy | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EngagementMargin {
  engagement_id: string;
  currency: string;
  confirmed_received_minor: number;
  outstanding_invoiced_minor: number;
  billable_costs_minor: number;
  non_billable_costs_minor: number;
  total_costs_minor: number;
  net_margin_minor: number;
  baseline_expense_cap_minor?: number | null;
  effective_expense_cap_minor?: number | null;
}

export interface Expense {
  id: string;
  bagg_reference: string;
  workspace_id: string;
  engagement_id: string;
  client_id: string;
  amount_minor: number;
  currency: string;
  expense_date: string;
  description: string;
  category?: string | null;
  billable: boolean;
  milestone_id?: string | null;
  retainer_period?: string | null;
  receipt_filename?: string | null;
  receipt_download_url?: string | null;
  approval_status: 'not_required' | 'pending_approval' | 'approved' | 'declined' | string;
  approval_requested_at?: string | null;
  approved_at?: string | null;
  approved_by_name?: string | null;
  declined_at?: string | null;
  decline_reason?: string | null;
  approval_url?: string | null;
  approval_token_expires_at?: string | null;
  approval_email_queued?: boolean;
  invoicing_status: 'uninvoiced' | 'drafted' | 'invoiced' | string;
  invoice_id?: string | null;
  invoiced_at?: string | null;
  reimbursement_status: 'unreimbursed' | 'reimbursed' | string;
  reimbursed_at?: string | null;
  policy_evaluation?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicExpenseView {
  id: string;
  bagg_reference: string;
  description: string;
  category?: string | null;
  amount_minor: number;
  currency: string;
  expense_date: string;
  receipt_filename?: string | null;
  receipt_download_url?: string | null;
  approval_status: string;
  approved_at?: string | null;
  approved_by_name?: string | null;
  declined_at?: string | null;
  decline_reason?: string | null;
  business_name: string;
  client_name?: string | null;
  expense_policy_snapshot?: ExpensePolicy | null;
  is_expired: boolean;
}

export interface ScopeChangeRequest {
  id: string;
  workspace_id: string;
  engagement_id: string;
  client_id: string;
  expense_id?: string | null;
  change_type: string;
  title: string;
  description?: string | null;
  delta_amount_minor: number;
  currency: string;
  status: 'pending' | 'accepted' | 'declined' | string;
  approval_url?: string | null;
  approval_token_expires_at?: string | null;
  approval_email_queued?: boolean;
  accepted_at?: string | null;
  accepted_by_name?: string | null;
  declined_at?: string | null;
  decline_reason?: string | null;
  created_at: string;
  updated_at: string;
}

async function parseError(res: Response, fallback: string): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  return new Error(body.detail || body.message || fallback);
}

/** Pass a quote id to find the engagement that quote created. */
export async function listEngagements(quoteId?: string): Promise<Engagement[]> {
  const query = quoteId ? `?quote_id=${encodeURIComponent(quoteId)}` : '';
  const res = await fetch(`${API_BASE}/engagements${query}`, { credentials: 'include' });
  if (!res.ok) throw await parseError(res, 'Failed to load engagements');
  return res.json();
}

export async function getEngagement(id: string): Promise<Engagement> {
  const res = await fetch(`${API_BASE}/engagements/${id}`, { credentials: 'include' });
  if (!res.ok) throw await parseError(res, 'Failed to load engagement');
  return res.json();
}

export async function getEngagementMargin(id: string): Promise<EngagementMargin> {
  const res = await fetch(`${API_BASE}/engagements/${id}/margin`, { credentials: 'include' });
  if (!res.ok) throw await parseError(res, 'Failed to load engagement margin');
  return res.json();
}

export async function listEngagementExpenses(engagementId: string): Promise<Expense[]> {
  const res = await fetch(`${API_BASE}/expenses/engagement/${engagementId}`, { credentials: 'include' });
  if (!res.ok) throw await parseError(res, 'Failed to load expenses');
  return res.json();
}

export async function recordExpense(payload: {
  engagement_id: string;
  amount_minor: number;
  currency: string;
  expense_date?: string;
  description: string;
  category?: string;
  billable: boolean;
  receipt_filename?: string;
  receipt_storage_path?: string;
  receipt_content_type?: string;
  notes?: string;
  send_email?: boolean;
}): Promise<Expense> {
  const res = await fetch(`${API_BASE}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseError(res, 'Failed to record expense');
  return res.json();
}

export async function regenerateExpenseApprovalLink(
  expenseId: string,
  sendEmail = false,
): Promise<Expense> {
  const params = new URLSearchParams({ send_email: String(sendEmail) });
  const res = await fetch(
    `${API_BASE}/expenses/${expenseId}/approval-link/regenerate?${params.toString()}`,
    {
      method: 'POST',
      credentials: 'include',
    },
  );
  if (!res.ok) throw await parseError(res, 'Failed to regenerate approval link');
  return res.json();
}

export async function getReceiptUploadUrl(filename: string, engagementId: string) {
  const params = new URLSearchParams({ filename, engagement_id: engagementId });
  const res = await fetch(`${API_BASE}/expenses/receipt-upload-url?${params.toString()}`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw await parseError(res, 'Failed to prepare receipt upload');
  return res.json() as Promise<{ upload_url: string; file_url: string; storage_path: string }>;
}

/** Uploads the receipt file to the presigned URL returned by getReceiptUploadUrl. */
export async function uploadReceipt(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, { method: 'PUT', body: file });
  if (!res.ok) {
    throw new Error('The receipt could not be uploaded, so the expense was not saved. Please try again.');
  }
}

export async function updateExpense(
  expenseId: string,
  payload: {
    amount_minor?: number;
    description?: string;
    category?: string;
    billable?: boolean;
    notes?: string;
  },
): Promise<Expense> {
  const res = await fetch(`${API_BASE}/expenses/${expenseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseError(res, 'Failed to update expense');
  return res.json();
}

export async function addExpensesToInvoice(payload: {
  expense_ids: string[];
  invoice_id?: string | null;
  notes?: string;
}): Promise<{ invoice_id: string; added_expense_ids: string[]; total_added_minor: number; invoice_total_minor: number }> {
  const res = await fetch(`${API_BASE}/expenses/add-to-invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseError(res, 'Failed to add expenses to invoice');
  return res.json();
}

export async function listScopeChanges(engagementId: string): Promise<ScopeChangeRequest[]> {
  const res = await fetch(`${API_BASE}/engagements/${engagementId}/scope-changes`, { credentials: 'include' });
  if (!res.ok) throw await parseError(res, 'Failed to load scope change requests');
  return res.json();
}

export async function createScopeChange(
  engagementId: string,
  payload: {
    expense_id?: string;
    title?: string;
    description?: string;
    delta_amount_minor?: number;
    send_email?: boolean;
  },
): Promise<ScopeChangeRequest> {
  const res = await fetch(`${API_BASE}/engagements/${engagementId}/scope-changes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseError(res, 'Failed to create scope change request');
  return res.json();
}

export async function regenerateScopeChangeApprovalLink(
  changeRequestId: string,
  sendEmail = false,
): Promise<ScopeChangeRequest> {
  const params = new URLSearchParams({ send_email: String(sendEmail) });
  const res = await fetch(
    `${API_BASE}/engagements/scope-changes/${changeRequestId}/approval-link/regenerate?${params.toString()}`,
    {
      method: 'POST',
      credentials: 'include',
    },
  );
  if (!res.ok) throw await parseError(res, 'Failed to regenerate approval link');
  return res.json();
}

export async function getPublicExpense(token: string): Promise<PublicExpenseView> {
  const res = await fetch(`${API_BASE}/expenses/public/${token}`);
  if (!res.ok) throw await parseError(res, 'Unable to load expense approval');
  return res.json();
}

export async function approvePublicExpense(token: string, approvedByName: string): Promise<Expense> {
  const res = await fetch(`${API_BASE}/expenses/public/${token}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved_by_name: approvedByName }),
  });
  if (!res.ok) throw await parseError(res, 'Failed to approve expense');
  return res.json();
}

export async function declinePublicExpense(token: string, reason: string): Promise<Expense> {
  const res = await fetch(`${API_BASE}/expenses/public/${token}/decline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw await parseError(res, 'Failed to decline expense');
  return res.json();
}
