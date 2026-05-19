create table if not exists benchmarks (
    id uuid primary key,
    name text not null,
    url text not null,
    method text not null,
    request_body jsonb null,
    duration_seconds int not null,
    concurrency int not null,
    status text not null,
    created_at timestamp with time zone not null,
    started_at timestamp with time zone null,
    finished_at timestamp with time zone null
);

create table if not exists benchmark_results (
    id uuid primary key,
    benchmark_id uuid not null references benchmarks(id) on delete cascade,
    total_requests int not null,
    successful_requests int not null,
    failed_requests int not null,
    requests_per_second numeric not null,
    avg_latency_ms numeric not null,
    min_latency_ms numeric not null,
    max_latency_ms numeric not null,
    p50_latency_ms numeric not null,
    p95_latency_ms numeric not null,
    p99_latency_ms numeric not null,
    error_rate numeric not null,
    created_at timestamp with time zone not null
);

create table if not exists benchmark_metric_points (
    id uuid primary key,
    benchmark_id uuid not null references benchmarks(id) on delete cascade,
    timestamp timestamp with time zone not null,
    requests_per_second numeric not null,
    avg_latency_ms numeric not null,
    p95_latency_ms numeric not null,
    error_rate numeric not null
);

create index if not exists idx_benchmarks_created_at on benchmarks(created_at desc);
create index if not exists idx_metric_points_benchmark_timestamp
    on benchmark_metric_points(benchmark_id, timestamp asc);
