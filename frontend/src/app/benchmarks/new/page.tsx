"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import {
  HeadersEditor,
  headerRowsFromRecord,
  headersToRecord,
  type HeaderRow,
} from "@/components/HeadersEditor";
import { type BenchmarkMethod, createBenchmark } from "@/lib/api";
import { BENCHMARK_DRAFT_STORAGE_KEY, type BenchmarkDraft } from "@/lib/benchmarkDraft";

export default function NewBenchmarkPage() {
  const router = useRouter();
  const [name, setName] = useState("Local API smoke test");
  const [url, setUrl] = useState("http://localhost:8080/api/test-target");
  const [method, setMethod] = useState<BenchmarkMethod>("GET");
  const [headers, setHeaders] = useState<HeaderRow[]>(() => headerRowsFromRecord());
  const [requestBody, setRequestBody] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(10);
  const [concurrency, setConcurrency] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDraft = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("from") !== "playground") {
        return;
      }

      const rawDraft = window.sessionStorage.getItem(BENCHMARK_DRAFT_STORAGE_KEY);
      if (!rawDraft) {
        return;
      }

      try {
        const draft = JSON.parse(rawDraft) as Partial<BenchmarkDraft>;
        if (typeof draft.url === "string") {
          setUrl(draft.url);
        }
        if (draft.method === "GET" || draft.method === "POST") {
          setMethod(draft.method);
        }
        if (draft.headers && typeof draft.headers === "object") {
          setHeaders(headerRowsFromRecord(draft.headers));
        }
        if (typeof draft.requestBody === "string") {
          setRequestBody(draft.requestBody);
        }
        setName("Playground endpoint benchmark");
      } catch {
        setError("Could not load playground draft.");
      } finally {
        window.sessionStorage.removeItem(BENCHMARK_DRAFT_STORAGE_KEY);
      }
    }, 0);

    return () => {
      window.clearTimeout(loadDraft);
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const parsedHeaders = headersToRecord(headers);
      let parsedBody: unknown | null = null;
      if (method === "POST" && requestBody.trim()) {
        parsedBody = JSON.parse(requestBody);
      }

      const benchmark = await createBenchmark({
        name,
        url,
        method,
        headers: parsedHeaders,
        requestBody: parsedBody,
        durationSeconds,
        concurrency,
      });
      router.push(`/benchmarks/${benchmark.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create benchmark.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/playground"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-950 transition hover:bg-slate-50"
            >
              Playground
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-950 transition hover:bg-slate-50"
            >
              Dashboard
            </Link>
          </div>
        }
      />

      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">New benchmark</h1>
          <p className="mt-1 text-sm text-slate-600">
            Targets are restricted to localhost, host.docker.internal, and example.com for this MVP.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-6 space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={160}
              required
              className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">URL</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
              className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Method</span>
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value as BenchmarkMethod)}
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Duration</span>
              <input
                type="number"
                min={1}
                max={60}
                value={durationSeconds}
                onChange={(event) => setDurationSeconds(Number(event.target.value))}
                required
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Concurrency</span>
              <input
                type="number"
                min={1}
                max={100}
                value={concurrency}
                onChange={(event) => setConcurrency(Number(event.target.value))}
                required
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
              />
            </label>
          </div>

          <HeadersEditor rows={headers} onChange={setHeaders} />

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Request body JSON</span>
            <textarea
              value={requestBody}
              onChange={(event) => setRequestBody(event.target.value)}
              disabled={method === "GET"}
              rows={8}
              placeholder={method === "POST" ? '{ "hello": "world" }' : ""}
              className="mt-2 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-3 font-mono text-sm text-slate-950 outline-none transition focus:border-slate-950 disabled:bg-slate-100 disabled:text-slate-400"
            />
            <span className="mt-2 block text-xs text-slate-500">Maximum body size: 50 KB.</span>
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-950 transition hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {submitting ? "Starting" : "Run benchmark"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
