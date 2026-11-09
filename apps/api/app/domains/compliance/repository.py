"""Persistence operations for compliance, data portability and account erasure."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import case, delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.auth.models import MagicLoginCode, User, UserSession
from app.domains.clients.models import Client
from app.domains.invoices.models import Invoice
from app.domains.notifications.models import Notification
from app.domains.payments.models import PaymentClaim
from app.domains.security.email_change_models import EmailChangeRequest
from app.domains.security.models import AccountRecoveryCode, SecurityChallenge
from app.integrations.email_models import EmailOutbox


class ComplianceRepository:
    """Database operations used by ComplianceService.

    This repository deliberately does not commit. The service owns the
    transaction boundary for each compliance operation.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_export_clients(self, workspace_id: str) -> list[Client]:
        result = await self.db.execute(
            select(Client)
            .where(Client.workspace_id == workspace_id)
            .order_by(Client.name.asc())
        )
        return list(result.scalars().all())

    async def get_export_invoices(self, workspace_id: str) -> list[Invoice]:
        result = await self.db.execute(
            select(Invoice)
            .where(Invoice.workspace_id == workspace_id)
            .order_by(Invoice.sequence_number.asc(), Invoice.created_at.asc())
        )
        return list(result.scalars().all())

    async def get_export_claims(
        self,
        invoice_ids: list[str],
    ) -> list[PaymentClaim]:
        if not invoice_ids:
            return []

        result = await self.db.execute(
            select(PaymentClaim)
            .where(PaymentClaim.invoice_id.in_(invoice_ids))
            .order_by(PaymentClaim.created_at.asc())
        )
        return list(result.scalars().all())

    async def get_workspace_export_data(
        self,
        workspace_id: str,
    ) -> tuple[list[Client], list[Invoice], list[PaymentClaim]]:
        clients = await self.get_export_clients(workspace_id)
        invoices = await self.get_export_invoices(workspace_id)
        claims = await self.get_export_claims(
            [invoice.id for invoice in invoices]
        )
        return clients, invoices, claims

    async def get_user_for_update(self, user_id: str) -> User | None:
        result = await self.db.execute(
            select(User)
            .where(User.id == user_id)
            .with_for_update()
        )
        return result.scalars().first()

    async def get_login_codes(self, email: str) -> list[MagicLoginCode]:
        result = await self.db.execute(
            select(MagicLoginCode).where(MagicLoginCode.email == email)
        )
        return list(result.scalars().all())

    async def revoke_all_sessions(
        self,
        user_id: str,
        revoked_at: datetime,
    ) -> int:
        result = await self.db.execute(
            update(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.revoked_at.is_(None),
            )
            .values(revoked_at=revoked_at)
        )
        return result.rowcount or 0

    async def delete_login_codes(self, email: str) -> list[str]:
        result = await self.db.execute(
            select(MagicLoginCode.id).where(
                MagicLoginCode.email == email
            )
        )
        challenge_ids = list(result.scalars().all())

        await self.db.execute(
            delete(MagicLoginCode).where(
                MagicLoginCode.email == email
            )
        )

        return challenge_ids

    async def delete_security_challenges(self, user_id: str) -> None:
        await self.db.execute(
            delete(SecurityChallenge).where(
                SecurityChallenge.user_id == user_id
            )
        )

    async def delete_recovery_codes(self, user_id: str) -> None:
        await self.db.execute(
            delete(AccountRecoveryCode).where(
                AccountRecoveryCode.user_id == user_id
            )
        )

    async def delete_user_notifications(self, user_id: str) -> None:
        # Notifications are user-specific UI data, not financial records.
        await self.db.execute(
            delete(Notification).where(
                Notification.recipient_user_id == user_id
            )
        )

    async def anonymise_email_change_requests(
        self,
        user_id: str,
        placeholder_email: str,
        now: datetime,
    ) -> list[str]:
        result = await self.db.execute(
            select(EmailChangeRequest).where(
                EmailChangeRequest.user_id == user_id
            )
        )
        requests = list(result.scalars().all())

        request_ids: list[str] = []

        for request in requests:
            request_ids.append(request.id)
            request.current_email = placeholder_email
            request.new_email = placeholder_email
            request.current_code_hash = None
            request.new_code_hash = None
            request.current_code_expires_at = None
            request.new_code_expires_at = None
            request.cancelled_at = now

        return request_ids

    async def supersede_pending_email_messages(
        self,
        aggregate_ids: list[str],
        now: datetime,
    ) -> None:
        if not aggregate_ids:
            return

        new_status = case(
            (
                EmailOutbox.status.in_(["pending", "processing"]),
                "superseded",
            ),
            else_=EmailOutbox.status,
        )

        await self.db.execute(
            update(EmailOutbox)
            .where(EmailOutbox.aggregate_id.in_(aggregate_ids))
            .values(
                status=new_status,
                encrypted_payload=None,
                locked_at=None,
                locked_by=None,
                updated_at=now,
            )
        )

    @staticmethod
    def anonymise_user(
        user: User,
        placeholder_email: str,
        now: datetime,
    ) -> None:
        user.email = placeholder_email
        user.full_name = None
        user.phone = None
        user.avatar_url = None
        user.is_active = False
        user.updated_at = now