# API Benchmark Lab

MVP fullstack aplikacji do uruchamiania kontrolowanych benchmarków endpointów HTTP.

## Stack

- Frontend: Next.js, TypeScript, Tailwind
- API: Java Spring Boot
- Worker: Python asyncio + aiohttp
- Queue/pub-sub: Redis
- Database: PostgreSQL
- Local runtime: Docker Compose

## Start

```bash
docker compose up --build
```

Po starcie:

- Frontend: http://localhost:3000
- API: http://localhost:8080
- Test target: http://localhost:8080/api/test-target

Domyślny formularz benchmarku używa lokalnego endpointu testowego. W Compose worker przepisuje `localhost` na serwis `api` tylko dla wewnętrznego requestu, więc użytkownik dalej podaje bezpieczny URL `http://localhost:8080/api/test-target`.

## API

- `POST /api/benchmarks`
- `GET /api/benchmarks`
- `GET /api/benchmarks/{id}`
- `GET /api/benchmarks/{id}/events`
- `GET /api/test-target`

## Redis

- Queue: `benchmark_jobs`
- PubSub metrics: `benchmark_metrics:{benchmarkId}`
- PubSub status: `benchmark_status:{benchmarkId}`

## MVP safety limits

- Allowed targets: `localhost`, `127.0.0.1`, `::1`, `example.com`, `www.example.com`
- Private IPs are blocked except localhost
- Methods: `GET`, `POST`
- `durationSeconds`: max 60
- `concurrency`: max 100
- Request body JSON: max 50 KB
- Worker request timeout: 10 seconds

## Database Tables

- `benchmarks`
- `benchmark_results`
- `benchmark_metric_points`

Schema is initialized from `postgres/init.sql`; Spring JPA also runs with `ddl-auto=update` for local MVP convenience.
