package com.apibenchmarklab.api.benchmark;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "benchmark_metric_points")
public class BenchmarkMetricPoint {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "benchmark_id", nullable = false)
    private Benchmark benchmark;

    @Column(nullable = false)
    private Instant timestamp;

    @Column(name = "requests_per_second", nullable = false)
    private BigDecimal requestsPerSecond;

    @Column(name = "avg_latency_ms", nullable = false)
    private BigDecimal avgLatencyMs;

    @Column(name = "p95_latency_ms", nullable = false)
    private BigDecimal p95LatencyMs;

    @Column(name = "error_rate", nullable = false)
    private BigDecimal errorRate;

    public BenchmarkMetricPoint() {
    }

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (timestamp == null) {
            timestamp = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Benchmark getBenchmark() {
        return benchmark;
    }

    public void setBenchmark(Benchmark benchmark) {
        this.benchmark = benchmark;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public BigDecimal getRequestsPerSecond() {
        return requestsPerSecond;
    }

    public void setRequestsPerSecond(BigDecimal requestsPerSecond) {
        this.requestsPerSecond = requestsPerSecond;
    }

    public BigDecimal getAvgLatencyMs() {
        return avgLatencyMs;
    }

    public void setAvgLatencyMs(BigDecimal avgLatencyMs) {
        this.avgLatencyMs = avgLatencyMs;
    }

    public BigDecimal getP95LatencyMs() {
        return p95LatencyMs;
    }

    public void setP95LatencyMs(BigDecimal p95LatencyMs) {
        this.p95LatencyMs = p95LatencyMs;
    }

    public BigDecimal getErrorRate() {
        return errorRate;
    }

    public void setErrorRate(BigDecimal errorRate) {
        this.errorRate = errorRate;
    }
}
