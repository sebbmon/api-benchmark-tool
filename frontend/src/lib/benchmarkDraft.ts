import { type BenchmarkMethod } from "@/lib/api";

export const BENCHMARK_DRAFT_STORAGE_KEY = "api-benchmark-lab:benchmark-draft";

export type BenchmarkDraft = {
  url: string;
  method: BenchmarkMethod;
  headers: Record<string, string>;
  requestBody: string;
};
