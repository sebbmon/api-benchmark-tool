package com.apibenchmarklab.api.benchmark;

import java.util.UUID;

public class BenchmarkNotFoundException extends RuntimeException {
    public BenchmarkNotFoundException(UUID id) {
        super("Benchmark not found: " + id);
    }
}
