package com.voicecommunicator.user.service;

import com.voicecommunicator.common.event.UserUpdatedEvent;
import com.voicecommunicator.user.model.AppUser;
import com.voicecommunicator.user.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppUserService {

    private final AppUserRepository appUserRepository;
    private final RabbitTemplate rabbitTemplate;

    public void syncUser(String userId, String username) {
        appUserRepository.findById(userId)
                .ifPresentOrElse(
                        user -> {
                            if (!user.getUsername().equals(username)) {
                                user.setUsername(username);
                                appUserRepository.save(user);
                                publishUserUpdate(userId, username);
                            }
                        },
                        () -> {
                            appUserRepository.save(new AppUser(userId, username));
                            publishUserUpdate(userId, username);
                        }
                );
    }

    private void publishUserUpdate(String userId, String username) {
        UserUpdatedEvent event = new UserUpdatedEvent(userId, username);
        rabbitTemplate.convertAndSend("internal.exchange", "user.updated", event);
        log.info("Send user update: {}", username);
    }

    public List<AppUser> searchUsers(String query) {
        if (query == null || query.length() < 2) {
            return List.of();
        }
        return appUserRepository.findByUsernameContainingIgnoreCase(query);
    }
}