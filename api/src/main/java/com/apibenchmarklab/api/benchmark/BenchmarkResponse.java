package com.apibenchmarklab.api.benchmark;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.UUID;

public record BenchmarkResponse(
        UUID id,
        String name,
        String url,
        String method,
        JsonNode headers,
        JsonNode requestBody,
        int durationSeconds,
        int concurrency,
        String status,
        Instant createdAt,
        Instant startedAt,
        Instant finishedAt) {
    public static BenchmarkResponse from(Benchmark benchmark) {
        return new BenchmarkResponse(
                benchmark.getId(),
                benchmark.getName(),
                benchmark.getUrl(),
                benchmark.getMethod(),
                benchmark.getHeaders(),
                benchmark.getRequestBody(),
                benchmark.getDurationSeconds(),
                benchmark.getConcurrency(),
                benchmark.getStatus(),
                benchmark.getCreatedAt(),
                benchmark.getStartedAt(),
                benchmark.getFinishedAt());
    }
}
