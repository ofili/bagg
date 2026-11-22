
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Check, Info, Loader2 } from "lucide-react";
import { BagCharacter } from "@/components/brand";
import { DocumentComments } from "@/components/comments/DocumentComments";
import { InvoiceDocument, PaymentDetails } from "@/components/invoice";
import {
  ClientPayBar,
  ClientPayView,
  type ClientPayProps,
} from "@/components/mobile/ClientPay";
import { Money } from "@/components/money/Money";
import { MoneyField } from "@/components/ui/MoneyField";
import {
  Alert,
  Button,
  Card,
  DateField,
  Dialog,
  EmailField,
  TextArea,
  TextField,
} from "@/components/ui";
import { cleanAmount, toMinor } from "@/lib/amount";
import { formatDate } from "@/lib/date";

const API_BASE = "/api";

interface PublicInvoiceData {
  invoice: {
    id: string;
    invoice_number: string;
    client_name?: string;
    currency: string;
    status: string;
    user_facing_status?: string | null;
    remaining_minor?: number;
    issue_date: string;
    due_date: string;
    items: Array<{
      id: string;
      description: string;
      quantity: number;
      unit_price_minor: number;
      total_minor: number;
    }>;
    subtotal_minor: number;
    discount_minor: number;
    tax_rate_percent: number;
    tax_minor: number;
    total_minor: number;
    wht_rate_percent?: number;
    wht_minor?: number;
    net_payable_minor?: number;
    deposit_percentage?: number;
    deposit_amount_minor?: number;
    notes?: string | null;
    share_token: string;
    amount_paid_minor: number;
    latest_claim?: {
      id: string;
      amount_minor: number;
      payment_date: string;
      reference?: string | null;
      proof_file_url?: string | null;
      status: string;
      rejection_reason?: string | null;
    } | null;
    latest_receipt?: {
      id: string;
      receipt_number: string;
      amount_paid_minor: number;
      balance_remaining_minor: number;
      payment_date: string;
      payment_method: string;
      reference?: string | null;
      confirmation_source?: string;
      provider?: string | null;
      verification_code: string;
      share_token?: string | null;
    } | null;
  };
  latest_claim?: {
    id: string;
    amount_minor: number;
    payment_date: string;
    reference?: string | null;
    proof_file_url?: string | null;
    status: string;
    rejection_reason?: string | null;
  } | null;
  payment_profile?: {
    id: string;
    currency: string;
    bank_name?: string | null;
    account_name?: string | null;
    account_number?: string | null;
    routing_number?: string | null;
    payment_link?: string | null;
    mobile_money_number?: string | null;
    instructions?: string | null;
  } | null;
  comments: Array<{
    id: string;
    author_name: string;
    message: string;
    created_at: string;
  }>;
  is_revised: boolean;
  revision_banner?: string | null;
  show_viral_footer: boolean;
  viral_footer_text?: string;
  viral_footer_link?: string;
}

interface PaymentVerificationResponse {
  status?: "success" | "processing" | "failed" | string;
}

