package com.apibenchmarklab.api.redis;

import com.apibenchmarklab.api.benchmark.Benchmark;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class BenchmarkJobPublisher {
    public static final String JOB_QUEUE = "benchmark_jobs";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public BenchmarkJobPublisher(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public void publish(Benchmark benchmark) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("benchmarkId", benchmark.getId().toString());
        payload.put("url", benchmark.getUrl());
        payload.put("method", benchmark.getMethod());
        payload.set("headers", benchmark.getHeaders() == null ? objectMapper.createObjectNode() : benchmark.getHeaders());
        payload.set("requestBody", benchmark.getRequestBody() == null ? NullNode.getInstance() : benchmark.getRequestBody());
        payload.put("durationSeconds", benchmark.getDurationSeconds());
        payload.put("concurrency", benchmark.getConcurrency());

        try {
            redisTemplate.opsForList().leftPush(JOB_QUEUE, objectMapper.writeValueAsString(payload));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Could not serialize benchmark job.", ex);
        }
    }
}
