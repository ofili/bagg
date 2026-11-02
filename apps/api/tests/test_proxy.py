from types import SimpleNamespace

import pytest

from app.core import proxy


def make_request(
    peer: str,
    headers: dict | None = None,
):
    return SimpleNamespace(
        client=SimpleNamespace(host=peer),
        headers=headers or {},
    )


@pytest.fixture(autouse=True)
def trusted_networks(monkeypatch):
    monkeypatch.setattr(
        proxy,
        "_trusted_networks",
        lambda: (
            proxy.ipaddress.ip_network("10.0.0.0/8"),
            proxy.ipaddress.ip_network("172.16.0.0/12"),
        ),
    )


def test_direct_client_cannot_spoof_forwarded_ip():
    request = make_request(
        "203.0.113.10",
        {
            "x-forwarded-for": "198.51.100.20",
            "x-real-ip": "198.51.100.30",
            "cf-connecting-ip": "198.51.100.40",
        },
    )

    assert proxy.get_client_ip(request) == "203.0.113.10"


def test_trusted_proxy_uses_forwarded_client_ip():
    request = make_request(
        "10.0.0.5",
        {
            "x-forwarded-for": "203.0.113.10",
        },
    )

    assert proxy.get_client_ip(request) == "203.0.113.10"


def test_multiple_trusted_proxies_resolve_original_client():
    request = make_request(
        "10.0.0.5",
        {
            "x-forwarded-for": ("203.0.113.10, " "10.0.0.2, " "172.16.0.4"),
        },
    )

    assert proxy.get_client_ip(request) == "203.0.113.10"


def test_untrusted_forwarded_address_is_not_used():
    request = make_request(
        "203.0.113.10",
        {
            "x-forwarded-for": "198.51.100.20",
        },
    )

    assert proxy.get_client_ip(request) == "203.0.113.10"


def test_malformed_forwarded_chain_falls_back_to_peer():
    request = make_request(
        "10.0.0.5",
        {
            "x-forwarded-for": "not-an-ip, 203.0.113.10",
        },
    )

    assert proxy.get_client_ip(request) == "10.0.0.5"


def test_cloudflare_header_requires_trusted_peer():
    request = make_request(
        "203.0.113.10",
        {
            "cf-connecting-ip": "198.51.100.20",
        },
    )

    assert proxy.get_client_ip(request) == "203.0.113.10"


def test_cloudflare_header_accepted_from_trusted_peer():
    request = make_request(
        "10.0.0.5",
        {
            "cf-connecting-ip": "203.0.113.10",
        },
    )

    assert proxy.get_client_ip(request) == "203.0.113.10"


def test_ipv6_forwarded_address():
    request = make_request(
        "10.0.0.5",
        {
            "x-forwarded-for": "2001:db8::1",
        },
    )

    assert proxy.get_client_ip(request) == "2001:db8::1"
