"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import {
  HeadersEditor,
  headerRowsFromRecord,
  headersToRecord,
  type HeaderRow,
} from "@/components/HeadersEditor";
import {
  type BenchmarkMethod,
  type PlaygroundResponse,
  sendPlaygroundRequest,
} from "@/lib/api";
import { BENCHMARK_DRAFT_STORAGE_KEY, type BenchmarkDraft } from "@/lib/benchmarkDraft";

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function parseBody(method: BenchmarkMethod, requestBody: string): unknown | null {
  if (method !== "POST" || !requestBody.trim()) {
    return null;
  }

  return JSON.parse(requestBody);
}

export default function PlaygroundPage() {
  const router = useRouter();
  const [url, setUrl] = useState("http://localhost:8080/api/test-target");
  const [method, setMethod] = useState<BenchmarkMethod>("GET");
  const [headers, setHeaders] = useState<HeaderRow[]>(() => headerRowsFromRecord());
  const [requestBody, setRequestBody] = useState("");
  const [result, setResult] = useState<PlaygroundResponse | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    setResult(null);

    try {
      const parsedHeaders = headersToRecord(headers);
      const parsedBody = parseBody(method, requestBody);
      const response = await sendPlaygroundRequest({
        url,
        method,
        headers: parsedHeaders,
        requestBody: parsedBody,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send request.");
    } finally {
      setSending(false);
    }
  }

  function benchmarkEndpoint() {
    try {
      const parsedHeaders = headersToRecord(headers);
      parseBody(method, requestBody);

      const draft: BenchmarkDraft = {
        url,
        method,
        headers: parsedHeaders,
        requestBody: method === "POST" ? requestBody : "",
      };
      window.sessionStorage.setItem(BENCHMARK_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      router.push("/benchmarks/new?from=playground");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare benchmark draft.");
    }
  }

  const responseHeaders = Object.entries(result?.responseHeaders ?? {});

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-950 transition hover:bg-slate-50"
            >
              Dashboard
            </Link>
            <Link
              href="/benchmarks/new"
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              New benchmark
            </Link>
          </div>
        }
      />

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">API playground</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Send one controlled HTTP request before running a benchmark.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <form
            onSubmit={onSend}
            className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            {error ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {error}
              </div>
            ) : null}

            <label className="block">
              <span className="text-sm font-medium text-slate-700">URL</span>
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                required
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
              />
            </label>

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
              <button
                type="button"
                onClick={benchmarkEndpoint}
                className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-950 transition hover:bg-slate-50"
              >
                Benchmark this endpoint
              </button>
              <button
                type="submit"
                disabled={sending}
                className="inline-flex h-11 items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {sending ? "Sending" : "Send request"}
              </button>
            </div>
          </form>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Response</h2>
                <p className="mt-1 text-sm text-slate-600">Status, timing, headers, and body preview.</p>
              </div>
              {result?.errorMessage ? (
                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-800">
                  Failed
                </span>
              ) : result ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                  Received
                </span>
              ) : null}
            </div>

            {result ? (
              <div className="mt-5 space-y-5">
                {result.errorMessage ? (
                  <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                    {result.errorMessage}
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Status
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {result.statusCode ?? "n/a"}
                    </div>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Latency
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {result.latencyMs} ms
                    </div>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Size
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {formatBytes(result.responseSizeBytes)}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-950">Response headers</h3>
                  <div className="mt-2 max-h-48 overflow-auto rounded-md border border-slate-200">
                    {responseHeaders.length ? (
                      responseHeaders.map(([key, values]) => (
                        <div
                          key={key}
                          className="grid gap-2 border-b border-slate-200 px-3 py-2 text-sm last:border-b-0 sm:grid-cols-[0.45fr_0.55fr]"
                        >
                          <span className="break-all font-medium text-slate-700">{key}</span>
                          <span className="break-all font-mono text-xs text-slate-600">
                            {values.join(", ")}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-slate-500">No response headers</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-950">Response body preview</h3>
                    {result.responseBodyTruncated ? (
                      <span className="text-xs text-slate-500">Truncated at 10 KB</span>
                    ) : null}
                  </div>
                  <pre className="mt-2 min-h-48 max-h-96 overflow-auto rounded-md border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100">
                    {result.responseBodyPreview || "No response body"}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-md border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                Send a request to inspect the endpoint response.
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
