package com.apibenchmarklab.api.benchmark;

import java.util.List;

public record BenchmarkDetailResponse(
        BenchmarkResponse benchmark,
        BenchmarkResultResponse result,
        List<BenchmarkMetricPointResponse> metricPoints) {
}
