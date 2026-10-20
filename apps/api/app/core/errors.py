from fastapi import HTTPException, status


class BaggException(HTTPException):
    def __init__(self, status_code: int, detail: str, code: str = "BAGG_ERROR"):
        super().__init__(status_code=status_code, detail=detail)
        self.code = code


class NotFoundException(BaggException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail, code="NOT_FOUND")


class ConflictException(BaggException):
    def __init__(self, detail: str = "Resource conflict"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail, code="CONFLICT")


class BadRequestException(BaggException):
    def __init__(self, detail: str = "Bad request"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail, code="BAD_REQUEST")
