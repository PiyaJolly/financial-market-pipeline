# Financial Market Pipeline (Backend)

A FastAPI service that ingests daily stock market data, transforms it, caches it,
and serves it through a rate-limited REST API.

Status: in progress.

## Architecture

- **config**: environment-based settings, no secrets in code
- **services**: external data ingestion and transformation (ETL)
- **cache**: in-memory TTL cache to limit external API calls
- **routers**: REST endpoints with input validation and rate limiting
- **models**: typed request and response schemas

## Endpoints

- `GET /health` returns service status
- `GET /api/market/{symbol}` returns daily price history for a ticker

## Running locally

1. Create a virtual environment and install dependencies
2. Copy `.env.example` to `.env` and add an Alpha Vantage API key
3. Run `uvicorn app.main:app --reload`
4. Open http://localhost:8000/docs for interactive API documentation

## Testing

Run `pytest`. The external provider is mocked, so tests do not use network or quota.

## Docker

Build with `docker build -t market-pipeline .` and run with
`docker run -p 8000:8000 --env-file .env market-pipeline`.