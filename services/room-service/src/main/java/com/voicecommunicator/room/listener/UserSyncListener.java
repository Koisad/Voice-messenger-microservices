package com.voicecommunicator.room.listener;

import com.voicecommunicator.common.event.UserUpdatedEvent;
import com.voicecommunicator.room.model.AppUser;
import com.voicecommunicator.room.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserSyncListener {

    private final AppUserRepository appUserRepository;

    @RabbitListener(queues = "room.user-sync")
    public void handleUserUpdated(UserUpdatedEvent event) {
        AppUser user = new AppUser(event.getUserId(), event.getUsername());
        appUserRepository.save(user);
    }
}
