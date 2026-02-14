package com.voicecommunicator.chat.service;

import com.voicecommunicator.chat.model.ReadState;
import com.voicecommunicator.chat.repository.MessageRepository;
import com.voicecommunicator.chat.repository.ReadStateRepository;
import com.voicecommunicator.common.event.NotificationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class ReadStateService {

    private final ReadStateRepository readStateRepository;
    private final MessageRepository messageRepository;
    private final RabbitTemplate rabbitTemplate;

    public void markChannelAsRead(String userId, String channelId) {
        ReadState readState = readStateRepository.findByUserIdAndChannelId(userId, channelId)
                .orElse(ReadState.builder()
                        .userId(userId)
                        .channelId(channelId)
                        .build());

        readState.setLastReadAt(Instant.now());
        readStateRepository.save(readState);

        try {
            NotificationEvent event = new NotificationEvent(
                    "CHANNEL_READ",
                    Map.of("channelId", channelId));

            String routingKey = "user." + userId + ".read";
            rabbitTemplate.convertAndSend("amq.topic", routingKey, event);
        } catch (Exception e) {
            log.info("Failed to send read notification: {}", e.getMessage());
        }
    }

    public Map<String, Long> getUnreadCounts(String userId, List<String> channelIds) {
        if (channelIds == null || channelIds.isEmpty()) {
            return new HashMap<>();
        }

        List<ReadState> states = readStateRepository.findByUserIdAndChannelIdIn(userId, channelIds);

        Map<String, Instant> readMap = states.stream()
                .collect(Collectors.toMap(ReadState::getChannelId, ReadState::getLastReadAt));

        Map<String, Long> unreadCounts = new HashMap<>();

        for (String channelId : channelIds) {
            Instant lastRead = readMap.getOrDefault(channelId, Instant.EPOCH);

            long count = messageRepository.countByChannelIdAndTimestampAfter(channelId, lastRead);

            if (count > 0) {
                unreadCounts.put(channelId, count);
            }
        }

        return unreadCounts;
    }
}