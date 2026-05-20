package com.apibenchmarklab.api.benchmark;

import com.apibenchmarklab.api.http.HttpHeaderSanitizer;
import com.apibenchmarklab.api.redis.BenchmarkJobPublisher;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class BenchmarkService {
    private static final int MAX_BODY_BYTES = 50 * 1024;

    private final BenchmarkRepository benchmarkRepository;
    private final BenchmarkResultRepository resultRepository;
    private final BenchmarkMetricPointRepository metricPointRepository;
    private final BenchmarkJobPublisher jobPublisher;
    private final UrlSafetyValidator urlSafetyValidator;
    private final HttpHeaderSanitizer httpHeaderSanitizer;
    private final ObjectMapper objectMapper;

    public BenchmarkService(
            BenchmarkRepository benchmarkRepository,
            BenchmarkResultRepository resultRepository,
            BenchmarkMetricPointRepository metricPointRepository,
            BenchmarkJobPublisher jobPublisher,
            UrlSafetyValidator urlSafetyValidator,
            HttpHeaderSanitizer httpHeaderSanitizer,
            ObjectMapper objectMapper) {
        this.benchmarkRepository = benchmarkRepository;
        this.resultRepository = resultRepository;
        this.metricPointRepository = metricPointRepository;
        this.jobPublisher = jobPublisher;
        this.urlSafetyValidator = urlSafetyValidator;
        this.httpHeaderSanitizer = httpHeaderSanitizer;
        this.objectMapper = objectMapper;
    }

    public BenchmarkResponse create(CreateBenchmarkRequest request) {
        urlSafetyValidator.validate(request.url());
        Map<String, String> headers = httpHeaderSanitizer.normalize(request.headers());
        validateRequestBodySize(request);

        Benchmark benchmark = new Benchmark(
                request.name().trim(),
                request.url().trim(),
                request.method().name(),
                toJson(headers),
                request.requestBody(),
                request.durationSeconds(),
                request.concurrency());
        Benchmark saved = benchmarkRepository.save(benchmark);
        jobPublisher.publish(saved);
        return BenchmarkResponse.from(saved);
    }

    public List<BenchmarkResponse> list() {
        return benchmarkRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(BenchmarkResponse::from)
                .toList();
    }

    @Transactional
    public BenchmarkDetailResponse get(UUID id) {
        Benchmark benchmark = benchmarkRepository.findById(id)
                .orElseThrow(() -> new BenchmarkNotFoundException(id));
        BenchmarkResultResponse result = resultRepository.findByBenchmark_Id(id)
                .map(BenchmarkResultResponse::from)
                .orElse(null);
        List<BenchmarkMetricPointResponse> points = metricPointRepository.findByBenchmark_IdOrderByTimestampAsc(id).stream()
                .map(BenchmarkMetricPointResponse::from)
                .toList();
        return new BenchmarkDetailResponse(BenchmarkResponse.from(benchmark), result, points);
    }

    private void validateRequestBodySize(CreateBenchmarkRequest request) {
        if (request.requestBody() == null || request.requestBody().isNull()) {
            return;
        }
        try {
            byte[] bytes = objectMapper.writeValueAsBytes(request.requestBody());
            if (bytes.length > MAX_BODY_BYTES) {
                throw new IllegalArgumentException("Request body JSON must be 50 KB or smaller.");
            }
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Request body JSON is invalid.");
        }
    }

    private JsonNode toJson(Map<String, String> headers) {
        return objectMapper.valueToTree(headers);
    }
}
