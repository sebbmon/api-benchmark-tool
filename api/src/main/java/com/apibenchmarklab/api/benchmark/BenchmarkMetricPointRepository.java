package com.apibenchmarklab.api.benchmark;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BenchmarkMetricPointRepository extends JpaRepository<BenchmarkMetricPoint, UUID> {
    List<BenchmarkMetricPoint> findByBenchmark_IdOrderByTimestampAsc(UUID benchmarkId);
}
