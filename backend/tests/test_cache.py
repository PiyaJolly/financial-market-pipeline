import time

from app.cache import TTLCache


def test_cache_set_get():
    c = TTLCache(ttl_seconds=60)
    c.set("AAPL", [1, 2, 3])
    assert c.get("AAPL") == [1, 2, 3]


def test_cache_expiry():
    c = TTLCache(ttl_seconds=1)
    c.set("AAPL", [1])
    time.sleep(1.1)
    assert c.get("AAPL") is None


def test_cache_miss():
    c = TTLCache(ttl_seconds=60)
    assert c.get("MSFT") is None