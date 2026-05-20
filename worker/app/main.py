import asyncio
import json
import os
import socket
import sys
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from ipaddress import ip_address
from typing import Any
from urllib.parse import ParseResult, urlparse, urlunparse

import aiohttp
import asyncpg
from redis.asyncio import Redis


REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://benchmark:benchmark@localhost:5432/benchmark_lab")
JOB_QUEUE = os.getenv("JOB_QUEUE", "benchmark_jobs")
REQUEST_TIMEOUT_SECONDS = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "10"))
LOCALHOST_REWRITE_HOST = os.getenv("LOCALHOST_REWRITE_HOST", "")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return utc_now().isoformat().replace("+00:00", "Z")


def to_decimal(value: float) -> Decimal:
    return Decimal(str(round(value, 4)))


def percentile(values: list[float], percentile_value: float) -> float:
    if not values:
        return 0.0

    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]

    rank = (len(ordered) - 1) * percentile_value
    lower = int(rank)
    upper = min(lower + 1, len(ordered) - 1)
    weight = rank - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def is_localhost(host: str) -> bool:
    return host in {"localhost", "127.0.0.1", "::1"}


def is_private_ip(host: str) -> bool:
    try:
        parsed = ip_address(host)
        return parsed.is_private or parsed.is_link_local or parsed.is_loopback or parsed.is_unspecified
    except ValueError:
        return False


def validate_target_url(url: str) -> ParseResult:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("URL must use http or https.")
    if not parsed.hostname:
        raise ValueError("URL must include a host.")
    if parsed.username or parsed.password:
        raise ValueError("URL must not include user info.")

    host = parsed.hostname.lower()
    if is_localhost(host):
        return parsed
    if host in {"example.com", "www.example.com", "host.docker.internal"}:
        return parsed
    if is_private_ip(host):
        raise ValueError("Private IP addresses are blocked except localhost.")

    raise ValueError("Only localhost, host.docker.internal, and example.com targets are allowed in the MVP.")


def rewrite_localhost_for_compose(parsed: ParseResult) -> str:
    if not LOCALHOST_REWRITE_HOST or not parsed.hostname or not is_localhost(parsed.hostname.lower()):
        return urlunparse(parsed)

    hostname = LOCALHOST_REWRITE_HOST
    port = f":{parsed.port}" if parsed.port else ""
    netloc = f"{hostname}{port}"
    return urlunparse((parsed.scheme, netloc, parsed.path or "/", parsed.params, parsed.query, parsed.fragment))


@dataclass
class BenchmarkStats:
    total: int = 0
    successful: int = 0
    failed: int = 0
    latencies_ms: list[float] = field(default_factory=list)
    window_total: int = 0
    window_failed: int = 0
    window_latencies_ms: list[float] = field(default_factory=list)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    async def record(self, latency_ms: float, successful: bool) -> None:
        async with self.lock:
            self.total += 1
            self.window_total += 1
            self.latencies_ms.append(latency_ms)
            self.window_latencies_ms.append(latency_ms)
            if successful:
                self.successful += 1
            else:
                self.failed += 1
                self.window_failed += 1

    async def drain_window(self, elapsed_seconds: float) -> dict[str, float]:
        async with self.lock:
            total = self.window_total
            failed = self.window_failed
            latencies = self.window_latencies_ms
            self.window_total = 0
            self.window_failed = 0
            self.window_latencies_ms = []

        return build_metric(total, failed, latencies, elapsed_seconds)

    async def final_summary(self, elapsed_seconds: float) -> dict[str, float | int]:
        async with self.lock:
            total = self.total
            successful = self.successful
            failed = self.failed
            latencies = list(self.latencies_ms)

        metric = build_metric(total, failed, latencies, elapsed_seconds)
        return {
            "totalRequests": total,
            "successfulRequests": successful,
            "failedRequests": failed,
            "requestsPerSecond": metric["requestsPerSecond"],
            "avgLatencyMs": metric["avgLatencyMs"],
            "minLatencyMs": min(latencies) if latencies else 0.0,
            "maxLatencyMs": max(latencies) if latencies else 0.0,
            "p50LatencyMs": percentile(latencies, 0.50),
            "p95LatencyMs": metric["p95LatencyMs"],
            "p99LatencyMs": percentile(latencies, 0.99),
            "errorRate": metric["errorRate"],
        }


def build_metric(total: int, failed: int, latencies: list[float], elapsed_seconds: float) -> dict[str, float]:
    safe_elapsed = max(elapsed_seconds, 0.001)
    return {
        "requestsPerSecond": total / safe_elapsed,
        "avgLatencyMs": sum(latencies) / len(latencies) if latencies else 0.0,
        "p95LatencyMs": percentile(latencies, 0.95),
        "errorRate": failed / total if total else 0.0,
    }


