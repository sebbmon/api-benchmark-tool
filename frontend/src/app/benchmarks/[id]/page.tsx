"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { LineChart } from "@/components/LineChart";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  benchmarkEventsUrl,
  type BenchmarkDetail,
  type BenchmarkMetricPoint,
  type BenchmarkStatus,
  getBenchmark,
} from "@/lib/api";

type StatusEvent = {
  benchmarkId: string;
  status: BenchmarkStatus;
  timestamp: string;
  error?: string;
};

function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(value);
}

function isMetricEvent(value: unknown): value is BenchmarkMetricPoint {
  if (!value || typeof value !== "object") {
    return false;
  }
  return "requestsPerSecond" in value && "p95LatencyMs" in value && "timestamp" in value;
}

function isStatusEvent(value: unknown): value is StatusEvent {
  if (!value || typeof value !== "object") {
    return false;
  }
  return "status" in value && "timestamp" in value;
}

export default function BenchmarkDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [detail, setDetail] = useState<BenchmarkDetail | null>(null);
  const [metrics, setMetrics] = useState<BenchmarkMetricPoint[]>([]);
  const [status, setStatus] = useState<BenchmarkStatus>("queued");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    const next = await getBenchmark(id);
    setDetail(next);
    setMetrics(next.metricPoints);
    setStatus(next.benchmark.status);
  }, [id]);

  useEffect(() => {
    let active = true;

    getBenchmark(id)
      .then((next) => {
        if (active) {
          setDetail(next);
          setMetrics(next.metricPoints);
          setStatus(next.benchmark.status);
        }
      })
      .catch((err: Error) => {
        if (active) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }

    const source = new EventSource(benchmarkEventsUrl(id));
    source.onmessage = (event) => {
      if (!event.data) {
        return;
      }

      try {
        const payload = JSON.parse(event.data) as unknown;

        if (isMetricEvent(payload)) {
          setStatus(payload.status ?? "running");
          setMetrics((current) => [...current, payload]);
          return;
        }

        if (isStatusEvent(payload)) {
          setStatus(payload.status);
          if (payload.error) {
            setLiveError(payload.error);
          }
          if (payload.status === "completed" || payload.status === "failed") {
            setTimeout(() => {
              loadDetail().catch((err: Error) => setLiveError(err.message));
            }, 500);
          }
        }
      } catch (err) {
        setLiveError(err instanceof Error ? err.message : "Could not parse live event.");
      }
    };
    source.onerror = () => {
      setLiveError("Live stream disconnected.");
    };

    return () => {
      source.close();
    };
  }, [id, loadDetail]);

  const latestMetric = metrics.at(-1);
  const benchmark = detail?.benchmark;
  const result = detail?.result;
  const displayStatus = status ?? benchmark?.status ?? "queued";

  const cards = useMemo(
    () => [
      {
        label: "RPS",
        value: latestMetric ? formatNumber(Number(latestMetric.requestsPerSecond), 1) : "0.0",
        detail: result ? `Final ${formatNumber(Number(result.requestsPerSecond), 1)}` : undefined,
      },
      {
        label: "Avg latency",
        value: latestMetric ? `${formatNumber(Number(latestMetric.avgLatencyMs), 1)} ms` : "0.0 ms",
        detail: result ? `Final ${formatNumber(Number(result.avgLatencyMs), 1)} ms` : undefined,
      },
      {
        label: "p95 latency",
        value: latestMetric ? `${formatNumber(Number(latestMetric.p95LatencyMs), 1)} ms` : "0.0 ms",
        detail: result ? `Final ${formatNumber(Number(result.p95LatencyMs), 1)} ms` : undefined,
      },
      {
        label: "Error rate",
        value: latestMetric ? formatPercent(Number(latestMetric.errorRate)) : "0%",
        detail: result ? `Final ${formatPercent(Number(result.errorRate))}` : undefined,
      },
    ],
    [latestMetric, result],
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader
        action={
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-950 transition hover:bg-slate-50"
          >
            Dashboard
          </Link>
        }
      />

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading benchmark
          </div>
        ) : error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        ) : benchmark ? (
          <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <div className="mb-3">
                  <StatusBadge status={displayStatus} />
                </div>
                <h1 className="truncate text-2xl font-semibold text-slate-950">
                  {benchmark.name}
                </h1>
                <p className="mt-2 break-all text-sm text-slate-600">
                  {benchmark.method} {benchmark.url}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Duration {benchmark.durationSeconds}s - concurrency {benchmark.concurrency}
                </p>
              </div>
              {displayStatus === "queued" || displayStatus === "running" ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  Live stream active
                </div>
              ) : null}
            </div>

            {liveError ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {liveError}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((card) => (
                <MetricCard key={card.label} {...card} />
              ))}
            </div>

            <LineChart points={metrics} />

            {result ? (
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-950">Final summary</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <SummaryItem label="Total requests" value={result.totalRequests.toLocaleString()} />
                  <SummaryItem
                    label="Successful"
                    value={result.successfulRequests.toLocaleString()}
                  />
                  <SummaryItem label="Failed" value={result.failedRequests.toLocaleString()} />
                  <SummaryItem
                    label="Min / max latency"
                    value={`${formatNumber(Number(result.minLatencyMs), 1)} / ${formatNumber(
                      Number(result.maxLatencyMs),
                      1,
                    )} ms`}
                  />
                  <SummaryItem
                    label="p50 latency"
                    value={`${formatNumber(Number(result.p50LatencyMs), 1)} ms`}
                  />
                  <SummaryItem
                    label="p95 latency"
                    value={`${formatNumber(Number(result.p95LatencyMs), 1)} ms`}
                  />
                  <SummaryItem
                    label="p99 latency"
                    value={`${formatNumber(Number(result.p99LatencyMs), 1)} ms`}
                  />
                  <SummaryItem label="Error rate" value={formatPercent(Number(result.errorRate))} />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
                Final result will appear after the worker completes the benchmark.
              </div>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}
