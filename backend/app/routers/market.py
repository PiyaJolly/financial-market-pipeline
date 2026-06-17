from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings
from app.cache import TTLCache
from app.models import MarketResponse
from app.services.alpha_vantage import fetch_daily, MarketDataError

router = APIRouter(prefix="/api", tags=["market"])
cache = TTLCache(settings.cache_ttl_seconds)
limiter = Limiter(key_func=get_remote_address)


@router.get("/market/{symbol}", response_model=MarketResponse)
@limiter.limit(settings.rate_limit)
async def get_market(request: Request, symbol: str):
    symbol = symbol.upper().strip()
    if not symbol.isalpha() or len(symbol) > 6:
        raise HTTPException(status_code=400, detail="Invalid symbol format.")

    cached = cache.get(symbol)
    if cached:
        return MarketResponse(symbol=symbol, points=cached, cached=True, source="alpha_vantage")

    try:
        points = await fetch_daily(symbol)
    except MarketDataError as e:
        raise HTTPException(status_code=502, detail=str(e))

    cache.set(symbol, points)
    return MarketResponse(symbol=symbol, points=points, cached=False, source="alpha_vantage")