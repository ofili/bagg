"""Static architecture and financial-invariant regression tests."""

from __future__ import annotations
import ast
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]


class FinancialBoundaryTests(unittest.TestCase):
    def source(self, path: str) -> str:
        return (ROOT / path).read_text(encoding="utf-8")

    def tree(self, path: str):
        return ast.parse(self.source(path))

    def db_calls(self, path: str) -> set[str]:
        calls = set()
        for node in ast.walk(self.tree(path)):
            if (
                isinstance(node, ast.Call)
                and isinstance(node.func, ast.Attribute)
                and isinstance(node.func.value, ast.Name)
                and node.func.value.id == "db"
            ):
                calls.add(node.func.attr)
        return calls

    def test_payment_router_has_no_sqlalchemy_persistence(self):
        self.assertFalse(self.db_calls("app/domains/payments/router.py"))

    def test_billing_router_has_no_sqlalchemy_persistence(self):
        self.assertFalse(self.db_calls("app/domains/billing/router.py"))

    def test_receipt_router_has_no_sqlalchemy_persistence(self):
        self.assertFalse(self.db_calls("app/domains/receipts/router.py"))

    def test_payment_and_billing_services_delegate_queries(self):
        for path in (
            "app/domains/payments/service.py",
            "app/domains/billing/service.py",
            "app/domains/receipts/queries.py",
        ):
            calls = self.db_calls(path)
            self.assertFalse(
                calls.intersection({"execute", "add", "add_all", "delete"}),
                f"{path}: {calls}",
            )

    def test_receipt_confirmation_uses_repository_for_locks(self):
        source = self.source("app/domains/receipts/service.py")
        self.assertIn("ReceiptRepository(db)", source)
        self.assertIn("repo.lock_invoice", source)
        self.assertIn("repo.lock_workspace", source)

    def test_billing_webhook_requires_server_created_checkout(self):
        source = self.source("app/domains/webhooks/billing_service.py")
        self.assertIn("get_checkout(reference, lock=True)", source)
        self.assertIn("checkout.amount_minor", source)
        self.assertIn("checkout.currency", source)
        self.assertIn("billing_checkout_id", source)

    def test_credit_pack_provisioning_uses_stored_pack_amount_and_credits(self):
        source = self.source("app/domains/webhooks/billing_service.py")
        self.assertIn('checkout.credits != pack["credits"]', source)
        self.assertIn("checkout.provider_reference", source)

    def test_subscription_cancellation_preserves_paid_period(self):
        source = self.source("app/domains/billing/service.py")
        cancel = source[
            source.index("async def cancel_subscription_renewal") : source.index(
                "async def expire_due_subscriptions"
            )
        ]
        self.assertIn("cancel_at_period_end = True", cancel)
        self.assertNotIn('sub.status = "canceled"', cancel)

    def test_expiry_worker_handles_cancelled_and_grace_period_subscriptions(self):
        source = self.source("app/domains/billing/service.py")
        self.assertIn("canceled_expired", source)
        self.assertIn("grace_expired", source)
        self.assertIn('workspace.tier = "free"', source)

    def test_models_register_billing_checkout_through_billing_module(self):
        source = self.source("app/models.py")
        self.assertIn("app.domains.billing.models", source)

    def test_webhook_payload_storage_is_minimized(self):
        source = self.source("app/domains/webhooks/invoice_payment_service.py")
        self.assertIn("_safe_provider_payload", source)
        self.assertNotIn("attempt.provider_payload = payload", source)

    def test_receipt_statement_supports_opening_balance(self):
        source = self.source("app/domains/receipts/queries.py")
        self.assertIn('opening += item["debit_minor"] - item["credit_minor"]', source)
        self.assertIn("opening_balance_minor=opening", source)

    def test_credit_balance_uses_append_only_ledger_sum(self):
        source = self.source("app/domains/billing/repository.py")
        method = source[
            source.index("async def get_credit_balance") : source.index(
                "async def find_credit_entry"
            )
        ]
        self.assertIn("func.sum(CreditLedgerEntry.amount)", method)

    def test_quota_counts_successful_dispatch_timestamp_not_email_retry_status(self):
        source = self.source("app/domains/billing/repository.py")
        method = source[
            source.index("async def count_dispatched_since") : source.index(
                "async def list_credit_history"
            )
        ]
        self.assertIn("model.sent_at >= start", method)
        self.assertNotIn("email_delivery_status", method)

    def test_invoice_and_quote_link_handoffs_are_metered(self):
        for path, variable in (
            ("app/domains/invoices/service.py", "invoice"),
            ("app/domains/quotes/service.py", "quote_obj"),
        ):
            source = self.source(path)
            self.assertIn(
                f"{variable}.email_delivery_status = "
                "DocumentDeliveryStatus.LINK_SHARED",
                source,
            )

    def test_public_sharing_checkout_delegates_to_payments_domain(self):
        source = self.source("app/domains/sharing/router.py")
        checkout = source[
            source.index("async def initiate_direct_checkout") : source.index(
                '@router.post(\n    "/{token}/verify-payment"'
            )
        ]
        self.assertIn("initiate_invoice_checkout", checkout)
        self.assertNotIn("httpx", checkout)

    def test_online_checkout_requires_a_real_payer_email(self):
        source = self.source("app/domains/payments/checkout_service.py")
        self.assertIn("A valid payer email is required", source)
        self.assertNotIn("client@invoice.bagg", source)

    def test_paystack_adapter_has_initialize_and_verify_operations(self):
        source = self.source("app/integrations/paystack.py")
        self.assertIn("/transaction/initialize", source)
        self.assertIn("/transaction/verify/", source)
        self.assertIn("PAYSTACK_SECRET_KEY", source)

    def test_single_paystack_endpoint_dispatches_invoice_and_billing_events(self):
        source = self.source("app/domains/webhooks/router.py")
        self.assertIn('metadata.get("type") == "direct_invoice_payment"', source)
        self.assertIn("process_invoice_payment_event(db, payload)", source)
        self.assertIn("process_paystack_billing_event(", source)
        self.assertIn("idempotency_key", source)

    def test_manual_payment_cannot_be_confirmed_against_draft_invoice(self):
        source = self.source("app/domains/receipts/service.py")
        self.assertIn('invoice.status == "draft" and not late_payment', source)
        self.assertIn("A draft invoice cannot receive a confirmed payment", source)


if __name__ == "__main__":
    unittest.main()
