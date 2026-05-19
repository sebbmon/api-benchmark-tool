package com.apibenchmarklab.api.redis;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class BenchmarkEventStreamService {
    private static final long SSE_TIMEOUT_MS = Duration.ofMinutes(30).toMillis();

    private final RedisMessageListenerContainer listenerContainer;

    public BenchmarkEventStreamService(RedisMessageListenerContainer listenerContainer) {
        this.listenerContainer = listenerContainer;
    }

    public SseEmitter stream(UUID benchmarkId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        ChannelTopic metricsTopic = new ChannelTopic("benchmark_metrics:" + benchmarkId);
        ChannelTopic statusTopic = new ChannelTopic("benchmark_status:" + benchmarkId);
        AtomicBoolean closed = new AtomicBoolean(false);

        MessageListener[] listenerRef = new MessageListener[1];
        MessageListener listener = (message, pattern) -> {
            String payload = new String(message.getBody(), StandardCharsets.UTF_8);
            try {
                emitter.send(SseEmitter.event().data(payload));
            } catch (IOException | IllegalStateException ex) {
                closeListener(listenerContainer, listenerRef[0], metricsTopic, statusTopic, closed);
                emitter.complete();
            }
        };
        listenerRef[0] = listener;

        Runnable cleanup = () -> closeListener(listenerContainer, listener, metricsTopic, statusTopic, closed);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(error -> cleanup.run());

        listenerContainer.addMessageListener(listener, metricsTopic);
        listenerContainer.addMessageListener(listener, statusTopic);

        try {
            emitter.send(SseEmitter.event().comment("connected"));
        } catch (IOException ex) {
            cleanup.run();
            emitter.completeWithError(ex);
        }

        return emitter;
    }

    private static void closeListener(
            RedisMessageListenerContainer container,
            MessageListener listener,
            ChannelTopic metricsTopic,
            ChannelTopic statusTopic,
            AtomicBoolean closed) {
        if (closed.compareAndSet(false, true)) {
            container.removeMessageListener(listener, metricsTopic);
            container.removeMessageListener(listener, statusTopic);
        }
    }
}
