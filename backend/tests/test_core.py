# Pure-logic unit tests for backend/main.py (testing-observability report T1).
#
# These exercise the deterministic, no-network helpers only:
#   _is_public_ip / _client_ip  - the rate-limit IP derivation that silently
#                                  disabled ALL rate limiting in prod for ~9
#                                  days (v0.46 to v0.50) when the wrong
#                                  X-Forwarded-For index was read.
#   check_rate_limit            - the actual blocking behavior.
#   safe_float / safe_int       - NaN/Inf/None hardening on financial inputs.
#
# Importing `main` is sufficient; nothing here hits the network, Supabase, or
# Anthropic. Run with: pytest -q backend/tests
import pytest
import main


class _Req:
    """Minimal Request stand-in: _client_ip only reads .headers and .client."""

    def __init__(self, headers):
        self.headers = headers
        self.client = None


# ---- _is_public_ip / _client_ip (the rate-limit regression that bit prod) ----

@pytest.mark.parametrize("ip,expected", [
    ("8.8.8.8", True),
    ("1.1.1.1", True),
    ("10.0.0.1", False),          # private
    ("192.168.1.5", False),       # private
    ("127.0.0.1", False),         # loopback
    ("169.254.1.1", False),       # link-local
    ("100.64.0.3", False),        # Railway CGNAT - must be excluded
    ("100.127.255.254", False),   # CGNAT upper bound
    ("::1", False),               # ipv6 loopback
    ("2606:4700:4700::1111", True),
    ("not-an-ip", False),
])
def test_is_public_ip(ip, expected):
    assert main._is_public_ip(ip) is expected


def test_client_ip_picks_real_client_through_cgnat_hops():
    # Railway appends internal CGNAT hops to the RIGHT of the true client IP.
    req = _Req({"X-Forwarded-For": "203.0.113.7, 100.64.0.1, 100.64.0.9"})
    assert main._client_ip(req) == "203.0.113.7"


def test_client_ip_ignores_left_spoof():
    # A client-injected spoof sits to the LEFT and must be skipped.
    req = _Req({"X-Forwarded-For": "1.2.3.4, 203.0.113.7, 100.64.0.1"})
    assert main._client_ip(req) == "203.0.113.7"


def test_client_ip_all_private_falls_back_deterministically():
    req = _Req({"X-Forwarded-For": "10.0.0.1, 10.0.0.2"})
    assert main._client_ip(req) == "10.0.0.2"


# ---- check_rate_limit (the actual blocking behavior) ----

def test_rate_limit_trips_after_quota():
    ip = "203.0.113.55"
    ep = "unit-test-endpoint"
    blocked = [main.check_rate_limit(ip, ep, max_requests=3, window_seconds=3600)
               for _ in range(4)]
    assert blocked == [False, False, False, True]


def test_rate_limit_isolated_per_ip():
    assert main.check_rate_limit("a", "ep2", 1, 3600) is False
    assert main.check_rate_limit("b", "ep2", 1, 3600) is False  # different bucket
    assert main.check_rate_limit("a", "ep2", 1, 3600) is True   # a is now over


# ---- safe_float / safe_int NaN-Inf hardening ----

def test_safe_float_handles_nan_inf():
    assert main.safe_float(float("nan")) == 0.0
    assert main.safe_float(float("inf")) == 0.0
    assert main.safe_float("3.5") == 3.5
    assert main.safe_float(None) == 0.0


def test_safe_int_handles_nan_inf_none():
    assert main.safe_int(float("nan")) == 0
    assert main.safe_int(None) == 0
    assert main.safe_int(7.9) == 7
