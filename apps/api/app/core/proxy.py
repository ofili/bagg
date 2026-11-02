import ipaddress
from functools import lru_cache
from typing import Union

from fastapi import Request

from app.core.config import settings

IPAddress = Union[
    ipaddress.IPv4Address,
    ipaddress.IPv6Address,
]

IPNetwork = Union[
    ipaddress.IPv4Network,
    ipaddress.IPv6Network,
]


@lru_cache(maxsize=1)
def _trusted_networks() -> tuple[IPNetwork, ...]:
    """Load explicitly trusted proxy addresses and networks."""

    configured = settings.TRUSTED_PROXY_IPS

    networks = []

    for value in configured.split(","):
        value = value.strip()

        if not value:
            continue

        networks.append(ipaddress.ip_network(value, strict=False))

    return tuple(networks)


def _parse_ip(value: str) -> IPAddress | None:
    try:
        return ipaddress.ip_address(value.strip())
    except (ValueError, AttributeError):
        return None


def _is_trusted_proxy(ip: IPAddress) -> bool:
    return any(
        ip.version == network.version and ip in network
        for network in _trusted_networks()
    )


def get_client_ip(request: Request) -> str:
    """
    Resolve the client IP using an explicitly trusted proxy chain.

    Forwarding headers are ignored unless the immediate TCP peer
    belongs to a configured trusted proxy network.

    The rightmost untrusted address in X-Forwarded-For is treated
    as the original client.
    """

    if not request.client or not request.client.host:
        return "127.0.0.1"

    peer = _parse_ip(request.client.host)

    if peer is None:
        return "127.0.0.1"

    # Direct connections must never control their rate-limit identity
    # through HTTP forwarding headers.
    if not _is_trusted_proxy(peer):
        return str(peer)

    forwarded = request.headers.get("x-forwarded-for")

    if forwarded:
        parts = [part.strip() for part in forwarded.split(",")]

        chain = [_parse_ip(part) for part in parts]

        # Reject malformed forwarding chains rather than trusting
        # a partially parsed client-supplied value.
        if not chain or any(ip is None for ip in chain):
            return str(peer)

        resolved_chain = [ip for ip in chain if ip is not None]
        resolved_chain.append(peer)

        # Remove trusted proxies from the right-hand side.
        while len(resolved_chain) > 1 and _is_trusted_proxy(resolved_chain[-1]):
            resolved_chain.pop()

        return str(resolved_chain[-1])

    # Cloudflare is supported when it is the immediate trusted peer.
    cf_ip = request.headers.get("cf-connecting-ip")

    if cf_ip:
        parsed = _parse_ip(cf_ip)

        if parsed is not None:
            return str(parsed)

    # X-Real-IP is also accepted only from a trusted immediate peer.
    real_ip = request.headers.get("x-real-ip")

    if real_ip:
        parsed = _parse_ip(real_ip)

        if parsed is not None:
            return str(parsed)

    return str(peer)
