package com.voicecommunicator.chat.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.amqp.core.Queue;

@Configuration
public class AmqpConfig {
    @Bean
    public Queue analyzeQueue() {
        return new Queue("text.analyze", true);
    }

    @Bean
    public Queue resultQueue() {
        return new Queue("text.result", true);

    }
}
