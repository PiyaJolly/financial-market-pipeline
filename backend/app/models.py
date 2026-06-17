from pydantic import BaseModel


class PricePoint(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class MarketResponse(BaseModel):
    symbol: str
    points: list[PricePoint]
    cached: bool
    source: str