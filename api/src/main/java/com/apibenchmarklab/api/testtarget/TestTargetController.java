package com.apibenchmarklab.api.testtarget;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestTargetController {
    @GetMapping("/api/test-target")
    public Map<String, Object> testTarget() throws InterruptedException {
        int delayMs = ThreadLocalRandom.current().nextInt(50, 201);
        Thread.sleep(delayMs);
        return Map.of(
                "ok", true,
                "delayMs", delayMs,
                "timestamp", Instant.now().toString());
    }
}
