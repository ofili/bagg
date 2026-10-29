import ipaddress
from typing import Optional
from fastapi import Request


def get_client_ip(request: Request) -> str:
    """
    Extracts the real client IP address from request headers, respecting common
    reverse proxies (Cloudflare, Nginx, AWS ALB, Caddy, Next.js rewrites)
    while falling back to direct socket client.
    """
    # 1. Cloudflare header
    cf_connecting_ip = request.headers.get("cf-connecting-ip")
    if cf_connecting_ip:
        clean_ip = cf_connecting_ip.strip()
        if _is_valid_ip(clean_ip):
            return clean_ip

    # 2. X-Real-IP header
    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        clean_ip = x_real_ip.strip()
        if _is_valid_ip(clean_ip):
            return clean_ip

    # 3. X-Forwarded-For header (client is first element in comma-separated list)
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        parts = [p.strip() for p in x_forwarded_for.split(",")]
        for part in parts:
            if _is_valid_ip(part):
                return part

    # 4. Fallback to direct client host
    if request.client and request.client.host:
        return request.client.host

    return "127.0.0.1"


def _is_valid_ip(ip_str: str) -> bool:
    """Validates that a string is a valid IPv4 or IPv6 address."""
    try:
        ipaddress.ip_address(ip_str)
        return True
    except ValueError:
        return False
