package com.apibenchmarklab.api.benchmark;

import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class UrlSafetyValidator {
    public URI validate(String rawUrl) {
        URI uri = parse(rawUrl);

        if (!"http".equalsIgnoreCase(uri.getScheme()) && !"https".equalsIgnoreCase(uri.getScheme())) {
            throw new IllegalArgumentException("URL must use http or https.");
        }
        if (uri.getUserInfo() != null) {
            throw new IllegalArgumentException("URL must not include user info.");
        }
        if (uri.getHost() == null || uri.getHost().isBlank()) {
            throw new IllegalArgumentException("URL must include a host.");
        }
        if (uri.getPort() > 65535) {
            throw new IllegalArgumentException("URL port is invalid.");
        }

        String host = uri.getHost().toLowerCase(Locale.ROOT);
        if (isLocalhost(host)) {
            return uri;
        }
        if ("example.com".equals(host) || "www.example.com".equals(host)) {
            return uri;
        }
        if ("host.docker.internal".equals(host)) {
            return uri;
        }

        if (isIpAddress(host) && isPrivateIp(host)) {
            throw new IllegalArgumentException("Private IP addresses are blocked except localhost.");
        }

        throw new IllegalArgumentException("Only localhost, host.docker.internal, and example.com targets are allowed in the MVP.");
    }

    private URI parse(String rawUrl) {
        try {
            return new URI(rawUrl).normalize();
        } catch (URISyntaxException ex) {
            throw new IllegalArgumentException("URL is invalid.");
        }
    }

    private boolean isLocalhost(String host) {
        return "localhost".equals(host) || "127.0.0.1".equals(host) || "::1".equals(host);
    }

    private boolean isIpAddress(String host) {
        return host.matches("\\d+\\.\\d+\\.\\d+\\.\\d+") || host.contains(":");
    }

    private boolean isPrivateIp(String host) {
        try {
            InetAddress address = InetAddress.getByName(host);
            return address.isAnyLocalAddress()
                    || address.isSiteLocalAddress()
                    || address.isLinkLocalAddress()
                    || address.isLoopbackAddress();
        } catch (Exception ex) {
            return true;
        }
    }
}
