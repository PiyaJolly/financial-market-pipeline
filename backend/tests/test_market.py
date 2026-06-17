from fastapi.testclient import TestClient

import app.routers.market as market_module
from app.main import app
from app.models import PricePoint

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_invalid_symbol():
    r = client.get("/api/market/123")
    assert r.status_code == 400


def test_valid_symbol_mocked(monkeypatch):
    sample = [PricePoint(date="2024-01-01", open=1, high=2, low=0.5, close=1.5, volume=100)]

    async def fake_fetch(symbol):
        return sample

    monkeypatch.setattr(market_module, "fetch_daily", fake_fetch)
    market_module.cache.clear()

    r = client.get("/api/market/AAPL")
    assert r.status_code == 200
    body = r.json()
    assert body["symbol"] == "AAPL"
    assert body["cached"] is False
    assert len(body["points"]) == 1

    r2 = client.get("/api/market/AAPL")
    assert r2.json()["cached"] is True