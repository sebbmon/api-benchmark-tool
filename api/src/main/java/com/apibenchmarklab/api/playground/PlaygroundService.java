package com.apibenchmarklab.api.playground;

import com.apibenchmarklab.api.benchmark.BenchmarkHttpMethod;
import com.apibenchmarklab.api.benchmark.UrlSafetyValidator;
import com.apibenchmarklab.api.http.HttpHeaderSanitizer;
import com.apibenchmarklab.api.http.LocalhostUrlRewriter;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class PlaygroundService {
    private static final int MAX_REQUEST_BODY_BYTES = 50 * 1024;
    private static final int MAX_RESPONSE_PREVIEW_BYTES = 10 * 1024;

    private final UrlSafetyValidator urlSafetyValidator;
    private final HttpHeaderSanitizer httpHeaderSanitizer;
    private final LocalhostUrlRewriter localhostUrlRewriter;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public PlaygroundService(
            UrlSafetyValidator urlSafetyValidator,
            HttpHeaderSanitizer httpHeaderSanitizer,
            LocalhostUrlRewriter localhostUrlRewriter,
            ObjectMapper objectMapper) {
        this.urlSafetyValidator = urlSafetyValidator;
        this.httpHeaderSanitizer = httpHeaderSanitizer;
        this.localhostUrlRewriter = localhostUrlRewriter;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public PlaygroundResponse send(PlaygroundRequest request) {
        URI uri = localhostUrlRewriter.rewrite(urlSafetyValidator.validate(request.url()));
        Map<String, String> headers = httpHeaderSanitizer.normalize(request.headers());
        validateRequestBodySize(request);

        HttpRequest httpRequest = buildRequest(uri, request, headers);
        long started = System.nanoTime();
        try {
            HttpResponse<byte[]> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofByteArray());
            long latencyMs = elapsedMs(started);
            byte[] body = response.body();
            int previewLength = Math.min(body.length, MAX_RESPONSE_PREVIEW_BYTES);
            String preview = new String(body, 0, previewLength, StandardCharsets.UTF_8);

            return PlaygroundResponse.success(
                    response.statusCode(),
                    latencyMs,
                    body.length,
                    response.headers().map(),
                    preview,
                    body.length > previewLength);
        } catch (IOException ex) {
            return PlaygroundResponse.failed(elapsedMs(started), errorMessage(ex));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return PlaygroundResponse.failed(elapsedMs(started), "Request was interrupted.");
        }
    }

    private HttpRequest buildRequest(URI uri, PlaygroundRequest request, Map<String, String> headers) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(10));
        headers.forEach(builder::header);

        if (request.method() == BenchmarkHttpMethod.POST) {
            String body = requestBodyJson(request);
            if (!body.isBlank() && !httpHeaderSanitizer.containsHeader(headers, "Content-Type")) {
                builder.header("Content-Type", "application/json");
            }
            return builder.POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8)).build();
        }

        return builder.GET().build();
    }

    private String requestBodyJson(PlaygroundRequest request) {
        if (request.requestBody() == null || request.requestBody().isNull()) {
            return "";
        }
        try {
            return objectMapper.writeValueAsString(request.requestBody());
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Request body JSON is invalid.");
        }
    }

    private void validateRequestBodySize(PlaygroundRequest request) {
        if (request.requestBody() == null || request.requestBody().isNull()) {
            return;
        }
        try {
            byte[] bytes = objectMapper.writeValueAsBytes(request.requestBody());
            if (bytes.length > MAX_REQUEST_BODY_BYTES) {
                throw new IllegalArgumentException("Request body JSON must be 50 KB or smaller.");
            }
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Request body JSON is invalid.");
        }
    }

    private long elapsedMs(long started) {
        return Math.round((System.nanoTime() - started) / 1_000_000.0);
    }

    private String errorMessage(Exception ex) {
        if (ex.getMessage() != null && !ex.getMessage().isBlank()) {
            return ex.getMessage();
        }
        if (ex.getCause() != null && ex.getCause().getMessage() != null && !ex.getCause().getMessage().isBlank()) {
            return ex.getCause().getMessage();
        }
        return ex.getClass().getSimpleName();
    }
}
