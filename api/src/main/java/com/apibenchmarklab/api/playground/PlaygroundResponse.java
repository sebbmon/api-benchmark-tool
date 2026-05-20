package com.apibenchmarklab.api.playground;

import java.util.List;
import java.util.Map;

public record PlaygroundResponse(
        Integer statusCode,
        long latencyMs,
        int responseSizeBytes,
        Map<String, List<String>> responseHeaders,
        String responseBodyPreview,
        boolean responseBodyTruncated,
        String errorMessage) {
    public static PlaygroundResponse success(
            int statusCode,
            long latencyMs,
            int responseSizeBytes,
            Map<String, List<String>> responseHeaders,
            String responseBodyPreview,
            boolean responseBodyTruncated) {
        return new PlaygroundResponse(
                statusCode,
                latencyMs,
                responseSizeBytes,
                responseHeaders,
                responseBodyPreview,
                responseBodyTruncated,
                null);
    }

    public static PlaygroundResponse failed(long latencyMs, String errorMessage) {
        return new PlaygroundResponse(null, latencyMs, 0, Map.of(), "", false, errorMessage);
    }
}