def normalize_headers(headers: Any) -> dict[str, str]:
    if headers is None:
        return {}
    if not isinstance(headers, dict):
        raise ValueError("Headers must be an object.")

    normalized: dict[str, str] = {}
    for key, value in headers.items():
        if not isinstance(key, str):
            raise ValueError("Header names must be strings.")
        if not isinstance(value, str):
            raise ValueError("Header values must be strings.")
        if key:
            normalized[key] = value
    return normalized


async def wait_for_dependencies() -> tuple[Redis, asyncpg.Pool]:
    redis: Redis | None = None
    pool: asyncpg.Pool | None = None
    for attempt in range(1, 31):
        try:
            redis = Redis.from_url(REDIS_URL, decode_responses=True)
            await redis.ping()
            pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
            async with pool.acquire() as conn:
                await conn.execute("select 1")
            print("worker connected to Redis and PostgreSQL", flush=True)
            return redis, pool
        except Exception as exc:
            if redis:
                await redis.aclose()
            if pool:
                await pool.close()
            print(f"waiting for dependencies ({attempt}/30): {exc}", flush=True)
            await asyncio.sleep(2)

    raise RuntimeError("Could not connect to Redis/PostgreSQL.")


async def update_status(
    pool: asyncpg.Pool,
    benchmark_id: uuid.UUID,
    status: str,
    *,
    started: bool = False,
    finished: bool = False,
) -> None:
    now = utc_now()
    if started:
        await pool.execute(
            """
            update benchmarks
            set status = $2, started_at = coalesce(started_at, $3)
            where id = $1
            """,
            benchmark_id,
            status,
            now,
        )
        return

    if finished:
        await pool.execute(
            """
            update benchmarks
            set status = $2, finished_at = $3
            where id = $1
            """,
            benchmark_id,
            status,
            now,
        )
        return

    await pool.execute("update benchmarks set status = $2 where id = $1", benchmark_id, status)


async def publish_status(redis: Redis, benchmark_id: uuid.UUID, status: str, error: str | None = None) -> None:
    payload: dict[str, Any] = {
        "benchmarkId": str(benchmark_id),
        "status": status,
        "timestamp": iso_now(),
    }
    if error:
        payload["error"] = error
    await redis.publish(f"benchmark_status:{benchmark_id}", json.dumps(payload))


async def publish_metric(
    redis: Redis,
    pool: asyncpg.Pool,
    benchmark_id: uuid.UUID,
    metric: dict[str, float],
) -> None:
    timestamp = utc_now()
    payload = {
        "benchmarkId": str(benchmark_id),
        "status": "running",
        "requestsPerSecond": round(metric["requestsPerSecond"], 4),
        "avgLatencyMs": round(metric["avgLatencyMs"], 4),
        "p95LatencyMs": round(metric["p95LatencyMs"], 4),
        "errorRate": round(metric["errorRate"], 6),
        "timestamp": timestamp.isoformat().replace("+00:00", "Z"),
    }

    await pool.execute(
        """
        insert into benchmark_metric_points (
            id, benchmark_id, timestamp, requests_per_second, avg_latency_ms, p95_latency_ms, error_rate
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        """,
        uuid.uuid4(),
        benchmark_id,
        timestamp,
        to_decimal(metric["requestsPerSecond"]),
        to_decimal(metric["avgLatencyMs"]),
        to_decimal(metric["p95LatencyMs"]),
        to_decimal(metric["errorRate"]),
    )
    await redis.publish(f"benchmark_metrics:{benchmark_id}", json.dumps(payload))


async def insert_final_result(pool: asyncpg.Pool, benchmark_id: uuid.UUID, summary: dict[str, float | int]) -> None:
    await pool.execute(
        """
        insert into benchmark_results (
            id, benchmark_id, total_requests, successful_requests, failed_requests,
            requests_per_second, avg_latency_ms, min_latency_ms, max_latency_ms,
            p50_latency_ms, p95_latency_ms, p99_latency_ms, error_rate, created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        """,
        uuid.uuid4(),
        benchmark_id,
        int(summary["totalRequests"]),
        int(summary["successfulRequests"]),
        int(summary["failedRequests"]),
        to_decimal(float(summary["requestsPerSecond"])),
        to_decimal(float(summary["avgLatencyMs"])),
        to_decimal(float(summary["minLatencyMs"])),
        to_decimal(float(summary["maxLatencyMs"])),
        to_decimal(float(summary["p50LatencyMs"])),
        to_decimal(float(summary["p95LatencyMs"])),
        to_decimal(float(summary["p99LatencyMs"])),
        to_decimal(float(summary["errorRate"])),
        utc_now(),
    )


