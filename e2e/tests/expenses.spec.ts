import { test, expect } from '@playwright/test';

test.describe('Engagement Expenses & Approvals Suite (BAG-EXP-009 / AC-029)', () => {
  const mockEngagement = {
    id: 'eng-test-123',
    workspace_id: 'ws-test',
    client_id: 'client-test',
    quote_id: 'quote-test',
    bagg_reference: 'ENG-2026-0001',
    title: 'Brand Refresh & Identity System',
    currency: 'NGN',
    status: 'active',
    commercial_baseline: {
      quote_id: 'quote-test',
      quote_number: 'QOT-0001',
      total_quote_amount_minor: 150000000,
      agreed_at: '2026-11-20T10:00:00Z',
      has_expense_policy: true,
      expense_policy: {
        approval_threshold_minor: 5000000,
        total_expense_cap_minor: 20000000,
        allowed_categories: ['travel', 'props', 'studio_hire'],
        requires_client_approval: true,
      },
    },
    baseline_expense_cap_minor: 20000000,
    effective_expense_cap_minor: 20000000,
    created_at: '2026-11-20T10:00:00Z',
    updated_at: '2026-11-20T10:00:00Z',
  };

  const mockExpenses = [
    {
      id: 'exp-1',
      workspace_id: 'ws-test',
      engagement_id: 'eng-test-123',
      invoice_id: null,
      description: 'Studio equipment hire',
      category: 'studio_hire',
      currency: 'NGN',
      amount_minor: 8000000, // 80,000 NGN -> above threshold of 50,000 NGN
      billable: true,
      approval_status: 'approved',
      invoicing_status: 'unbilled',
      reimbursement_status: 'not_applicable',
      requires_approval: true,
      client_approval_token: 'exp_token_123',
      approved_by_name: 'Jane Doe',
      approved_at: '2026-11-21T12:00:00Z',
      decline_reason: null,
      receipt_storage_path: 'ws-test/eng-test-123/receipts/rec-1.jpg',
      receipt_download_url: 'https://example.com/receipt.jpg',
      created_at: '2026-11-21T10:00:00Z',
    },
    {
      id: 'exp-2',
      workspace_id: 'ws-test',
      engagement_id: 'eng-test-123',
      invoice_id: null,
      description: 'Art supplies & print samples',
      category: 'props',
      currency: 'NGN',
      amount_minor: 3000000, // 30,000 NGN -> under threshold of 50,000 NGN
      billable: true,
      approval_status: 'auto_approved',
      invoicing_status: 'unbilled',
      reimbursement_status: 'not_applicable',
      requires_approval: false,
      client_approval_token: null,
      approved_by_name: null,
      approved_at: '2026-11-22T09:00:00Z',
      decline_reason: null,
      receipt_storage_path: null,
      receipt_download_url: null,
      created_at: '2026-11-22T09:00:00Z',
    },
  ];

  test('Freelancer records an expense and attaches it to a draft invoice', async ({ page }) => {
    // Mock backend engagement and expense APIs
    await page.route('**/api/engagements/eng-test-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockEngagement),
      });
    });

    await page.route('**/api/engagements/eng-test-123/expenses', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = JSON.parse(route.request().postData() || '{}');
        const newExpense = {
          ...mockExpenses[0],
          id: 'exp-3',
          description: postData.description,
          amount_minor: postData.amount_minor,
          category: postData.category,
          approval_status: postData.amount_minor > 5000000 ? 'pending_client' : 'auto_approved',
        };
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newExpense),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockExpenses),
      });
    });

    await page.route('**/api/expenses/invoices', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          invoice_id: 'inv-draft-999',
          invoice_number: 'INV-2026-0042',
          expenses_count: 1,
          total_billed_minor: 8000000,
        }),
      });
    });

    // Navigate to the Engagement Expenses management page
    await page.goto('/engagements/eng-test-123/expenses');

    // Verify engagement header & remaining cap banner
    await expect(page.getByRole('heading', { name: 'Engagement Expenses' })).toBeVisible();
    await expect(page.getByText('ENG-2026-0001')).toBeVisible();

    // Verify listed expenses
    await expect(page.getByText('Studio equipment hire')).toBeVisible();
    await expect(page.getByText('Art supplies & print samples')).toBeVisible();

    // Open Record Expense form
    await page.getByRole('button', { name: /record expense/i }).click();
    await expect(page.getByRole('heading', { name: 'Record Expense' })).toBeVisible();

    // Fill in new expense
    await page.getByPlaceholder('e.g. Studio hire or props').fill('Sound design license');
    // Amount is formatted via MoneyField
    await page.locator('input[placeholder="0.00"]').fill('150.00');

    // Submit expense
    await page.getByRole('button', { name: /save expense/i }).click();

    // Select approved expense to bill to invoice
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.check();

    // Click Create Expenses Invoice button
    const createInvoiceBtn = page.getByRole('button', { name: /create expenses invoice/i });
    await expect(createInvoiceBtn).toBeVisible();
    await createInvoiceBtn.click();

    // Verify navigation or redirect towards draft invoice
    await page.waitForURL('**/invoices/inv-draft-999');
  });

  test('Client approves a pending expense via secure public link', async ({ page }) => {
    const mockPublicExpense = {
      description: 'High-end location permit & crew pass',
      category: 'travel',
      currency: 'NGN',
      amount_minor: 12000000, // 120,000 NGN
      approval_status: 'pending_client',
      approved_by_name: null,
      decline_reason: null,
      receipt_download_url: 'https://example.com/location_permit.pdf',
      expense_policy_snapshot: {
        approval_threshold_minor: 5000000,
        total_expense_cap_minor: 20000000,
        allowed_categories: ['travel', 'props'],
      },
    };

    let approved = false;

    await page.route('**/api/expenses/public/exp_token_secure_456', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...mockPublicExpense,
          approval_status: approved ? 'approved' : 'pending_client',
          approved_by_name: approved ? 'Sarah Connor' : null,
        }),
      });
    });

    await page.route('**/api/expenses/public/exp_token_secure_456/approve', async (route) => {
      approved = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Expense approved successfully',
          expense_id: 'exp-456',
          approval_status: 'approved',
          approved_by_name: 'Sarah Connor',
        }),
      });
    });

    // Navigate to public expense approval page
    await page.goto('/e/exp_token_secure_456');

    // Check expense details
    await expect(page.getByText('Expense Approval Request')).toBeVisible();
    await expect(page.getByText('High-end location permit & crew pass')).toBeVisible();

    // Fill approver name
    await page.getByPlaceholder('Enter your name to approve').fill('Sarah Connor');

    // Click Approve
    await page.getByRole('button', { name: /approve expense/i }).click();

    // Verify approval confirmation banner
    await expect(page.getByText('Expense Approved')).toBeVisible();
    await expect(page.getByText(/approved by sarah connor/i)).toBeVisible();
  });

  test('Client reviews and approves a scope-change cap increase', async ({ page }) => {
    const mockScopeChange = {
      id: 'sc-1',
      engagement_id: 'eng-test-123',
      quote_id: 'quote-test',
      status: 'pending_client',
      current_cap_minor: 20000000,
      requested_cap_minor: 35000000,
      cap_increase_minor: 15000000,
      description: 'Extended film set and props licensing',
      client_token: 'sc_token_xyz_789',
      approved_by_name: null,
      approved_at: null,
      declined_at: null,
      created_at: '2026-11-23T14:00:00Z',
    };

    let approved = false;

    await page.route('**/api/engagements/scope-changes/public/sc_token_xyz_789', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...mockScopeChange,
          status: approved ? 'approved' : 'pending_client',
          approved_by_name: approved ? 'Alex Chief' : null,
        }),
      });
    });

    await page.route('**/api/engagements/scope-changes/public/sc_token_xyz_789/approve', async (route) => {
      approved = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'sc-1',
          status: 'approved',
          effective_cap_minor: 35000000,
          approved_by_name: 'Alex Chief',
        }),
      });
    });

    // Navigate to public scope-change page
    await page.goto('/sc/sc_token_xyz_789');

    // Check scope-change details
    await expect(page.getByText('Expense Cap Increase Request')).toBeVisible();
    await expect(page.getByText('Extended film set and props licensing')).toBeVisible();

    // Fill approver name
    await page.getByPlaceholder('Enter your name to approve').fill('Alex Chief');

    // Click Approve
    await page.getByRole('button', { name: /approve cap increase/i }).click();

    // Verify confirmation
    await expect(page.getByText('Scope Change Approved')).toBeVisible();
    await expect(page.getByText(/approved by alex chief/i)).toBeVisible();
  });
});
