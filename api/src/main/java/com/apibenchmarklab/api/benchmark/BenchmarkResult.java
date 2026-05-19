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
@Table(name = "benchmark_results")
public class BenchmarkResult {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "benchmark_id", nullable = false)
    private Benchmark benchmark;

    @Column(name = "total_requests", nullable = false)
    private int totalRequests;

    @Column(name = "successful_requests", nullable = false)
    private int successfulRequests;

    @Column(name = "failed_requests", nullable = false)
    private int failedRequests;

    @Column(name = "requests_per_second", nullable = false)
    private BigDecimal requestsPerSecond;

    @Column(name = "avg_latency_ms", nullable = false)
    private BigDecimal avgLatencyMs;

    @Column(name = "min_latency_ms", nullable = false)
    private BigDecimal minLatencyMs;

    @Column(name = "max_latency_ms", nullable = false)
    private BigDecimal maxLatencyMs;

    @Column(name = "p50_latency_ms", nullable = false)
    private BigDecimal p50LatencyMs;

    @Column(name = "p95_latency_ms", nullable = false)
    private BigDecimal p95LatencyMs;

    @Column(name = "p99_latency_ms", nullable = false)
    private BigDecimal p99LatencyMs;

    @Column(name = "error_rate", nullable = false)
    private BigDecimal errorRate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public BenchmarkResult() {
    }

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
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

    public int getTotalRequests() {
        return totalRequests;
    }

    public void setTotalRequests(int totalRequests) {
        this.totalRequests = totalRequests;
    }

    public int getSuccessfulRequests() {
        return successfulRequests;
    }

    public void setSuccessfulRequests(int successfulRequests) {
        this.successfulRequests = successfulRequests;
    }

    public int getFailedRequests() {
        return failedRequests;
    }

    public void setFailedRequests(int failedRequests) {
        this.failedRequests = failedRequests;
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

    public BigDecimal getMinLatencyMs() {
        return minLatencyMs;
    }

    public void setMinLatencyMs(BigDecimal minLatencyMs) {
        this.minLatencyMs = minLatencyMs;
    }

    public BigDecimal getMaxLatencyMs() {
        return maxLatencyMs;
    }

    public void setMaxLatencyMs(BigDecimal maxLatencyMs) {
        this.maxLatencyMs = maxLatencyMs;
    }

    public BigDecimal getP50LatencyMs() {
        return p50LatencyMs;
    }

    public void setP50LatencyMs(BigDecimal p50LatencyMs) {
        this.p50LatencyMs = p50LatencyMs;
    }

    public BigDecimal getP95LatencyMs() {
        return p95LatencyMs;
    }

    public void setP95LatencyMs(BigDecimal p95LatencyMs) {
        this.p95LatencyMs = p95LatencyMs;
    }

    public BigDecimal getP99LatencyMs() {
        return p99LatencyMs;
    }

    public void setP99LatencyMs(BigDecimal p99LatencyMs) {
        this.p99LatencyMs = p99LatencyMs;
    }

    public BigDecimal getErrorRate() {
        return errorRate;
    }

    public void setErrorRate(BigDecimal errorRate) {
        this.errorRate = errorRate;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
