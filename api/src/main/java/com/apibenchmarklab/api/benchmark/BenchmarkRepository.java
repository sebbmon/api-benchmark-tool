package com.apibenchmarklab.api.benchmark;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BenchmarkRepository extends JpaRepository<Benchmark, UUID> {
    List<Benchmark> findAllByOrderByCreatedAtDesc();
}
