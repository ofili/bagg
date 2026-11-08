"""
Phase 0 Integrity Fixes — apply_phase0.py
Run from repo root: python apply_phase0.py
Delete after successful run.
"""
import re

print("=== Applying Phase 0 Integrity Fixes ===")

# ─────────────────────────────────────────────────────────────
# Helper: try LF then CRLF replacement; return (code, matched)
# ─────────────────────────────────────────────────────────────
def replace_block(code, old, new, label):
    if old in code:
        print(f"  Fixed {label} (LF)")
        return code.replace(old, new), True
    old_crlf = old.replace('\n', '\r\n')
    new_crlf = new.replace('\n', '\r\n')
    if old_crlf in code:
        print(f"  Fixed {label} (CRLF)")
        return code.replace(old_crlf, new_crlf), True
    print(f"  WARNING: Could not match {label}")
    return code, False


# ═══════════════════════════════════════════════════════════════
# P0-1: invoices/service.py — finalize_invoice numbering
# ═══════════════════════════════════════════════════════════════
print("\n[P0-1] invoices/service.py — finalize_invoice numbering")
inv_path = 'apps/api/app/domains/invoices/service.py'
with open(inv_path, 'r', encoding='utf-8') as f:
    inv_code = f.read()

# The exact block inside finalize_invoice (CRLF file, use LF; helper handles both)
old_finalize = (
    "    seq = workspace.next_invoice_number\n"
    "    workspace.next_invoice_number = seq + 1\n"
    "\n"
    "    old_status = invoice.status\n"
    "    invoice.status = \"issued\"\n"
    "    invoice.invoice_number = f\"{workspace.invoice_prefix}{seq:04d}\"\n"
    "    invoice.sequence_number = seq"
)
new_finalize = (
    "    old_status = invoice.status\n"
    "    invoice.status = \"issued\"\n"
    "    if not invoice.invoice_number:\n"
    "        seq = workspace.next_invoice_number\n"
    "        workspace.next_invoice_number = seq + 1\n"
    "        invoice.invoice_number = f\"{workspace.invoice_prefix}{seq:04d}\"\n"
    "        invoice.sequence_number = seq"
)
inv_code, _ = replace_block(inv_code, old_finalize, new_finalize, "finalize_invoice numbering")

# ─────────────────────────────────────────────────────────────
# P0-2: invoices/service.py — send_invoice delivery truth + atomic quota
# ─────────────────────────────────────────────────────────────
print("\n[P0-2] invoices/service.py — send_invoice delivery truth")

old_send_inv = (
    "    recipient_email = client.email\n"
    "    email_sent = False\n"
    "    if send_email:\n"
    "        if recipient_email:\n"
    "            await check_delivery_quota(workspace, db)\n"
    "            email_sent = await EmailSender().send_invoice_email(\n"
    "                to_email=recipient_email,\n"
    "                invoice_number=invoice.invoice_number,\n"
    "                share_url=share_url,\n"
    "            )\n"
    "            if email_sent:\n"
    "                invoice.email_delivery_status = \"delivered\"\n"
    "                await consume_delivery_send(workspace, db)\n"
    "            else:\n"
    "                invoice.email_delivery_status = \"failed\"\n"
    "        else:\n"
    "            invoice.email_delivery_status = \"no_email\"\n"
    "\n"
    "    old_status = invoice.status\n"
    "    if invoice.status in {\"issued\", \"sent\"}:\n"
    "        invoice.status = \"sent\"\n"
    "    invoice.sent_at = datetime.now(timezone.utc)"
)
new_send_inv = (
    "    recipient_email = client.email\n"
    "    email_sent = False\n"
    "    if send_email:\n"
    "        if recipient_email:\n"
    "            deduct_credit = await check_delivery_quota(workspace, db)\n"
    "            email_sent = await EmailSender().send_invoice_email(\n"
    "                to_email=recipient_email,\n"
    "                invoice_number=invoice.invoice_number,\n"
    "                share_url=share_url,\n"
    "            )\n"
    "            if email_sent:\n"
    "                invoice.email_delivery_status = \"delivered\"\n"
    "                await consume_delivery_send(workspace, db, deduct_credit=deduct_credit)\n"
    "            else:\n"
    "                invoice.email_delivery_status = \"failed\"\n"
    "        else:\n"
    "            invoice.email_delivery_status = \"no_email\"\n"
    "\n"
    "    old_status = invoice.status\n"
    "    if email_sent:\n"
    "        if invoice.status in {\"issued\", \"sent\"}:\n"
    "            invoice.status = \"sent\"\n"
    "        invoice.sent_at = datetime.now(timezone.utc)"
)
inv_code, _ = replace_block(inv_code, old_send_inv, new_send_inv, "send_invoice delivery truth")