export default function PublicClientInvoiceView() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<PublicInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const [claimAmount, setClaimAmount] = useState("");
  const [claimDate, setClaimDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [claimReference, setClaimReference] = useState("");
  const [claimProofUrl, setClaimProofUrl] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const [showAbuseDialog, setShowAbuseDialog] = useState(false);
  const [abuseReason, setAbuseReason] = useState("");
  const [abuseEmail, setAbuseEmail] = useState("");
  const [abuseName, setAbuseName] = useState("");
  const [submittingAbuse, setSubmittingAbuse] = useState(false);
  const [abuseSuccess, setAbuseSuccess] = useState(false);
  const [abuseError, setAbuseError] = useState<string | null>(null);

  const fetchInvoiceData = useCallback(() => {
    if (!token) return;

    fetch(`${API_BASE}/share/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Invoice link not found or expired");
        }

        return res.json();
      })
      .then((json: PublicInvoiceData) => {
        setData(json);
        setError(null);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Could not load invoice",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleClaimPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !data) return;

    setSubmittingClaim(true);
    setClaimError(null);

    const amountMinor = toMinor(claimAmount);

    if (amountMinor <= 0) {
      setClaimError("Enter the amount you paid.");
      setSubmittingClaim(false);
      return;
    }

    const { invoice } = data;
    const payable = invoice.net_payable_minor || invoice.total_minor;
    const remainingMinor =
      invoice.remaining_minor ??
      Math.max(0, payable - (invoice.amount_paid_minor || 0));

    if (amountMinor > remainingMinor) {
      setClaimError(
        `The amount cannot exceed the remaining balance of ${(remainingMinor / 100).toFixed(2)} ${invoice.currency}.`,
      );
      setSubmittingClaim(false);
      return;
    }

    let sanitizedProofUrl = claimProofUrl.trim();

    if (
      sanitizedProofUrl &&
      !/^https?:\/\//i.test(sanitizedProofUrl)
    ) {
      sanitizedProofUrl = `https://${sanitizedProofUrl}`;
    }

    try {
      const res = await fetch(`${API_BASE}/share/${token}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_minor: amountMinor,
          payment_date: claimDate || undefined,
          reference: claimReference.trim() || undefined,
          proof_file_url: sanitizedProofUrl || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.detail || "Failed to submit payment claim.",
        );
      }

      setIsClaimDialogOpen(false);
      setToastMsg(
        "Done. Your payment details have been sent to your freelancer.",
      );
      setTimeout(() => setToastMsg(null), 4000);

      fetchInvoiceData();
    } catch (err) {
      setClaimError(
        err instanceof Error ? err.message : "Error submitting claim.",
      );
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleReportAbuse = async (e: React.FormEvent) => {
    e.preventDefault();

    if (abuseReason.trim().length < 10) {
      setAbuseError("Please provide a reason with at least 10 characters.");
      return;
    }

    try {
      setSubmittingAbuse(true);
      setAbuseError(null);

      const res = await fetch(`${API_BASE}/share/${token}/report-abuse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: abuseReason.trim(),
          reporter_email: abuseEmail.trim() || undefined,
          reporter_name: abuseName.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to submit report");
      }

      setAbuseSuccess(true);

      setTimeout(() => {
        setShowAbuseDialog(false);
        setAbuseSuccess(false);
        setAbuseReason("");
      }, 3000);
    } catch (err) {
      setAbuseError(
        err instanceof Error ? err.message : "Error submitting report.",
      );
    } finally {
      setSubmittingAbuse(false);
    }
  };

  useEffect(() => {
    fetchInvoiceData();
  }, [fetchInvoiceData]);

  /**
   * A payment-provider redirect is not proof of payment.
   * Ask the server to verify the reference and interpret the server's
   * explicit status response.
   */
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const verifyRedirectPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const reference = urlParams.get("reference");

      if (!reference) return;

      try {
        const res = await fetch(
          `${API_BASE}/share/${token}/verify-payment`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference }),
          },
        );

        if (!res.ok) {
          throw new Error("Payment verification request failed.");
        }

        const verification =
          (await res.json()) as PaymentVerificationResponse;

        if (cancelled) return;

        switch (verification.status) {
          case "success":
            setToastMsg("Your payment has already been recorded.");
            fetchInvoiceData();
            break;

          case "processing":
            setToastMsg(
              "Your payment is being checked. Please check again shortly.",
            );
            break;

          case "failed":
            setToastMsg(
              "Your payment was not confirmed. Please contact your freelancer.",
            );
            break;

          default:
            setToastMsg(
              "We could not confirm the payment status. Please contact your freelancer.",
            );
            break;
        }
      } catch {
        if (cancelled) return;

        setToastMsg(
          "We could not check the payment status. Please try again later.",
        );
      }
    };

    verifyRedirectPayment();

    return () => {
      cancelled = true;
    };
  }, [token, fetchInvoiceData]);

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setToastMsg(`${label} copied to clipboard!`);

    setTimeout(() => {
      setCopiedKey(null);
      setToastMsg(null);
    }, 2500);
  };

  if (loading) {
    return (
      <div
        role="status"
        className="flex min-h-dvh items-center justify-center bg-cream p-4 text-text-muted"
      >
        <Loader2 aria-hidden className="h-8 w-8 animate-spin" />
        <span className="sr-only">Loading invoice</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream p-4">
        <Card
          zone="calm"
          className="w-full max-w-sm space-y-3 p-6 text-center"
        >
          <Info
            aria-hidden
            className="mx-auto h-9 w-9 text-text-muted"
          />
          <h1 className="text-title">invoice unavailable</h1>
          <p className="text-body text-text-soft">
            {error || "This link may have been revoked or expired."}
          </p>
        </Card>
      </div>
    );
  }

  const {
    invoice,
    payment_profile,
    is_revised,
    revision_banner,
    show_viral_footer,
    viral_footer_link,
    latest_claim: rootLatestClaim,
  } = data;

  const resolvedLatestClaim =
    invoice.latest_claim ?? rootLatestClaim ?? null;

  const payable = invoice.net_payable_minor || invoice.total_minor;

  const remainingMinor =
    invoice.remaining_minor ??
    Math.max(0, payable - (invoice.amount_paid_minor || 0));

  const openClaimSheet = () => {
    if (
      resolvedLatestClaim &&
      resolvedLatestClaim.status === "pending"
    ) {
      setClaimAmount(
        (resolvedLatestClaim.amount_minor / 100).toFixed(2),
      );

      setClaimDate(
        resolvedLatestClaim.payment_date ||
          new Date().toISOString().split("T")[0],
      );

      setClaimReference(resolvedLatestClaim.reference || "");
      setClaimProofUrl(resolvedLatestClaim.proof_file_url || "");
    } else {
      setClaimAmount((remainingMinor / 100).toFixed(2));
      setClaimDate(new Date().toISOString().split("T")[0]);
      setClaimReference("");
      setClaimProofUrl("");
    }

    setClaimError(null);
    setIsClaimDialogOpen(true);
  };

  const payProps: ClientPayProps = {
    invoiceNumber: invoice.invoice_number,
    currency: invoice.currency,
    dueDate: invoice.due_date,
    status: invoice.status,
    payableMinor: payable,
    paidMinor: invoice.amount_paid_minor || 0,
    remainingMinor,
    claim: resolvedLatestClaim,
    receipt: invoice.latest_receipt ?? null,
    paymentDetails: (
      <PaymentDetails
        profile={payment_profile}
        currency={invoice.currency}
        onCopy={handleCopy}
        copiedKey={copiedKey}
      />
    ),
    businessName:
      (data as { business_name?: string | null }).business_name ?? null,
    onClaim: openClaimSheet,
  };

  const invoiceDoc = (
    <InvoiceDocument
      variant="public"
      onClaimPaid={openClaimSheet}
      paymentSlot={payProps.paymentDetails}
      invoice={{
        ...invoice,
        remaining_minor: remainingMinor,
        amount_paid_minor: invoice.amount_paid_minor,
        latest_claim: resolvedLatestClaim,
        latest_receipt: invoice.latest_receipt ?? null,
      }}
    />
  );

  return (
    <div className="min-h-dvh bg-cream p-4 pb-32 sm:p-6 sm:pb-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Toast */}
        {toastMsg && (
          <div
            role="status"
            className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-btn border-brut-thin border-ink bg-surface px-4 py-2 text-body font-extrabold shadow-brut"
          >
            <Check
              aria-hidden
              className="h-4 w-4 text-leaf"
            />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Revision notice */}
        {is_revised && revision_banner && (
          <Card
            zone="calm"
            tone="peach"
            className="flex items-start gap-2.5 text-body"
          >
            <Info
              aria-hidden
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>{revision_banner}</span>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          {/* Main document column */}
          <div className="min-w-0 space-y-6">
            {/* Mobile payment experience */}
            <ClientPayView {...payProps} />

            {/* Full invoice: expandable on mobile */}
            <details className="border-brut border-ink bg-surface sm:hidden">
              <summary className="flex min-h-12 cursor-pointer items-center justify-between px-4 font-extrabold">
                <span>View full invoice</span>
                <span className="text-caption text-text-muted">
                  {invoice.invoice_number}
                </span>
              </summary>

              <div className="p-3">{invoiceDoc}</div>
            </details>

            {/* Full invoice: desktop and tablet */}
            <div className="hidden sm:block">{invoiceDoc}</div>

            <div className="flex justify-end print:hidden">
              <a
                href={`${API_BASE}/invoices/share/${encodeURIComponent(token)}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center justify-center border border-line-subtle px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface-tint"
              >
                Download invoice PDF
              </a>
            </div>

            {/* Discussion */}
            <DocumentComments
              documentType="invoice"
              documentId={invoice.id}
              isPublicView={true}
              shareToken={token}
              documentNumber={invoice.invoice_number}
            />
          </div>

          {/* Supporting payment column */}
          <aside className="hidden space-y-6 lg:sticky lg:top-6 lg:block">
            {/* Payment summary */}
            <Card zone="calm" className="space-y-4 p-5">
              <div>
                <h2 className="text-heading">payment summary</h2>
                <p className="mt-1 text-caption text-text-muted">
                  Invoice {invoice.invoice_number}
                </p>
              </div>

              <dl className="space-y-3 text-body">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-soft">Invoice total</dt>
                  <dd className="font-semibold">
                    <Money
                      amountMinor={payable}
                      currency={invoice.currency}
                      hideCurrencyCode
                    />
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-soft">Paid</dt>
                  <dd className="font-semibold">
                    <Money
                      amountMinor={invoice.amount_paid_minor || 0}
                      currency={invoice.currency}
                      variant="paid"
                      hideCurrencyCode
                    />
                  </dd>
                </div>

                <div className="border-t border-line pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="font-extrabold">Outstanding</dt>
                    <dd className="font-extrabold">
                      <Money
                        amountMinor={remainingMinor}
                        currency={invoice.currency}
                        variant="total"
                        hideCurrencyCode
                      />
                    </dd>
                  </div>
                </div>
              </dl>

              <div className="space-y-2 border-t border-line pt-3 text-body">
                <div className="flex justify-between gap-3">
                  <span className="text-text-soft">Issued</span>
                  <span className="font-medium">
                    {formatDate(invoice.issue_date)}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-text-soft">Due</span>
                  <span className="font-medium">
                    {formatDate(invoice.due_date)}
                  </span>
                </div>
              </div>

              {invoice.status === "paid" || remainingMinor === 0 ? (
                <div className="border border-leaf/40 bg-leaf/10 p-3 text-body font-bold">
                  <Check
                    aria-hidden
                    className="mr-2 inline h-4 w-4"
                  />
                  Payment complete
                </div>
              ) : (
                <div className="bg-surface-tint p-3 text-caption text-text-soft">
                  Use the payment instructions on the invoice if you prefer a
                  bank transfer.
                </div>
              )}
            </Card>
          </aside>
        </div>

        {/* Bagg referral footer */}
        {show_viral_footer && (
          <div className="text-center">
            <Link
              href={
                viral_footer_link ||
                "https://bagg.africa?utm_source=invoice_footer&utm_medium=referral"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-caption text-text-muted hover:text-text"
            >
              <BagCharacter size={20} decorative />
              <span>Sent with bagg. Invoicing for African creators.</span>
            </Link>
          </div>
        )}

        {/* Report suspicious invoice */}
        <div className="text-center">
          <Button
            variant="link"
            onClick={() => setShowAbuseDialog(true)}
            className="text-caption font-medium"
          >
            Report this invoice as suspicious
          </Button>
        </div>
      </div>

      {/* Mobile sticky payment action */}
      <ClientPayBar {...payProps} />

      {/* Payment claim dialog */}
      <Dialog
        open={isClaimDialogOpen}
        onClose={() =>
          !submittingClaim && setIsClaimDialogOpen(false)
        }
        title="I've paid this invoice"
        description="Share your payment details so your freelancer can verify the funds and send your receipt."
        className="max-h-[92dvh] overflow-y-auto"
      >
        <form onSubmit={handleClaimPayment} className="space-y-4">
          {claimError && <Alert variant="error">{claimError}</Alert>}

          <div className="space-y-2">
            <MoneyField
              label="Amount you paid"
              currency={invoice.currency}
              value={claimAmount}
              onChange={(v) =>
                setClaimAmount(cleanAmount(v, claimAmount))
              }
              required
            />

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() =>
                  setClaimAmount((remainingMinor / 100).toFixed(2))
                }
                className="rounded-btn border-brut-thin border-ink bg-surface-tint px-2.5 py-1 text-caption font-bold text-ink hover:border-ink hover:bg-surface"
              >
                Full balance ({(remainingMinor / 100).toFixed(2)}{" "}
                {invoice.currency})
              </button>

              {invoice.deposit_amount_minor &&
                invoice.deposit_amount_minor > 0 &&
                remainingMinor > invoice.deposit_amount_minor && (
                  <button
                    type="button"
                    onClick={() =>
                      setClaimAmount(
                        (
                          (invoice.deposit_amount_minor || 0) / 100
                        ).toFixed(2),
                      )
                    }
                    className="rounded-btn border-brut-thin border-ink bg-surface-tint px-2.5 py-1 text-caption font-bold text-ink hover:border-ink hover:bg-surface"
                  >
                    Deposit only (
                    {(
                      (invoice.deposit_amount_minor || 0) / 100
                    ).toFixed(2)}{" "}
                    {invoice.currency})
                  </button>
                )}
            </div>
          </div>

          <DateField
            label="Date you paid"
            required
            max={new Date().toISOString().split("T")[0]}
            value={claimDate}
            onChange={(e) => setClaimDate(e.target.value)}
          />

          <TextField
            label="Transfer reference"
            optional
            placeholder="e.g. 0901238492 or Access Bank transfer"
            hint="Bank session ID, transaction ref, or your sender bank/account name."
            value={claimReference}
            onChange={(e) => setClaimReference(e.target.value)}
          />

          <TextField
            label="Link to proof"
            optional
            placeholder="https://..."
            hint="A link to a receipt screenshot or bank payment slip."
            value={claimProofUrl}
            onChange={(e) => setClaimProofUrl(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              zone="calm"
              size="lg"
              disabled={submittingClaim}
              onClick={() => setIsClaimDialogOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              zone="calm"
              size="lg"
              loading={submittingClaim}
            >
              Send details
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Report abuse dialog */}
      <Dialog
        open={showAbuseDialog}
        onClose={() =>
          !submittingAbuse && setShowAbuseDialog(false)
        }
        title="Report this invoice"
        description="If this invoice looks like impersonation, phishing, or a charge you did not expect, let us know."
        className="max-h-[92dvh] overflow-y-auto"
      >
        <div className="space-y-4">
          {abuseSuccess ? (
            <p
              role="status"
              className="flex items-start gap-2 bg-peach p-3 text-body font-medium"
            >
              <Check
                aria-hidden
                className="mt-0.5 h-4 w-4 shrink-0 text-leaf"
              />
              Thank you. Your report was sent and our team will look at this
              invoice promptly.
            </p>
          ) : (
            <form
              onSubmit={handleReportAbuse}
              className="space-y-4"
            >
              {abuseError && (
                <Alert variant="error">{abuseError}</Alert>
              )}

              <TextArea
                label="What looks wrong?"
                required
                minLength={10}
                rows={4}
                hint="At least 10 characters."
                value={abuseReason}
                onChange={(e) => setAbuseReason(e.target.value)}
              />

              <EmailField
                label="Your email"
                optional
                value={abuseEmail}
                onChange={(e) => setAbuseEmail(e.target.value)}
              />

              <TextField
                label="Your name"
                optional
                value={abuseName}
                onChange={(e) => setAbuseName(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  zone="calm"
                  size="lg"
                  onClick={() => setShowAbuseDialog(false)}
                  disabled={submittingAbuse}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="danger"
                  zone="calm"
                  size="lg"
                  loading={submittingAbuse}
                >
                  Send report
                </Button>
              </div>
            </form>
          )}
        </div>
      </Dialog>
    </div>
  );
}
