import math
from typing import Generic, List, TypeVar

from pydantic import BaseModel, computed_field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    per_page: int

    @computed_field
    @property
    def total_pages(self) -> int:
        if self.per_page <= 0:
            return 1
        return max(1, math.ceil(self.total / self.per_page))
