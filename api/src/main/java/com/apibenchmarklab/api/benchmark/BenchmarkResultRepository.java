package com.apibenchmarklab.api.benchmark;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BenchmarkResultRepository extends JpaRepository<BenchmarkResult, UUID> {
    Optional<BenchmarkResult> findByBenchmark_Id(UUID benchmarkId);
}
