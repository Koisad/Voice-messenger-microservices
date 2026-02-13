package com.voicecommunicator.user.service;

import com.voicecommunicator.user.model.Friendship;
import com.voicecommunicator.user.model.FriendshipStatus;
import com.voicecommunicator.user.repository.FriendshipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FriendshipService {

    private final FriendshipRepository friendshipRepository;
    private final UserNotificationService userNotificationService;

    public void sendFriendshipRequest(String requesterId, String requesterUsername, String addresseeId, String addresseeUsername) {
        if (requesterId.equals(addresseeId)) {
            throw new IllegalArgumentException("You cannot send friendship request to yourself");
        }

        if (friendshipRepository.findFriendship(requesterId, addresseeId).isPresent()) {
            throw new IllegalArgumentException("Friendship already exists");
        }

        Friendship friendship = Friendship.builder()
                .requesterId(requesterId)
                .requesterUsername(requesterUsername)
                .addresseeId(addresseeId)
                .addresseeUsername(addresseeUsername)
                .status(FriendshipStatus.PENDING)
                .build();

        friendshipRepository.save(friendship);
        userNotificationService.notifyFriendRequest(requesterId, requesterUsername, addresseeId);
    }

    public void acceptFriendshipRequest(String addresseeId, String friendshipId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new IllegalArgumentException("Friendship request not found"));

        if (!friendship.getAddresseeId().equals(addresseeId))
            throw new SecurityException("That is not your friendship request");

        friendship.setStatus(FriendshipStatus.FRIENDS);
        friendshipRepository.save(friendship);

        userNotificationService.notifyFriendAccepted(
                friendship.getAddresseeId(),
                friendship.getAddresseeUsername(),
                friendship.getRequesterId()
        );
    }

    public List<Friendship> getFriendshipRequests(String addresseeId) {
        return friendshipRepository.findAllByAddresseeIdAndStatus(addresseeId, FriendshipStatus.PENDING);
    }

    public List<Friendship> getFriends(String userId) {
        return friendshipRepository.findAllAcceptedByUserId(userId);
    }

    public void removeFriendship(String user1Id, String user2Id) {
        Friendship friendship = friendshipRepository.findFriendship(user1Id, user2Id)
                .orElseThrow(() -> new IllegalArgumentException("Friendship not found"));

        friendshipRepository.delete(friendship);

        userNotificationService.notifyFriendRemoved(user1Id, user2Id);
        userNotificationService.notifyFriendRemoved(user2Id, user1Id);
    }
}
