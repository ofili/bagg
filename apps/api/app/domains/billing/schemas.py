from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class CreditBalanceResponse(BaseModel):
    workspace_id: str
    balance: int
    tier: str = "free"

class CreditTransaction(BaseModel):
    id: str
    amount: int
    reason: str
    created_at: datetime