with open(inv_path, 'w', encoding='utf-8') as f:
    f.write(inv_code)
print("  Wrote invoices/service.py")


# ═══════════════════════════════════════════════════════════════
# P0-4: quotes/service.py — add logging import, finalize guard, send truth
# ═══════════════════════════════════════════════════════════════
print("\n[P0-4] quotes/service.py — logger + finalize guard + send truth")
quote_path = 'apps/api/app/domains/quotes/service.py'
with open(quote_path, 'r', encoding='utf-8') as f:
    quote_code = f.read()

# Add logging import at top if missing
if 'import logging' not in quote_code:
    quote_code = "import logging\n\nlogger = logging.getLogger(__name__)\n\n" + quote_code
    print("  Added logger import")
else:
    print("  logging already imported")

# Guard finalize_quote numbering (quotes already get a number on create,
# but finalize should not re-assign)
old_q_finalize = (
    "    old_status = quote_obj.status\n"
    "    quote_obj.status = \"issued\"\n"
    "    _ensure_share_token(quote_obj)"
)
new_q_finalize = (
    "    old_status = quote_obj.status\n"
    "    quote_obj.status = \"issued\"\n"
    "    if not quote_obj.quote_number:\n"
    "        seq = workspace.next_quote_number\n"
    "        workspace.next_quote_number = seq + 1\n"
    "        quote_obj.quote_number = f\"{workspace.quote_prefix}{seq:04d}\"\n"
    "        quote_obj.sequence_number = seq\n"
    "    _ensure_share_token(quote_obj)"
)
quote_code, _ = replace_block(quote_code, old_q_finalize, new_q_finalize, "finalize_quote numbering guard")

# Capture deduct_credit return from check_delivery_quota
old_q_quota = "            await check_delivery_quota(workspace, db)\n"
new_q_quota = "            deduct_credit = await check_delivery_quota(workspace, db)\n"
quote_code, matched = replace_block(quote_code, old_q_quota, new_q_quota, "quotes check_delivery_quota capture")
if not matched:
    # Try without leading spaces
    old_q_quota2 = "await check_delivery_quota(workspace, db)\n"
    new_q_quota2 = "deduct_credit = await check_delivery_quota(workspace, db)\n"
    quote_code, _ = replace_block(quote_code, old_q_quota2, new_q_quota2, "quotes check_delivery_quota capture (no-indent)")

# Fix send_quote: consume_delivery_send + delivery truth
old_q_send = (
    "            if email_sent:\n"
    "                quote_obj.email_delivery_status = \"delivered\"\n"
    "                await consume_delivery_send(workspace, db)\n"
    "            else:\n"
    "                quote_obj.email_delivery_status = \"failed\"\n"
    "        else:\n"
    "            quote_obj.email_delivery_status = \"no_email\"\n"
    "\n"
    "    old_status = quote_obj.status\n"
    "    if quote_obj.status in {\"issued\", \"sent\"}:\n"
    "        quote_obj.status = \"sent\"\n"
    "    quote_obj.sent_at = datetime.now(timezone.utc)"
)
new_q_send = (
    "            if email_sent:\n"
    "                quote_obj.email_delivery_status = \"delivered\"\n"
    "                await consume_delivery_send(workspace, db, deduct_credit=deduct_credit)\n"
    "            else:\n"
    "                quote_obj.email_delivery_status = \"failed\"\n"
    "        else:\n"
    "            quote_obj.email_delivery_status = \"no_email\"\n"
    "\n"
    "    old_status = quote_obj.status\n"
    "    if email_sent:\n"
    "        if quote_obj.status in {\"issued\", \"sent\"}:\n"
    "            quote_obj.status = \"sent\"\n"
    "        quote_obj.sent_at = datetime.now(timezone.utc)"
)
quote_code, _ = replace_block(quote_code, old_q_send, new_q_send, "send_quote delivery truth")

