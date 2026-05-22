# API Benchmark Lab

API Benchmark Lab is a local full-stack tool for running controlled HTTP endpoint benchmarks. It provides a Next.js dashboard, a Spring Boot API, an asynchronous Python worker, Redis-based job and event transport, and PostgreSQL persistence.

The project is intentionally scoped as an MVP: it supports safe local benchmarking, a small allowlist of target hosts, live metric streaming, and persisted final results.

## Table of Contents

- [Architecture](#architecture)
- [Runtime Services](#runtime-services)
- [Request Flow](#request-flow)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Frontend](#frontend)
- [Backend API](#backend-api)
- [Worker](#worker)
- [Redis Channels and Queues](#redis-channels-and-queues)
- [Database](#database)
- [Safety Limits](#safety-limits)
- [Local Development](#local-development)
- [Testing and Verification](#testing-and-verification)
- [Troubleshooting](#troubleshooting)
- [Known Limitations](#known-limitations)

## Architecture

The application is split into five Docker Compose services:

| Service | Role |
| --- | --- |
| `frontend` | Next.js UI for creating benchmarks, sending playground requests, and viewing live/final metrics. |
| `api` | Spring Boot REST API. Validates input, stores benchmark definitions, publishes jobs, serves SSE streams, and exposes a local test target. |
| `worker` | Python asyncio worker. Consumes benchmark jobs from Redis, executes concurrent HTTP requests, stores metrics/results, and publishes live events. |
| `redis` | Job queue and Pub/Sub transport. |
| `postgres` | Persistent storage for benchmark definitions, time-series metric points, and final summaries. |

Architecture diagram:

```mermaid
flowchart LR
    browser[Browser]
    frontend[Next.js frontend<br/>:3000]
    api[Spring Boot API<br/>:8080]
    redis[(Redis<br/>:6379)]
    postgres[(PostgreSQL<br/>:5432)]
    worker[Python asyncio worker]
    target[Target HTTP endpoint]

    browser -->|HTTP / EventSource| frontend
    frontend -->|REST API calls| api
    api -->|LPUSH benchmark job| redis
    redis -->|BRPOP benchmark job| worker
    worker -->|benchmark requests| target
    worker -->|publish metrics/status| redis
    redis -->|Pub/Sub events| api
    api -->|SSE stream| frontend
    api <-->|read/write benchmarks| postgres
    worker -->|write metrics/results| postgres
```

## Runtime Services

Docker Compose starts the following externally reachable ports:

| Host Port | Service | Purpose |
| --- | --- | --- |
| `3000` | `frontend` | Web UI |
| `8080` | `api` | REST API, SSE, built-in test target |
| `5432` | `postgres` | PostgreSQL database |
| `6379` | `redis` | Redis queue/pub-sub |

Default local URLs:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8080`
- Built-in test target: `http://localhost:8080/api/test-target`

## Request Flow

1. The user opens the frontend and creates a benchmark.
2. The frontend sends `POST /api/benchmarks` to the Spring Boot API.
3. The API validates the URL, method, headers, request body size, duration, and concurrency.
4. The API stores a `queued` benchmark row in PostgreSQL.
5. The API publishes a serialized job to the Redis list `benchmark_jobs`.
6. The worker blocks on Redis with `BRPOP`, receives the job, and validates the target again.
7. The worker updates the benchmark status to `running` and publishes a status event.
8. The worker starts `concurrency` asyncio request loops until `durationSeconds` expires.
9. Every second, the worker drains the current metric window, inserts a row into `benchmark_metric_points`, and publishes a metric event.
10. When the run finishes, the worker calculates final totals and latency percentiles, inserts a row into `benchmark_results`, marks the benchmark as `completed`, and publishes a final status event.
11. The benchmark detail page listens to `GET /api/benchmarks/{id}/events` with `EventSource` and updates charts/cards in real time.
12. After completion, the frontend reloads benchmark details to show the persisted final result.

## Technology Stack

### Frontend

- Next.js `16.2.6`
- React `19.2.4`
- TypeScript
- Tailwind CSS `4`
- Recharts `3.8.1`
- Geist font package

### API

- Java `21`
- Spring Boot `3.5.14`
- Spring Web
- Spring Data JPA
- Spring Data Redis
- Spring Validation
- Spring Actuator
- PostgreSQL JDBC driver
- Lombok

### Worker

- Python `3.12`
- `asyncio`
- `aiohttp`
- `asyncpg`
- `redis.asyncio`

### Infrastructure

- PostgreSQL `16-alpine`
- Redis `7-alpine`
- Docker Compose

## Project Structure

```text
.
|-- api/
|   |-- Dockerfile
|   |-- pom.xml
|   `-- src/
|       |-- main/java/com/apibenchmarklab/api/
|       |   |-- benchmark/      # Benchmark REST API, entities, DTOs, validation
|       |   |-- config/         # CORS, Redis listener container, exception handling
|       |   |-- http/           # Header sanitizer and localhost URL rewriting
|       |   |-- playground/     # Single-request playground endpoint
|       |   |-- redis/          # Job publisher and SSE event bridge
|       |   `-- testtarget/     # Built-in local endpoint for smoke tests
|       `-- main/resources/application.yaml
|-- frontend/
|   |-- Dockerfile
|   |-- package.json
|   `-- src/
|       |-- app/                # Next.js app routes
|       |-- components/         # UI components
|       `-- lib/                # API client and benchmark draft storage
|-- postgres/
|   `-- init.sql                # Initial schema
|-- worker/
|   |-- Dockerfile
|   |-- requirements.txt
|   `-- app/main.py             # Async benchmark runner
|-- docker-compose.yml
`-- README.md
```

## Quick Start

Requirements:

- Docker
- Docker Compose

Start the full stack:

```bash
docker compose up --build
```

Open the frontend:

```text
http://localhost:3000
```

The default benchmark form targets the built-in endpoint:

```text
http://localhost:8080/api/test-target
```

That endpoint sleeps for a random delay between 50 ms and 200 ms and returns a JSON payload. It is useful for verifying the full benchmark pipeline without depending on an external service.

Stop the stack:

```bash
docker compose down
```

Remove persisted PostgreSQL data:

```bash
docker compose down -v
```

## Configuration

### Docker Compose Defaults

The Compose file wires all services together with development-friendly defaults.

#### PostgreSQL

| Variable | Value |
| --- | --- |
| `POSTGRES_DB` | `benchmark_lab` |
| `POSTGRES_USER` | `benchmark` |
| `POSTGRES_PASSWORD` | `benchmark` |

The database data is persisted in the named volume `postgres_data`.

#### API

| Variable | Default in Compose | Description |
| --- | --- | --- |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://postgres:5432/benchmark_lab` | JDBC URL used by Spring Data JPA. |
| `SPRING_DATASOURCE_USERNAME` | `benchmark` | Database user. |
| `SPRING_DATASOURCE_PASSWORD` | `benchmark` | Database password. |
| `SPRING_DATA_REDIS_HOST` | `redis` | Redis host. |
| `SPRING_DATA_REDIS_PORT` | `6379` | Redis port. |
| `APP_CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Allowed browser origins for `/api/**`. |
| `APP_LOCALHOST_REWRITE_HOST` | `host.docker.internal` | Host used by the playground when rewriting local URLs from inside the API container. |
| `SERVER_PORT` | `8080` via `application.yaml` | API HTTP port. |

#### Worker

| Variable | Default in Compose | Description |
| --- | --- | --- |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection URL. |
| `DATABASE_URL` | `postgresql://benchmark:benchmark@postgres:5432/benchmark_lab` | asyncpg database URL. |
| `JOB_QUEUE` | `benchmark_jobs` | Redis list consumed by the worker. |
| `REQUEST_TIMEOUT_SECONDS` | `10` | Per-request worker timeout. |
| `LOCALHOST_REWRITE_HOST` | `host.docker.internal` | Host used when rewriting localhost benchmark targets from inside the worker container. |

#### Frontend

| Variable | Default in Compose | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080` | Browser-visible API base URL. Also passed as a Docker build arg. |

## Frontend

The frontend is a client-rendered Next.js app with three main screens.

### Dashboard

Route: `/`

Features:

- Lists benchmarks in reverse creation order.
- Shows total, running, and completed counts.
- Links to benchmark detail pages.
- Links to the API playground and benchmark creation form.

### New Benchmark

Route: `/benchmarks/new`

Features:

- Creates benchmark definitions.
- Supports `GET` and `POST`.
- Supports custom request headers.
- Supports JSON request body for `POST`.
- Enforces duration and concurrency limits in the form.
- Redirects to the detail page after successful creation.
- Can pre-fill URL, method, headers, and request body from the playground via `sessionStorage`.

### Benchmark Detail

Route: `/benchmarks/{id}`

Features:

- Loads persisted benchmark metadata, final result, and historical metric points.
- Opens an SSE stream with `EventSource`.
- Appends live metric points as they arrive.
- Shows live cards for RPS, average latency, p95 latency, and error rate.
- Displays a chart using Recharts.
- Displays final summary values after worker completion.

### API Playground

Route: `/playground`

Features:

- Sends a single controlled HTTP request through the backend API.
- Displays response status, latency, size, headers, body preview, and request errors.
- Truncates response body preview to 10 KB.
- Can transfer the current request draft into the benchmark creation page.

## Backend API

Base URL in local Compose:

```text
http://localhost:8080
```

### `POST /api/benchmarks`

Creates and queues a benchmark.

Request body:

```json
{
  "name": "Local API smoke test",
  "url": "http://localhost:8080/api/test-target",
  "method": "GET",
  "headers": {},
  "requestBody": null,
  "durationSeconds": 10,
  "concurrency": 10
}
```

Validation:

- `name`: required, max 160 characters.
- `url`: required, max 2048 characters.
- `method`: required, `GET` or `POST`.
- `headers`: optional object, max 50 entries.
- `requestBody`: optional JSON value, max 50 KB after serialization.
- `durationSeconds`: integer from 1 to 60.
- `concurrency`: integer from 1 to 100.

Response: `201 Created`

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "name": "Local API smoke test",
  "url": "http://localhost:8080/api/test-target",
  "method": "GET",
  "headers": {},
  "durationSeconds": 10,
  "concurrency": 10,
  "status": "queued",
  "createdAt": "2026-05-22T10:00:00Z"
}
```

Side effects:

- Inserts a row into `benchmarks`.
- Publishes a job to Redis list `benchmark_jobs`.

### `GET /api/benchmarks`

Returns all benchmarks ordered by `createdAt` descending.

Response: `200 OK`

```json
[
  {
    "id": "00000000-0000-0000-0000-000000000000",
    "name": "Local API smoke test",
    "url": "http://localhost:8080/api/test-target",
    "method": "GET",
    "headers": {},
    "durationSeconds": 10,
    "concurrency": 10,
    "status": "completed",
    "createdAt": "2026-05-22T10:00:00Z",
    "startedAt": "2026-05-22T10:00:01Z",
    "finishedAt": "2026-05-22T10:00:11Z"
  }
]
```

### `GET /api/benchmarks/{id}`

Returns benchmark metadata, final result if available, and persisted metric points.

Response: `200 OK`

```json
{
  "benchmark": {
    "id": "00000000-0000-0000-0000-000000000000",
    "name": "Local API smoke test",
    "url": "http://localhost:8080/api/test-target",
    "method": "GET",
    "headers": {},
    "durationSeconds": 10,
    "concurrency": 10,
    "status": "completed",
    "createdAt": "2026-05-22T10:00:00Z",
    "startedAt": "2026-05-22T10:00:01Z",
    "finishedAt": "2026-05-22T10:00:11Z"
  },
  "result": {
    "id": "11111111-1111-1111-1111-111111111111",
    "benchmarkId": "00000000-0000-0000-0000-000000000000",
    "totalRequests": 850,
    "successfulRequests": 850,
    "failedRequests": 0,
    "requestsPerSecond": 84.9,
    "avgLatencyMs": 117.3,
    "minLatencyMs": 51.2,
    "maxLatencyMs": 206.5,
    "p50LatencyMs": 116.8,
    "p95LatencyMs": 194.6,
    "p99LatencyMs": 201.4,
    "errorRate": 0.0,
    "createdAt": "2026-05-22T10:00:11Z"
  },
  "metricPoints": [
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "benchmarkId": "00000000-0000-0000-0000-000000000000",
      "timestamp": "2026-05-22T10:00:02Z",
      "requestsPerSecond": 82.0,
      "avgLatencyMs": 121.0,
      "p95LatencyMs": 197.4,
      "errorRate": 0.0
    }
  ]
}
```

If the benchmark does not exist, the API returns `404 Not Found`.

### `GET /api/benchmarks/{id}/events`

Opens a Server-Sent Events stream for live metric and status updates.

The API verifies that the benchmark exists, subscribes to Redis Pub/Sub channels for that benchmark, and relays Redis messages as SSE `message` events. The stream timeout is 30 minutes.

Metric event payload:

```json
{
  "benchmarkId": "00000000-0000-0000-0000-000000000000",
  "status": "running",
  "requestsPerSecond": 84.5,
  "avgLatencyMs": 118.2,
  "p95LatencyMs": 195.0,
  "errorRate": 0.0,
  "timestamp": "2026-05-22T10:00:02Z"
}
```

Status event payload:

```json
{
  "benchmarkId": "00000000-0000-0000-0000-000000000000",
  "status": "completed",
  "timestamp": "2026-05-22T10:00:11Z"
}
```

Failure status events may include an `error` field.

### `POST /api/playground/request`

Sends one HTTP request through the API and returns response diagnostics.

Request body:

```json
{
  "url": "http://localhost:8080/api/test-target",
  "method": "GET",
  "headers": {},
  "requestBody": null
}
```

Response:

```json
{
  "statusCode": 200,
  "latencyMs": 124,
  "responseSizeBytes": 72,
  "responseHeaders": {
    "content-type": ["application/json"]
  },
  "responseBodyPreview": "{\"ok\":true,\"delayMs\":123}",
  "responseBodyTruncated": false
}
```

If the target request fails at the HTTP client level, the endpoint still returns a response object with `errorMessage` set.

### `GET /api/test-target`

Built-in local endpoint for smoke tests and demos.

Behavior:

- Sleeps for a random 50-200 ms delay.
- Returns JSON with `ok`, `delayMs`, and `timestamp`.

Example response:

```json
{
  "ok": true,
  "delayMs": 137,
  "timestamp": "2026-05-22T10:00:00Z"
}
```

### Error Format

Validation and application errors return JSON shaped like:

```json
{
  "message": "Validation failed.",
  "details": ["durationSeconds must be less than or equal to 60"],
  "timestamp": "2026-05-22T10:00:00Z"
}
```

## Worker

The worker is implemented in `worker/app/main.py`.

Responsibilities:

- Wait for Redis and PostgreSQL before starting the job loop.
- Consume serialized jobs from Redis list `benchmark_jobs`.
- Re-validate target URL, method, headers, duration, and concurrency.
- Rewrite localhost targets when running inside Docker Compose.
- Execute concurrent requests using `aiohttp`.
- Track total requests, successes, failures, latencies, and one-second metric windows.
- Calculate final metrics and percentiles.
- Persist metric points and final summary rows in PostgreSQL.
- Publish live metric/status events to Redis Pub/Sub.
- Mark jobs as `failed` if processing raises an exception.

### Concurrency Model

For each benchmark, the worker creates:

- One requester task per configured concurrency unit.
- One metric ticker task.

Each requester repeatedly sends one request at a time until the benchmark stop time is reached. The metric ticker wakes every second, drains the current measurement window, writes a metric point, and publishes a Redis event.

The worker uses an `aiohttp.TCPConnector` with:

```text
limit = max(100, concurrency * 2)
ttl_dns_cache = 30
```

### Success and Failure Counting

An individual request is counted as successful when the target returns an HTTP status code from `200` through `399`.

The request is counted as failed when:

- The target returns a status outside `2xx-3xx`.
- `aiohttp` raises a client error.
- The request times out.
- DNS/socket resolution fails.

### Calculated Metrics

Per-second metric points:

- `requestsPerSecond`
- `avgLatencyMs`
- `p95LatencyMs`
- `errorRate`

Final result:

- `totalRequests`
- `successfulRequests`
- `failedRequests`
- `requestsPerSecond`
- `avgLatencyMs`
- `minLatencyMs`
- `maxLatencyMs`
- `p50LatencyMs`
- `p95LatencyMs`
- `p99LatencyMs`
- `errorRate`

Percentiles are calculated with linear interpolation over sorted latency samples.

## Redis Channels and Queues

### Job Queue

List name:

```text
benchmark_jobs
```

The API pushes jobs with `LPUSH`; the worker consumes them with `BRPOP`.

Job payload:

```json
{
  "benchmarkId": "00000000-0000-0000-0000-000000000000",
  "url": "http://localhost:8080/api/test-target",
  "method": "GET",
  "headers": {},
  "requestBody": null,
  "durationSeconds": 10,
  "concurrency": 10
}
```

### Pub/Sub Channels

Per benchmark:

```text
benchmark_metrics:{benchmarkId}
benchmark_status:{benchmarkId}
```

The worker publishes to these channels. The API subscribes to them while an SSE client is connected and forwards payloads to the browser.

## Database

The initial schema is defined in `postgres/init.sql`. Spring JPA is also configured with `ddl-auto=update` for local MVP convenience.

### `benchmarks`

Stores benchmark definitions and lifecycle timestamps.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `name` | `text` | User-visible benchmark name. |
| `url` | `text` | Target URL. |
| `method` | `text` | `GET` or `POST`. |
| `headers` | `jsonb` | Normalized request headers. |
| `request_body` | `jsonb` | Optional JSON request body. |
| `duration_seconds` | `int` | Benchmark duration. |
| `concurrency` | `int` | Number of concurrent requester loops. |
| `status` | `text` | `queued`, `running`, `completed`, or `failed`. |
| `created_at` | `timestamp with time zone` | Set when the benchmark is created. |
| `started_at` | `timestamp with time zone` | Set when the worker starts processing. |
| `finished_at` | `timestamp with time zone` | Set when the worker completes or fails. |

Indexes:

- `idx_benchmarks_created_at` on `created_at desc`

### `benchmark_metric_points`

Stores one-second live metric windows.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `benchmark_id` | `uuid` | Foreign key to `benchmarks(id)`, cascade delete. |
| `timestamp` | `timestamp with time zone` | Metric point time. |
| `requests_per_second` | `numeric` | Window throughput. |
| `avg_latency_ms` | `numeric` | Window average latency. |
| `p95_latency_ms` | `numeric` | Window p95 latency. |
| `error_rate` | `numeric` | Window failed/total ratio. |

Indexes:

- `idx_metric_points_benchmark_timestamp` on `(benchmark_id, timestamp asc)`

### `benchmark_results`

Stores one final summary per benchmark run.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `benchmark_id` | `uuid` | Foreign key to `benchmarks(id)`, cascade delete. |
| `total_requests` | `int` | Total completed request attempts. |
| `successful_requests` | `int` | Requests with `2xx-3xx` responses. |
| `failed_requests` | `int` | Failed attempts. |
| `requests_per_second` | `numeric` | Overall throughput. |
| `avg_latency_ms` | `numeric` | Overall average latency. |
| `min_latency_ms` | `numeric` | Minimum observed latency. |
| `max_latency_ms` | `numeric` | Maximum observed latency. |
| `p50_latency_ms` | `numeric` | Median latency. |
| `p95_latency_ms` | `numeric` | p95 latency. |
| `p99_latency_ms` | `numeric` | p99 latency. |
| `error_rate` | `numeric` | Overall failed/total ratio. |
| `created_at` | `timestamp with time zone` | Summary creation time. |

## Safety Limits

This project is designed for local MVP usage and deliberately restricts where benchmarks can be sent.

Allowed target hosts:

- `localhost`
- `127.0.0.1`
- `::1`
- `host.docker.internal`
- `example.com`
- `www.example.com`

Blocked or rejected targets:

- URLs without `http` or `https`.
- URLs without a host.
- URLs containing username/password user info.
- Private IP addresses except localhost.
- Any host outside the allowlist.

Header restrictions:

- Maximum 50 headers.
- Header names must be valid HTTP token names.
- Header names are max 128 characters.
- Header values are max 4096 characters.
- Header values cannot contain line breaks.
- Duplicate header names are rejected case-insensitively.
- Restricted headers are rejected: `connection`, `content-length`, `expect`, `host`, `upgrade`.

Benchmark limits:

- Methods: `GET`, `POST`
- `durationSeconds`: 1-60
- `concurrency`: 1-100
- JSON request body: max 50 KB
- Worker request timeout: 10 seconds by default
- Playground response body preview: max 10 KB

## Localhost Rewriting in Docker

The UI uses user-friendly URLs such as:

```text
http://localhost:8080/api/test-target
```

Inside a container, `localhost` points to that container itself, not the host machine. To make local targets work in Docker Compose, both the API playground and worker can rewrite localhost URLs to `host.docker.internal`.

Configured values:

- API: `APP_LOCALHOST_REWRITE_HOST=host.docker.internal`
- Worker: `LOCALHOST_REWRITE_HOST=host.docker.internal`

The original URL remains stored in the benchmark row; rewriting is applied only for the outbound request from inside the container.

## Local Development

### Run Everything with Docker Compose

```bash
docker compose up --build
```

This is the recommended development path because it starts all required dependencies and wires service names correctly.

### Run the API Locally

Prerequisites:

- Java 21
- PostgreSQL running on `localhost:5432`
- Redis running on `localhost:6379`

From `api/`:

```bash
./mvnw spring-boot:run
```

On Windows PowerShell:

```powershell
.\mvnw.cmd spring-boot:run
```

Useful local defaults are defined in `api/src/main/resources/application.yaml`.

### Run the Frontend Locally

Prerequisites:

- Node.js 22 or compatible current Node runtime
- API available at `http://localhost:8080`

From `frontend/`:

```bash
npm install
npm run dev
```

The frontend reads:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

### Run the Worker Locally

Prerequisites:

- Python 3.12
- Redis running locally
- PostgreSQL running locally

From `worker/`:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

On Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m app.main
```

## Testing and Verification

### API Tests

From `api/`:

```bash
./mvnw test
```

### End-to-End Smoke Test

1. Start the stack:

   ```bash
   docker compose up --build
   ```

2. Open `http://localhost:3000`.
3. Create a benchmark with the default target.
4. Wait for live metrics to appear.
5. Confirm the benchmark reaches `completed`.
6. Confirm the final summary is visible on the detail page.

### Manual API Smoke Test

Create a benchmark:

```bash
curl -X POST http://localhost:8080/api/benchmarks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Local smoke test",
    "url": "http://localhost:8080/api/test-target",
    "method": "GET",
    "headers": {},
    "requestBody": null,
    "durationSeconds": 5,
    "concurrency": 5
  }'
```

List benchmarks:

```bash
curl http://localhost:8080/api/benchmarks
```

## Troubleshooting

### Frontend Cannot Reach the API

Check:

- `frontend` was built with `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`.
- The API container is running and listening on port `8080`.
- CORS allows the frontend origin. Compose allows `http://localhost:3000` and `http://127.0.0.1:3000`.

### Benchmark Stays Queued

Check:

- The `worker` container is running.
- Redis is healthy.
- The worker log contains `listening for jobs on benchmark_jobs`.
- The job was pushed to Redis by the API.

### Live Stream Disconnects

The detail page uses SSE through `GET /api/benchmarks/{id}/events`.

Check:

- The API is running.
- Redis is running.
- The benchmark ID exists.
- Browser or proxy settings are not buffering/blocking EventSource connections.

### Localhost Target Does Not Work from Docker

When the target is on the host machine, containers must access it through `host.docker.internal`. Compose already sets:

- `APP_LOCALHOST_REWRITE_HOST=host.docker.internal`
- `LOCALHOST_REWRITE_HOST=host.docker.internal`

If your Docker environment does not support `host.docker.internal`, configure those variables to a reachable host address.

### Database Schema Looks Out of Sync

The schema is initialized from `postgres/init.sql` only when the PostgreSQL volume is first created. Spring JPA also runs with `ddl-auto=update`.

For a clean local database:

```bash
docker compose down -v
docker compose up --build
```

## Known Limitations

- Only `GET` and `POST` benchmark methods are supported.
- Targets are restricted to a small local/demo allowlist.
- The worker processes one Redis job at a time per worker process.
- There is no authentication or multi-user isolation.
- There is no cancellation endpoint for running benchmarks.
- There is no retry policy for failed target requests; failures are counted as benchmark failures.
- Final results are inserted once; the current MVP does not enforce a unique database constraint on `benchmark_results.benchmark_id`.
- Redis is used as a lightweight queue, not a durable job system.
- The UI and API are designed for local development rather than production deployment.
