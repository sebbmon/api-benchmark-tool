package com.apibenchmarklab.api.benchmark;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateBenchmarkRequest(
        @NotBlank @Size(max = 160) String name,
        @NotBlank @Size(max = 2048) String url,
        @NotNull BenchmarkHttpMethod method,
        JsonNode requestBody,
        @Min(1) @Max(60) int durationSeconds,
        @Min(1) @Max(100) int concurrency) {
}
