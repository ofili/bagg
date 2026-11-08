"""Fix billing/service.py P0-3: atomic quota check + consume."""

path = 'apps/api/app/domains/billing/service.py'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

old_lf = (
    'async def check_delivery_quota(workspace: Workspace, db: AsyncSession) -> bool:\n'
    '    """\n'
    '    Free Tier Metering & Delivery Quota Guard (US-SUB-01).\n'
    '    - Pro & Professional tiers have unlimited sends.\n'
    '    - Free tier has 3 free sends per calendar month.\n'
    '    - 4th+ send requires paid credits or Creator Pro upgrade.\n'
    '    """\n'
    '    if workspace.tier in ["creator_pro", "professional"]:\n'
    '        return True\n'
    '\n'
    '    used = await get_free_sends_used_this_month(workspace.id, db)\n'
    '    if used < FREE_TIER_MONTHLY_SENDS_LIMIT:\n'
    '        return True\n'
    '\n'
    '    balance = await get_credit_balance(workspace.id, db)\n'
    '    if balance >= 1:\n'
    '        return True\n'
    '\n'
    '    raise HTTPException(\n'
    '        status_code=402,\n'
    '        detail=(\n'
    '            f"You have used your {FREE_TIER_MONTHLY_SENDS_LIMIT} free delivery sends for this month. "\n'
    '            "Please upgrade to Creator Pro (\u20a614,000/yr) or purchase a credit top-up pack to continue delivering invoices and quotes."\n'
    '        ),\n'
    '    )\n'
    '\n'
    '\n'
    'async def consume_delivery_send(workspace: Workspace, db: AsyncSession):\n'
    '    """\n'
    '    Consumes a delivery send. If free tier limit is reached, deducts 1 credit from the ledger (US-SUB-06).\n'
    '    """\n'
    '    if workspace.tier in ["creator_pro", "professional"]:\n'
    '        return\n'
    '\n'
    '    used = await get_free_sends_used_this_month(workspace.id, db)\n'
    '    # If this send is beyond the free quota, deduct 1 credit\n'
    '    if used >= FREE_TIER_MONTHLY_SENDS_LIMIT:\n'
    '        await add_credits(\n'
    '            workspace_id=workspace.id,\n'
    '            amount=-1,\n'
    '            reason="send_deduction",\n'
    '            description="Metered invoice delivery send deduction",\n'
    '            reference=None,\n'
    '            db=db,\n'
    '        )'
)

new_lf = (
    'async def check_delivery_quota(workspace: Workspace, db: AsyncSession) -> bool:\n'
    '    """\n'
    '    Free Tier Metering & Delivery Quota Guard (US-SUB-01).\n'
    '    - Pro & Professional tiers have unlimited sends.\n'
    '    - Free tier has 3 free sends per calendar month.\n'
    '    - 4th+ send requires paid credits or Creator Pro upgrade.\n'
    '\n'
    '    Returns True if a credit must be deducted upon delivery,\n'
    '    False if covered by the free tier or a paid tier.\n'
    '    Raises HTTPException(402) if the free allowance is exhausted and credit balance < 1.\n'
    '    """\n'
    '    if workspace.tier in ["creator_pro", "professional"]:\n'
    '        return False\n'
    '\n'
    '    used = await get_free_sends_used_this_month(workspace.id, db)\n'
    '    if used < FREE_TIER_MONTHLY_SENDS_LIMIT:\n'
    '        return False\n'
    '\n'
    '    balance = await get_credit_balance(workspace.id, db)\n'
    '    if balance >= 1:\n'
    '        return True\n'
    '\n'
    '    raise HTTPException(\n'
    '        status_code=402,\n'
    '        detail=(\n'
    '            f"You have used your {FREE_TIER_MONTHLY_SENDS_LIMIT} free delivery sends for this month. "\n'
    '            "Please upgrade to Creator Pro (\u20a614,000/yr) or purchase a credit top-up pack to continue delivering invoices and quotes."\n'
    '        ),\n'
    '    )\n'
    '\n'
    '\n'
    'async def consume_delivery_send(\n'
    '    workspace: Workspace, db: AsyncSession, deduct_credit: bool = False\n'
    ') -> None:\n'
    '    """\n'
    '    Consumes a delivery send slot. Deducts 1 credit only when deduct_credit is True,\n'
    '    meaning the pre-send quota check already confirmed a credit is available.\n'
    '    No post-send 402 can occur because quota validation runs before delivery (US-SUB-06).\n'
    '    """\n'
    '    if not deduct_credit or workspace.tier in ["creator_pro", "professional"]:\n'
    '        return\n'
    '\n'
    '    await add_credits(\n'
    '        workspace_id=workspace.id,\n'
    '        amount=-1,\n'
    '        reason="send_deduction",\n'
    '        description="Metered invoice delivery send deduction",\n'
    '        reference=None,\n'
    '        db=db,\n'
    '    )'
)

old_crlf = old_lf.replace('\n', '\r\n')
new_crlf = new_lf.replace('\n', '\r\n')

if old_crlf in code:
    code = code.replace(old_crlf, new_crlf)
    print("Matched CRLF block")
elif old_lf in code:
    code = code.replace(old_lf, new_lf)
    print("Matched LF block")
else:
    # Try to find what differs
    idx = code.find('async def check_delivery_quota')
    actual = code[idx:idx+600]
    print("FAILED. Actual content:")
    print(repr(actual))
    raise SystemExit(1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("billing/service.py patched OK")
