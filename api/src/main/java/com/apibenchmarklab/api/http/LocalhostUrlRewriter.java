package com.apibenchmarklab.api.http;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class LocalhostUrlRewriter {
    private final String rewriteHost;

    public LocalhostUrlRewriter(@Value("${app.localhost-rewrite-host:}") String rewriteHost) {
        this.rewriteHost = rewriteHost == null ? "" : rewriteHost.trim();
    }

    public URI rewrite(URI uri) {
        if (rewriteHost.isBlank() || uri.getHost() == null || !isLocalhost(uri.getHost())) {
            return uri;
        }

        try {
            return new URI(
                    uri.getScheme(),
                    null,
                    rewriteHost,
                    uri.getPort(),
                    uri.getPath() == null || uri.getPath().isBlank() ? "/" : uri.getPath(),
                    uri.getQuery(),
                    uri.getFragment());
        } catch (URISyntaxException ex) {
            throw new IllegalArgumentException("Could not rewrite localhost URL.", ex);
        }
    }

    private boolean isLocalhost(String host) {
        String normalized = host.toLowerCase(Locale.ROOT);
        return "localhost".equals(normalized) || "127.0.0.1".equals(normalized) || "::1".equals(normalized);
    }
}
