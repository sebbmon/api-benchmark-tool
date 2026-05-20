package com.apibenchmarklab.api.playground;

import com.apibenchmarklab.api.benchmark.BenchmarkHttpMethod;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Map;

public record PlaygroundRequest(
        @NotBlank @Size(max = 2048) String url,
        @NotNull BenchmarkHttpMethod method,
        @Size(max = 50) Map<String, String> headers,
        JsonNode requestBody) {
}
