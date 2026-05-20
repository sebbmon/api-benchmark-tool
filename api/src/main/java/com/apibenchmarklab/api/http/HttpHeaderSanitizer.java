package com.apibenchmarklab.api.http;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class HttpHeaderSanitizer {
    private static final int MAX_HEADERS = 50;
    private static final int MAX_NAME_LENGTH = 128;
    private static final int MAX_VALUE_LENGTH = 4096;
    private static final Pattern HEADER_NAME = Pattern.compile("^[!#$%&'*+.^_`|~0-9A-Za-z-]+$");
    private static final Set<String> RESTRICTED_HEADERS = Set.of(
            "connection",
            "content-length",
            "expect",
            "host",
            "upgrade");

    public Map<String, String> normalize(Map<String, String> headers) {
        if (headers == null || headers.isEmpty()) {
            return Map.of();
        }

        Map<String, String> normalized = new LinkedHashMap<>();
        Set<String> seenNames = new java.util.HashSet<>();

        for (Map.Entry<String, String> entry : headers.entrySet()) {
            String name = entry.getKey() == null ? "" : entry.getKey().trim();
            String value = entry.getValue() == null ? "" : entry.getValue().trim();

            if (name.isBlank() && value.isBlank()) {
                continue;
            }
            validateName(name, seenNames);
            validateValue(name, value);

            normalized.put(name, value);
            if (normalized.size() > MAX_HEADERS) {
                throw new IllegalArgumentException("Headers are limited to 50 entries.");
            }
        }

        return normalized;
    }

    public boolean containsHeader(Map<String, String> headers, String name) {
        String expected = name.toLowerCase(Locale.ROOT);
        return headers.keySet().stream()
                .map(headerName -> headerName.toLowerCase(Locale.ROOT))
                .anyMatch(expected::equals);
    }

    private void validateName(String name, Set<String> seenNames) {
        if (name.isBlank()) {
            throw new IllegalArgumentException("Header name cannot be blank.");
        }
        if (name.length() > MAX_NAME_LENGTH) {
            throw new IllegalArgumentException("Header name must be 128 characters or fewer.");
        }
        if (!HEADER_NAME.matcher(name).matches()) {
            throw new IllegalArgumentException("Header name contains invalid characters.");
        }

        String lowerName = name.toLowerCase(Locale.ROOT);
        if (RESTRICTED_HEADERS.contains(lowerName)) {
            throw new IllegalArgumentException("Header " + name + " is restricted.");
        }
        if (!seenNames.add(lowerName)) {
            throw new IllegalArgumentException("Duplicate header name: " + name + ".");
        }
    }

    private void validateValue(String name, String value) {
        if (value.length() > MAX_VALUE_LENGTH) {
            throw new IllegalArgumentException("Header " + name + " value must be 4096 characters or fewer.");
        }
        if (value.contains("\r") || value.contains("\n")) {
            throw new IllegalArgumentException("Header " + name + " value cannot contain line breaks.");
        }
    }
}
