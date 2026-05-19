package com.apibenchmarklab.api.benchmark;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record BenchmarkResultResponse(
        UUID id,
        UUID benchmarkId,
        int totalRequests,
        int successfulRequests,
        int failedRequests,
        BigDecimal requestsPerSecond,
        BigDecimal avgLatencyMs,
        BigDecimal minLatencyMs,
        BigDecimal maxLatencyMs,
        BigDecimal p50LatencyMs,
        BigDecimal p95LatencyMs,
        BigDecimal p99LatencyMs,
        BigDecimal errorRate,
        Instant createdAt) {
    public static BenchmarkResultResponse from(BenchmarkResult result) {
        return new BenchmarkResultResponse(
                result.getId(),
                result.getBenchmark().getId(),
                result.getTotalRequests(),
                result.getSuccessfulRequests(),
                result.getFailedRequests(),
                result.getRequestsPerSecond(),
                result.getAvgLatencyMs(),
                result.getMinLatencyMs(),
                result.getMaxLatencyMs(),
                result.getP50LatencyMs(),
                result.getP95LatencyMs(),
                result.getP99LatencyMs(),
                result.getErrorRate(),
                result.getCreatedAt());
    }
}
