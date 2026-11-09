"""Static architecture and security regression tests for public sharing."""

from __future__ import annotations

import ast
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]


class SharingBoundaryTests(unittest.TestCase):
    def source(self, path: str) -> str:
        return (ROOT / path).read_text(encoding="utf-8")

    def tree(self, path: str):
        return ast.parse(self.source(path))

    def test_router_contains_no_database_queries_or_mutations(self):
        tree = self.tree("app/domains/sharing/router.py")

        forbidden = {
            "execute",
            "add",
            "add_all",
            "delete",
            "commit",
            "refresh",
            "flush",
        }

        calls = {
            node.func.attr
            for node in ast.walk(tree)
            if isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id == "db"
        }

        self.assertFalse(calls.intersection(forbidden), calls)

    def test_public_invoice_lookup_hides_drafts(self):
        source = self.source("app/domains/sharing/service.py")

        self.assertIn('invoice.status == "draft"', source)
        self.assertIn("status_code=404", source)

    def test_claim_transaction_locks_invoice_and_supersedes_pending_claims(self):
        repo = self.source("app/domains/sharing/repository.py")
        service = self.source("app/domains/sharing/service.py")

        self.assertIn("stmt.with_for_update()", repo)
        self.assertIn(
            'previous_claim.status = "superseded"',
            service,
        )
        self.assertIn(
            "cancel_invoice_reminders(invoice.id, self.db, commit=False)",
            service,
        )

    def test_comment_line_item_is_scoped_to_invoice(self):
        repo = self.source("app/domains/sharing/repository.py")
        service = self.source("app/domains/sharing/service.py")

        self.assertIn(
            "InvoiceLineItem.invoice_id == invoice_id",
            repo,
        )
        self.assertIn(
            "line_item_belongs_to_invoice",
            service,
        )

    def test_browser_verification_does_not_confirm_payment(self):
        router = self.source("app/domains/sharing/router.py")

        verify = router[
            router.index("async def verify_direct_payment") : router.index(
                '@router.post(\n    "/{token}/report-abuse"'
            )
        ]

        self.assertIn("verify_invoice_checkout", verify)
        self.assertIn("signed provider webhook", verify)
        self.assertNotIn("record_status_event", verify)

    def test_checkout_remains_delegated_to_payments_domain(self):
        router = self.source("app/domains/sharing/router.py")

        checkout = router[
            router.index("async def initiate_direct_checkout") : router.index(
                '@router.post(\n    "/{token}/verify-payment"'
            )
        ]

        self.assertIn("initiate_invoice_checkout", checkout)
        self.assertNotIn("PaymentProfile(", checkout)

    def test_service_uses_repository_for_persistence(self):
        tree = self.tree("app/domains/sharing/service.py")

        direct_db_calls = {
            node.func.attr
            for node in ast.walk(tree)
            if isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id == "db"
        }

        self.assertFalse(
            direct_db_calls.intersection({"execute", "add", "commit", "refresh"})
        )


if __name__ == "__main__":
    unittest.main()
