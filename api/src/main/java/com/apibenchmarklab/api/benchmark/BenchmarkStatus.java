package com.apibenchmarklab.api.benchmark;

public enum BenchmarkStatus {
    QUEUED("queued"),
    RUNNING("running"),
    COMPLETED("completed"),
    FAILED("failed");

    private final String value;

    BenchmarkStatus(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }
}
