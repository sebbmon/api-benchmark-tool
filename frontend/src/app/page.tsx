"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { type Benchmark, listBenchmarks } from "@/lib/api";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function Home() {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    listBenchmarks()
      .then((items) => {
        if (active) {
          setBenchmarks(items);
          setError(null);
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
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader
        action={
          <Link
            href="/benchmarks/new"
            className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            New benchmark
          </Link>
        }
      />

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Benchmarks</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Create controlled HTTP benchmarks, watch live metrics, and inspect final results.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="text-lg font-semibold text-slate-950">{benchmarks.length}</div>
              <div className="text-xs text-slate-500">Total</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="text-lg font-semibold text-blue-700">
                {benchmarks.filter((item) => item.status === "running").length}
              </div>
              <div className="text-xs text-slate-500">Running</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="text-lg font-semibold text-emerald-700">
                {benchmarks.filter((item) => item.status === "completed").length}
              </div>
              <div className="text-xs text-slate-500">Done</div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1.4fr_0.9fr_0.7fr_0.6fr] gap-4 border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 max-md:hidden">
            <span>Name</span>
            <span>Target</span>
            <span>Created</span>
            <span>Status</span>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading benchmarks</div>
          ) : benchmarks.length ? (
            <div className="divide-y divide-slate-200">
              {benchmarks.map((benchmark) => (
                <Link
                  href={`/benchmarks/${benchmark.id}`}
                  key={benchmark.id}
                  className="grid gap-3 px-4 py-4 transition hover:bg-slate-50 md:grid-cols-[1.4fr_0.9fr_0.7fr_0.6fr] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-950">
                      {benchmark.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {benchmark.method} - {benchmark.durationSeconds}s - c{benchmark.concurrency}
                    </div>
                  </div>
                  <div className="truncate text-sm text-slate-600">{benchmark.url}</div>
                  <div className="text-sm text-slate-600">{formatDate(benchmark.createdAt)}</div>
                  <div>
                    <StatusBadge status={benchmark.status} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-4 p-6">
              <div>
                <h2 className="text-base font-semibold text-slate-950">No benchmarks yet</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Start with the built-in local test target.
                </p>
              </div>
              <Link
                href="/benchmarks/new"
                className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-950 transition hover:bg-slate-50"
              >
                New benchmark
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
