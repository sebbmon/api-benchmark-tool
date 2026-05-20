export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export type BenchmarkStatus = "queued" | "running" | "completed" | "failed";
export type BenchmarkMethod = "GET" | "POST";

export type Benchmark = {
  id: string;
  name: string;
  url: string;
  method: BenchmarkMethod;
  headers?: Record<string, string> | null;
  requestBody?: unknown | null;
  durationSeconds: number;
  concurrency: number;
  status: BenchmarkStatus;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
};

export type BenchmarkResult = {
  id: string;
  benchmarkId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  requestsPerSecond: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number;
  createdAt: string;
};

export type BenchmarkMetricPoint = {
  id?: string;
  benchmarkId: string;
  timestamp: string;
  status?: BenchmarkStatus;
  requestsPerSecond: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRate: number;
};

export type BenchmarkDetail = {
  benchmark: Benchmark;
  result: BenchmarkResult | null;
  metricPoints: BenchmarkMetricPoint[];
};

export type CreateBenchmarkInput = {
  name: string;
  url: string;
  method: BenchmarkMethod;
  headers: Record<string, string>;
  requestBody: unknown | null;
  durationSeconds: number;
  concurrency: number;
};

export type PlaygroundRequestInput = {
  url: string;
  method: BenchmarkMethod;
  headers: Record<string, string>;
  requestBody: unknown | null;
};

export type PlaygroundResponse = {
  statusCode?: number | null;
  latencyMs: number;
  responseSizeBytes: number;
  responseHeaders: Record<string, string[]>;
  responseBodyPreview: string;
  responseBodyTruncated: boolean;
  errorMessage?: string | null;
};

type ApiError = {
  message?: string;
  details?: string[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const body = (await response.json()) as ApiError;
      const details = body.details?.length ? ` ${body.details.join(" ")}` : "";
      message = `${body.message ?? message}${details}`;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function listBenchmarks(): Promise<Benchmark[]> {
  return request<Benchmark[]>("/api/benchmarks");
}

export function getBenchmark(id: string): Promise<BenchmarkDetail> {
  return request<BenchmarkDetail>(`/api/benchmarks/${id}`);
}

export function createBenchmark(input: CreateBenchmarkInput): Promise<Benchmark> {
  return request<Benchmark>("/api/benchmarks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function sendPlaygroundRequest(input: PlaygroundRequestInput): Promise<PlaygroundResponse> {
  return request<PlaygroundResponse>("/api/playground/request", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function benchmarkEventsUrl(id: string): string {
  return `${API_BASE_URL}/api/benchmarks/${id}/events`;
}
