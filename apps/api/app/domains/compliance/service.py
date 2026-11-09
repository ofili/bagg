"""Compliance use cases: exports, portability and account erasure."""

from __future__ import annotations

import csv
import io
import zipfile

from datetime import datetime, timezone

from app.core.errors import BadRequestException
from app.domains.auth.models import User
from app.domains.clients.models import Client
from app.domains.compliance.repository import ComplianceRepository
from app.domains.invoices.models import Invoice
from app.domains.payments.models import PaymentClaim
from app.domains.security.service import SecurityPurpose, SecurityService

class ComplianceService:
    """Orchestrates compliance operations and owns their transactions."""

    DELETION_CONFIRMATION_PHRASE = "DELETE MY ACCOUNT"

    def __init__(self, db):
        self.db = db
        self.repo = ComplianceRepository(db)

    @staticmethod
    def _safe_csv_value(value):
        """Prevent spreadsheet formula execution from user-controlled text."""
        if value is None:
            return ""

        if isinstance(value, str):
            cleaned = value.strip()
            if cleaned.startswith(("=", "+", "-", "@", "\t", "\r")):
                return "'" + cleaned

        return value

    @classmethod
    def _write_csv(cls, rows: list[list]) -> str:
        output = io.StringIO(newline="")
        writer = csv.writer(output)

        for row in rows:
            writer.writerow([cls._safe_csv_value(value) for value in row])

        return output.getvalue()

    @staticmethod
    def _client_rows(clients: list[Client]) -> list[list]:
        rows = [
            [
                "ID",
                "Name",
                "Email",
                "Phone",
                "Currency",
                "Payment Terms (days)",
                "Created",
            ]
        ]

        for client in clients:
            rows.append(
                [
                    client.id,
                    client.name,
                    client.email or "",
                    client.phone or "",
                    client.preferred_currency,
                    client.default_payment_terms_days or 14,
                    client.created_at.isoformat() if client.created_at else "",
                ]
            )

        return rows

    @staticmethod
    def _invoice_rows(invoices: list[Invoice]) -> list[list]:
        rows = [
            [
                "ID",
                "Number",
                "Client ID",
                "Currency",
                "Status",
                "Issue Date",
                "Due Date",
                "Subtotal (minor)",
                "Discount (minor)",
                "Tax %",
                "Tax (minor)",
                "Total (minor)",
                "WHT %",
                "WHT (minor)",
                "Net Payable (minor)",
                "Amount Paid (minor)",
                "Sent At",
                "Version",
            ]
        ]

        for invoice in invoices:
            rows.append(
                [
                    invoice.id,
                    invoice.invoice_number or "",
                    invoice.client_id,
                    invoice.currency,
                    invoice.status,
                    str(invoice.issue_date or ""),
                    str(invoice.due_date or ""),
                    invoice.subtotal_minor,
                    invoice.discount_minor,
                    invoice.tax_rate_percent,
                    invoice.tax_minor,
                    invoice.total_minor,
                    invoice.wht_rate_percent or 0,
                    invoice.wht_minor or 0,
                    invoice.net_payable_minor or invoice.total_minor,
                    invoice.amount_paid_minor or 0,
                    invoice.sent_at.isoformat() if invoice.sent_at else "",
                    invoice.version,
                ]
            )

        return rows

    @staticmethod
    def _claim_rows(claims: list[PaymentClaim]) -> list[list]:
        rows = [
            [
                "ID",
                "Invoice ID",
                "Amount (minor)",
                "Payment Date",
                "Reference",
                "Status",
                "Created",
            ]
        ]

        for claim in claims:
            rows.append(
                [
                    claim.id,
                    claim.invoice_id,
                    claim.amount_minor,
                    str(claim.payment_date or ""),
                    claim.reference or "",
                    claim.status,
                    claim.created_at.isoformat() if claim.created_at else "",
                ]
            )

        return rows

    async def export_csv(self, workspace_id: str) -> tuple[bytes, str]:
        clients, invoices, claims = await self.repo.get_workspace_export_data(
            workspace_id
        )

        rows: list[list] = []
        rows.extend(
            [
                ["=== CLIENTS ==="],
                *self._client_rows(clients),
                [],
                ["=== INVOICES ==="],
                *self._invoice_rows(invoices),
                [],
                ["=== PAYMENT CLAIMS ==="],
                *self._claim_rows(claims),
            ]
        )

        content = self._write_csv(rows).encode("utf-8-sig")
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filename = f"bagg_export_{workspace_id}_{timestamp}.csv"

        return content, filename

    async def export_zip(self, workspace_id: str) -> tuple[bytes, str]:
        clients, invoices, claims = await self.repo.get_workspace_export_data(
            workspace_id
        )

        buffer = io.BytesIO()

        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.writestr(
                "clients.csv",
                self._write_csv(self._client_rows(clients)),
            )
            archive.writestr(
                "invoices.csv",
                self._write_csv(self._invoice_rows(invoices)),
            )
            archive.writestr(
                "payment_claims.csv",
                self._write_csv(self._claim_rows(claims)),
            )

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filename = f"bagg_export_{workspace_id}_{timestamp}.zip"

        return buffer.getvalue(), filename

    async def delete_account(
        self,
        *,
        user: User,
        workspace,
        challenge_id: str,
        confirmation_phrase: str,
    ) -> datetime:
        """Deactivate and anonymise an account without deleting financial history."""

        if confirmation_phrase != self.DELETION_CONFIRMATION_PHRASE:
            raise BadRequestException(
                "Confirmation phrase must be exactly 'DELETE MY ACCOUNT'"
            )

        deletion_payload = {
            "action": "delete_account",
            "confirmation_phrase": self.DELETION_CONFIRMATION_PHRASE,
        }

        await SecurityService(self.db).require_consumed_step_up(
            user=user,
            workspace=workspace,
            challenge_id=challenge_id,
            purpose=SecurityPurpose.ACCOUNT_DELETION,
            payload=deletion_payload,
        )

        now = datetime.now(timezone.utc)

        try:
            locked_user = await self.repo.get_user_for_update(user.id)

            if locked_user is None:
                raise BadRequestException("Account could not be found")

            user = locked_user

            if user is None:
                raise BadRequestException("Account could not be found")

            if not user.is_active:
                raise BadRequestException("This account is already inactive")

            original_email = user.email
            placeholder_email = (
                f"deleted+{user.id}@accounts.bagg.invalid"
            )

            # Invalidate all login challenges tied to the original address.
            # Remove login challenges and their email addresses.
            login_code_ids = await self.repo.delete_login_codes(original_email)

            # Revoke all active sessions before changing the account identity.
            await self.repo.revoke_all_sessions(user.id, now)

            security_challenge_ids = await self.repo.get_security_challenge_ids(user.id)

            # Remove temporary security artefacts and account notifications.
            await self.repo.delete_security_challenges(user.id)
            await self.repo.delete_recovery_codes(user.id)
            await self.repo.delete_user_notifications(user.id)

            # Preserve the append-only email-change audit events. Their
            # associated mutable requests are anonymised rather than deleted.
            email_change_ids = (
                await self.repo.anonymise_email_change_requests(
                    user.id,
                    placeholder_email,
                    now,
                )
            )

            # Prevent pending encrypted authentication messages from being
            # delivered after the account has been deactivated.
            await self.repo.supersede_pending_email_messages(
                login_code_ids + email_change_ids + security_challenge_ids,
                now,
            )

            # The User row remains because immutable audit records and
            # retained business records may refer to its ID.
            await self.repo.anonymise_user(
                user,
                placeholder_email,
                now,
            )

            await self.db.commit()
            return now

        except Exception:
            await self.db.rollback()
            raise