with open(quote_path, 'w', encoding='utf-8') as f:
    f.write(quote_code)
print("  Wrote quotes/service.py")


# ═══════════════════════════════════════════════════════════════
# P0-3: billing/service.py — atomic quota check + consume
# ═══════════════════════════════════════════════════════════════
print("\n[P0-3] billing/service.py — check_delivery_quota + consume_delivery_send")
bill_path = 'apps/api/app/domains/billing/service.py'
with open(bill_path, 'r', encoding='utf-8') as f:
    bill_code = f.read()

old_bill = (
    "async def check_delivery_quota(workspace: Workspace, db: AsyncSession) -> bool:\n"
    "    \"\"\"\n"
    "    Free Tier Metering & Delivery Quota Guard (US-SUB-01).\n"
    "    - Pro & Professional tiers have unlimited sends.\n"
    "    - Free tier has 3 free sends per calendar month.\n"
    "    - 4th+ send requires paid credits or Creator Pro upgrade.\n"
    "    \"\"\"\n"
    "    if workspace.tier in [\"creator_pro\", \"professional\"]:\n"
    "        return True\n"
    "\n"
    "    used = await get_free_sends_used_this_month(workspace.id, db)\n"
    "    if used < FREE_TIER_MONTHLY_SENDS_LIMIT:\n"
    "        return True\n"
    "\n"
    "    balance = await get_credit_balance(workspace.id, db)\n"
    "    if balance >= 1:\n"
    "        return True\n"
    "\n"
    "    raise HTTPException(\n"
    "        status_code=402,\n"
    "        detail=\"Free monthly send allowance reached (3/month). Upgrade to Creator Pro or purchase send credits to continue.\",\n"
    "    )\n"
    "\n"
    "\n"
    "async def consume_delivery_send(workspace: Workspace, db: AsyncSession) -> None:\n"
    "    if workspace.tier in [\"creator_pro\", \"professional\"]:\n"
    "        return\n"
    "\n"
    "    used = await get_free_sends_used_this_month(workspace.id, db)\n"
    "    # If this send is beyond the free quota, deduct 1 credit\n"
    "    if used >= FREE_TIER_MONTHLY_SENDS_LIMIT:\n"
    "        await add_credits(\n"
    "            workspace_id=workspace.id,\n"
    "            amount=-1,\n"
    "            reason=\"send_deduction\",\n"
    "            description=\"Metered invoice delivery send deduction\",\n"
    "            reference=None,\n"
    "            db=db,\n"
    "        )"
)
new_bill = (
    "async def check_delivery_quota(workspace: Workspace, db: AsyncSession) -> bool:\n"
    "    \"\"\"\n"
    "    Free Tier Metering & Delivery Quota Guard (US-SUB-01).\n"
    "    - Pro & Professional tiers have unlimited sends.\n"
    "    - Free tier has 3 free sends per calendar month.\n"
    "    - 4th+ send requires paid credits or Creator Pro upgrade.\n"
    "\n"
    "    Returns True if a credit must be deducted upon delivery,\n"
    "    False if covered by free tier or paid tier.\n"
    "    Raises HTTPException(402) if free allowance is exhausted and credit balance < 1.\n"
    "    \"\"\"\n"
    "    if workspace.tier in [\"creator_pro\", \"professional\"]:\n"
    "        return False\n"
    "\n"
    "    used = await get_free_sends_used_this_month(workspace.id, db)\n"
    "    if used < FREE_TIER_MONTHLY_SENDS_LIMIT:\n"
    "        return False\n"
    "\n"
    "    balance = await get_credit_balance(workspace.id, db)\n"
    "    if balance >= 1:\n"
    "        return True\n"
    "\n"
    "    raise HTTPException(\n"
    "        status_code=402,\n"
    "        detail=\"Free monthly send allowance reached (3/month). Upgrade to Creator Pro or purchase send credits to continue.\",\n"
    "    )\n"
    "\n"
    "\n"
    "async def consume_delivery_send(\n"
    "    workspace: Workspace, db: AsyncSession, deduct_credit: bool = False\n"
    ") -> None:\n"
    "    \"\"\"\n"
    "    Consumes a delivery send slot. Deducts 1 credit only when deduct_credit is True,\n"
    "    meaning the pre-send quota check already confirmed a credit is available.\n"
    "    No post-send 402 can occur because quota validation runs before delivery.\n"
    "    \"\"\"\n"
    "    if not deduct_credit or workspace.tier in [\"creator_pro\", \"professional\"]:\n"
    "        return\n"
    "\n"
    "    await add_credits(\n"
    "        workspace_id=workspace.id,\n"
    "        amount=-1,\n"
    "        reason=\"send_deduction\",\n"
    "        description=\"Metered invoice delivery send deduction\",\n"
    "        reference=None,\n"
    "        db=db,\n"
    "    )"
)
bill_code, _ = replace_block(bill_code, old_bill, new_bill, "billing quota + consume")