async def run_one_request(
    session: aiohttp.ClientSession,
    method: str,
    url: str,
    headers: dict[str, str],
    request_body: Any,
    stats: BenchmarkStats,
) -> None:
    started = time.perf_counter()
    successful = False
    try:
        kwargs: dict[str, Any] = {}
        if method == "POST" and request_body is not None:
            kwargs["json"] = request_body

        async with session.request(method, url, headers=headers, **kwargs) as response:
            await response.read()
            successful = 200 <= response.status < 400
    except (aiohttp.ClientError, asyncio.TimeoutError, socket.gaierror):
        successful = False
    finally:
        latency_ms = (time.perf_counter() - started) * 1000
        await stats.record(latency_ms, successful)


async def requester(
    session: aiohttp.ClientSession,
    method: str,
    url: str,
    headers: dict[str, str],
    request_body: Any,
    stats: BenchmarkStats,
    stop_at: float,
) -> None:
    while time.perf_counter() < stop_at:
        await run_one_request(session, method, url, headers, request_body, stats)


async def metric_ticker(
    redis: Redis,
    pool: asyncpg.Pool,
    benchmark_id: uuid.UUID,
    stats: BenchmarkStats,
    stop_at: float,
) -> None:
    last_tick = time.perf_counter()
    while time.perf_counter() < stop_at:
        await asyncio.sleep(1)
        now = time.perf_counter()
        metric = await stats.drain_window(now - last_tick)
        last_tick = now
        await publish_metric(redis, pool, benchmark_id, metric)


async def process_job(redis: Redis, pool: asyncpg.Pool, payload: str) -> None:
    job = json.loads(payload)
    benchmark_id = uuid.UUID(job["benchmarkId"])
    parsed_url = validate_target_url(job["url"])
    request_url = rewrite_localhost_for_compose(parsed_url)
    method = job["method"].upper()
    headers = normalize_headers(job.get("headers"))
    request_body = job.get("requestBody")
    duration_seconds = min(int(job["durationSeconds"]), 60)
    concurrency = min(int(job["concurrency"]), 100)

    if method not in {"GET", "POST"}:
        raise ValueError("Unsupported benchmark method.")

    print(
        f"starting benchmark {benchmark_id} {method} {request_url} "
        f"duration={duration_seconds}s concurrency={concurrency} headers={len(headers)}",
        flush=True,
    )

    await update_status(pool, benchmark_id, "running", started=True)
    await publish_status(redis, benchmark_id, "running")

    stats = BenchmarkStats()
    started_at = time.perf_counter()
    stop_at = started_at + duration_seconds
    timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT_SECONDS)
    connector = aiohttp.TCPConnector(limit=max(100, concurrency * 2), ttl_dns_cache=30)

    async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
        request_tasks = [
            asyncio.create_task(requester(session, method, request_url, headers, request_body, stats, stop_at))
            for _ in range(concurrency)
        ]
        ticker_task = asyncio.create_task(metric_ticker(redis, pool, benchmark_id, stats, stop_at))
        await asyncio.gather(*request_tasks)
        await ticker_task

    elapsed_seconds = time.perf_counter() - started_at
    summary = await stats.final_summary(elapsed_seconds)
    await insert_final_result(pool, benchmark_id, summary)
    await update_status(pool, benchmark_id, "completed", finished=True)
    await publish_status(redis, benchmark_id, "completed")
    print(f"completed benchmark {benchmark_id}: {summary}", flush=True)


async def run_worker() -> None:
    redis, pool = await wait_for_dependencies()
    try:
        print(f"listening for jobs on {JOB_QUEUE}", flush=True)
        while True:
            item = await redis.brpop(JOB_QUEUE, timeout=5)
            if not item:
                continue

            _, payload = item
            benchmark_id: uuid.UUID | None = None
            try:
                job = json.loads(payload)
                benchmark_id = uuid.UUID(job["benchmarkId"])
                await process_job(redis, pool, payload)
            except Exception as exc:
                print(f"job failed: {exc}", file=sys.stderr, flush=True)
                if benchmark_id:
                    await update_status(pool, benchmark_id, "failed", finished=True)
                    await publish_status(redis, benchmark_id, "failed", str(exc))
    finally:
        await redis.aclose()
        await pool.close()


if __name__ == "__main__":
    asyncio.run(run_worker())
