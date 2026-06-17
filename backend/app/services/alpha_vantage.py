import httpx

from app.config import settings
from app.models import PricePoint

BASE_URL = "https://www.alphavantage.co/query"


class MarketDataError(Exception):
    pass


async def fetch_daily(symbol: str) -> list[PricePoint]:
    params = {
        "function": "TIME_SERIES_DAILY",
        "symbol": symbol,
        "outputsize": "compact",
        "apikey": settings.alpha_vantage_api_key,
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(BASE_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as e:
        raise MarketDataError(f"Failed to reach market data provider: {e}") from e

    # Alpha Vantage reports limits and errors inside the JSON body
    if "Note" in data or "Information" in data:
        raise MarketDataError("Market data provider rate limit reached. Try again later.")
    if "Error Message" in data:
        raise MarketDataError(f"Unknown symbol: {symbol}")

    series = data.get("Time Series (Daily)")
    if not series:
        raise MarketDataError("No data returned for symbol.")

    points = [
        PricePoint(
            date=date,
            open=float(values["1. open"]),
            high=float(values["2. high"]),
            low=float(values["3. low"]),
            close=float(values["4. close"]),
            volume=int(values["5. volume"]),
        )
        for date, values in series.items()
    ]
    points.sort(key=lambda p: p.date)
    return points