with open(bill_path, 'w', encoding='utf-8') as f:
    f.write(bill_code)
print("  Wrote billing/service.py")


# ═══════════════════════════════════════════════════════════════
# P0-5: dashboard/NewQuoteDesktop.tsx — isEmpty condition
# ═══════════════════════════════════════════════════════════════
print("\n[P0-5] dashboard/NewQuoteDesktop.tsx — isEmpty condition")
dash_path = 'apps/web/src/app/(app)/dashboard/page.tsx'
with open(dash_path, 'r', encoding='utf-8') as f:
    dash_code = f.read()

old_dash = "const isEmpty = !loading && !failed && metrics.length === 0;"
new_dash = (
    "const isEmpty =\n"
    "    !loading &&\n"
    "    !failed &&\n"
    "    (metrics.length === 0 || metrics.every((m) => (m.invoices_count ?? 0) === 0));"
)
dash_code, _ = replace_block(dash_code, old_dash, new_dash, "isEmpty condition")

with open(dash_path, 'w', encoding='utf-8') as f:
    f.write(dash_code)
print("  Wrote dashboard/NewQuoteDesktop.tsx")


# ═══════════════════════════════════════════════════════════════
# P0-6a: auth/schemas.py — add is_new_user to AuthResponse
# ═══════════════════════════════════════════════════════════════
print("\n[P0-6a] auth/schemas.py — AuthResponse.is_new_user")
schema_path = 'apps/api/app/domains/auth/schemas.py'
with open(schema_path, 'r', encoding='utf-8') as f:
    schema_code = f.read()

old_resp = (
    "class AuthResponse(BaseModel):\n"
    "    user: UserResponse\n"
    "    workspace: WorkspaceResponse\n"
    "    message: str = \"Authenticated successfully\""
)
new_resp = (
    "class AuthResponse(BaseModel):\n"
    "    user: UserResponse\n"
    "    workspace: WorkspaceResponse\n"
    "    is_new_user: bool = False\n"
    "    message: str = \"Authenticated successfully\""
)
schema_code, matched = replace_block(schema_code, old_resp, new_resp, "AuthResponse")
if not matched:
    # Try alternate message string
    old_resp2 = (
        "class AuthResponse(BaseModel):\n"
        "    user: UserResponse\n"
        "    workspace: WorkspaceResponse\n"
        "    message: str = \"Successfully authenticated\""
    )
    new_resp2 = (
        "class AuthResponse(BaseModel):\n"
        "    user: UserResponse\n"
        "    workspace: WorkspaceResponse\n"
        "    is_new_user: bool = False\n"
        "    message: str = \"Successfully authenticated\""
    )
    schema_code, _ = replace_block(schema_code, old_resp2, new_resp2, "AuthResponse (alt message)")

