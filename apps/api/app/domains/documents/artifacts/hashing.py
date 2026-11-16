import hashlib


def sha256_hex(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def verify_sha256(content: bytes, expected: str) -> bool:
    return sha256_hex(content) == expected
