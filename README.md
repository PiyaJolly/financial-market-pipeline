# Financial Market Pipeline

A full-stack application that ingests daily equities data, transforms it, caches it, and serves it through a rate-limited REST API to a React dashboard. Built as a portfolio project to demonstrate end-to-end software engineering: a clean backend service, a typed API, automated tests, and a polished, state-aware frontend.

Status: in progress.

## Overview

The project has two halves that talk to each other:

- **Backend**: a FastAPI service that fetches daily price data from a third-party provider, reshapes it into a clean schema (the ETL step), caches responses to limit external calls, validates input, and applies rate limiting. It serves typed JSON and auto-generates interactive API docs.
- **Frontend**: a React and Vite dashboard that consumes the API. It charts price history, shows summary statistics, lets the user search tickers, and handles loading and error states gracefully. It also surfaces whether a response came from the cache or a fresh API call.

## Architecture

```
financial-market-pipeline/
  backend/
    app/
      config.py            environment-based settings, no secrets in code
      services/            external data ingestion and transformation (ETL)
      cache.py             in-memory TTL cache to limit external API calls
      routers/             REST endpoints with validation and rate limiting
      models.py            typed request and response schemas
      main.py              app setup, CORS, health check, router wiring
    tests/                 pytest suite (external provider mocked)
    Dockerfile
  frontend/
    src/App.jsx            the dashboard component
    ...                    Vite, Tailwind, and config
```

The separation is deliberate. The data layer (services) is isolated from the web layer (routers), so the data provider could be swapped without touching the API, and the API could change without touching the data logic.

## Tech stack

**Backend**: Python, FastAPI, httpx, Pydantic, slowapi (rate limiting), pytest, Docker.

**Frontend**: React, Vite, Tailwind CSS, Recharts, lucide-react.

## Key engineering decisions

- **Caching**: the free data tier allows a limited number of requests per day, so responses are cached with a time-to-live. Each ticker costs at most one external call per hour. The frontend shows a live or cached badge so the cache behaviour is visible.
- **Rate limiting**: endpoints are rate limited per client to protect the service and the upstream quota.
- **Graceful failure**: when the upstream limit is reached or a symbol is invalid, the API returns a clear error and the dashboard shows a clean message rather than breaking.
- **Tested in isolation**: the test suite mocks the external provider, so tests are fast and do not depend on the network or the daily quota.

## Running locally

### Backend

```
cd backend
python -m venv venv
venv\Scripts\Activate.ps1        # on Windows
pip install -r requirements.txt
copy .env.example .env           # then add an Alpha Vantage API key
uvicorn app.main:app --reload
```

Interactive API docs are then available at http://localhost:8000/docs.

### Frontend

```
cd frontend
npm install
npm run dev
```

The dashboard runs at http://localhost:5173 and expects the backend to be running.

## Testing

```
cd backend
pytest
```

The external provider is mocked, so the tests validate the cache, input handling, and endpoint logic without using the network or the API quota.

## Notes on the free tier

The data provider's free tier allows a limited number of requests per day across all tickers. The cache stretches this a long way, but heavy testing can hit the limit, at which point the API returns a clear rate-limit message by design.

## Possible future improvements

- Replace the in-memory cache with Redis so the cache survives restarts and scales across instances
- Add structured logging and request tracing
- Add a CI workflow to run the test suite on every push
- Support intraday intervals and multiple data providers behind the same interface
- Add a comparison mode to chart two tickers at once
- Bundle a small sample dataset as a fallback so the live demo always renders a chart even when the free API quota is exhausted