with open(schema_path, 'w', encoding='utf-8') as f:
    f.write(schema_code)
print("  Wrote auth/schemas.py")


# ═══════════════════════════════════════════════════════════════
# P0-6b: auth/service.py — verify_login returns is_new_user
# ═══════════════════════════════════════════════════════════════
print("\n[P0-6b] auth/service.py — verify_login is_new_user")
srv_path = 'apps/api/app/domains/auth/service.py'
with open(srv_path, 'r', encoding='utf-8') as f:
    srv_code = f.read()

# 1. Fix return type annotation
srv_code = re.sub(
    r'(async def verify_login\(\s*self,\s*email:\s*str,\s*code:\s*str,\s*\)\s*->\s*)tuple\[User,\s*Workspace,\s*str\]:',
    r'\1tuple[User, Workspace, str, bool]:',
    srv_code,
)
print("  Patched verify_login return type")

# 2. Insert is_new_user flag on new-user creation (the 'if user is None:' block)
old_new_user = (
    "        if user is None:\n"
    "            user = User(email=clean_email, is_active=True)\n"
    "            self.db.add(user)\n"
    "            await self.db.flush()"
)
new_new_user = (
    "        is_new_user = user is None\n"
    "        if user is None:\n"
    "            user = User(email=clean_email, is_active=True)\n"
    "            self.db.add(user)\n"
    "            await self.db.flush()"
)
srv_code, _ = replace_block(srv_code, old_new_user, new_new_user, "is_new_user flag injection")

# 3. Update the return tuple
old_ret = "        return user, workspace, raw_session_token"
new_ret = "        return user, workspace, raw_session_token, is_new_user"
srv_code, matched = replace_block(srv_code, old_ret, new_ret, "verify_login return tuple")
if not matched:
    # CRLF already handled by helper, but try without leading spaces
    old_ret2 = "return user, workspace, raw_session_token"
    new_ret2 = "return user, workspace, raw_session_token, is_new_user"
    srv_code, _ = replace_block(srv_code, old_ret2, new_ret2, "verify_login return tuple (no indent)")

with open(srv_path, 'w', encoding='utf-8') as f:
    f.write(srv_code)
print("  Wrote auth/service.py")


# ═══════════════════════════════════════════════════════════════
# P0-6c: auth/router.py — unpack is_new_user, pass to AuthResponse
# ═══════════════════════════════════════════════════════════════
print("\n[P0-6c] auth/router.py — unpack and return is_new_user")
router_path = 'apps/api/app/domains/auth/router.py'
with open(router_path, 'r', encoding='utf-8') as f:
    router_code = f.read()

# Unpack the 4-tuple
old_unpack = "    user, workspace, session_token = await service.verify_login("
new_unpack = "    user, workspace, session_token, is_new_user = await service.verify_login("
router_code, _ = replace_block(router_code, old_unpack, new_unpack, "verify_login unpack")

# Add is_new_user= to the AuthResponse call.
# The actual router uses WorkspaceResponse(...) with full kwargs, not model_validate.
# We insert is_new_user= before message= regardless of the WorkspaceResponse shape
# by targeting "message=..." in the AuthResponse block.
old_msg = "        message=\"Successfully authenticated\","
new_msg = "        is_new_user=is_new_user,\n        message=\"Successfully authenticated\","
router_code, matched = replace_block(router_code, old_msg, new_msg, "AuthResponse message field")
if not matched:
    old_msg2 = "        message=\"Authenticated successfully\","
    new_msg2 = "        is_new_user=is_new_user,\n        message=\"Authenticated successfully\","
    router_code, _ = replace_block(router_code, old_msg2, new_msg2, "AuthResponse message field (alt)")

with open(router_path, 'w', encoding='utf-8') as f:
    f.write(router_code)
print("  Wrote auth/router.py")


print("\n=== Phase 0 complete. Review WARNINGs above before committing. ===")
