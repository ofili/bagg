from typing import Optional
from fastapi import Header, HTTPException, status

async def verify_idempotency_key(
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")
) -> Optional[str]:
    """
    Validates idempotency key header format if supplied.
    """
    if idempotency_key is not None and len(idempotency_key.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Idempotency-Key header cannot be empty if provided"
        )
    return idempotency_key
