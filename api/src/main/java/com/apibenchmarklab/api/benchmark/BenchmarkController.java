package com.apibenchmarklab.api.benchmark;

import com.apibenchmarklab.api.redis.BenchmarkEventStreamService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/benchmarks")
public class BenchmarkController {
    private final BenchmarkService benchmarkService;
    private final BenchmarkEventStreamService eventStreamService;

    public BenchmarkController(BenchmarkService benchmarkService, BenchmarkEventStreamService eventStreamService) {
        this.benchmarkService = benchmarkService;
        this.eventStreamService = eventStreamService;
    }

    @PostMapping
    public ResponseEntity<BenchmarkResponse> create(@Valid @RequestBody CreateBenchmarkRequest request) {
        BenchmarkResponse response = benchmarkService.create(request);
        return ResponseEntity.created(URI.create("/api/benchmarks/" + response.id())).body(response);
    }

    @GetMapping
    public List<BenchmarkResponse> list() {
        return benchmarkService.list();
    }

    @GetMapping("/{id}")
    public BenchmarkDetailResponse get(@PathVariable UUID id) {
        return benchmarkService.get(id);
    }

    @GetMapping("/{id}/events")
    public SseEmitter events(@PathVariable UUID id) {
        benchmarkService.get(id);
        return eventStreamService.stream(id);
    }
}
