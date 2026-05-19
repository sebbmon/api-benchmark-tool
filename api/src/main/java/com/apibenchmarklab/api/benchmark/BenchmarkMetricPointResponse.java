package com.apibenchmarklab.api.benchmark;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record BenchmarkMetricPointResponse(
        UUID id,
        UUID benchmarkId,
        Instant timestamp,
        BigDecimal requestsPerSecond,
        BigDecimal avgLatencyMs,
        BigDecimal p95LatencyMs,
        BigDecimal errorRate) {
    public static BenchmarkMetricPointResponse from(BenchmarkMetricPoint point) {
        return new BenchmarkMetricPointResponse(
                point.getId(),
                point.getBenchmark().getId(),
                point.getTimestamp(),
                point.getRequestsPerSecond(),
                point.getAvgLatencyMs(),
                point.getP95LatencyMs(),
                point.getErrorRate());
    }
}
