import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import type { StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface UseUserNotificationsProps {
    userId: string | null;
    userToken?: string | null;
    onFriendRequest?: (data: { senderId: string; senderName: string }) => void;
    onFriendAccepted?: (data: { friendId: string; friendName: string }) => void;
    onFriendRemoved?: (data: { friendId: string }) => void;
    onIncomingCall?: (data: { callerId: string; callerName: string; roomId: string; type: string }) => void;
}

export const useUserNotifications = ({
    userId,
    userToken,
    onFriendRequest,
    onFriendAccepted,
    onFriendRemoved,
    onIncomingCall
}: UseUserNotificationsProps) => {
    const clientRef = useRef<Client | null>(null);
    const subscriptionRef = useRef<StompSubscription | null>(null);

    useEffect(() => {
        // Cleanup previous connection
        if (clientRef.current) {
            console.log("[UserNotifications] Cleaning up previous connection...");
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
            clientRef.current.deactivate();
            clientRef.current = null;
        }

        if (!userId || !userToken) {
            return;
        }

        const client = new Client({
            webSocketFactory: () => new SockJS(`${window.location.origin}/ws`),
            connectHeaders: {
                Authorization: `Bearer ${userToken}`,
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            debug: (str) => {
                console.log('[UserNotifications STOMP]: ' + str);
            },
            onConnect: () => {
                const topic = `/topic/user.${userId}`;
                console.log(`[UserNotifications] Connected. Subscribing to: ${topic}`);

                subscriptionRef.current = client.subscribe(topic, (msg) => {
                    try {
                        const notification = JSON.parse(msg.body);
                        console.log('[UserNotifications] Received:', notification);

                        switch (notification.type) {
                            case 'FRIEND_REQUEST':
                                if (onFriendRequest && notification.payload) {
                                    onFriendRequest({
                                        senderId: notification.payload.senderId,
                                        senderName: notification.payload.senderName
                                    });
                                }
                                break;
                            case 'FRIEND_ACCEPTED':
                                if (onFriendAccepted && notification.payload) {
                                    onFriendAccepted({
                                        friendId: notification.payload.friendId,
                                        friendName: notification.payload.friendName
                                    });
                                }
                                break;
                            case 'FRIEND_REMOVED':
                                if (onFriendRemoved && notification.payload) {
                                    onFriendRemoved({
                                        friendId: notification.payload.friendId
                                    });
                                }
                                break;
                            case 'CALL_INCOMING':
                                if (onIncomingCall && notification.payload) {
                                    onIncomingCall({
                                        callerId: notification.payload.callerId,
                                        callerName: notification.payload.callerName,
                                        roomId: notification.payload.roomId,
                                        type: notification.payload.type
                                    });
                                }
                                break;
                        }
                    } catch (error) {
                        console.error('[UserNotifications] Failed to parse message:', error);
                    }
                });
            },
            onDisconnect: () => {
                console.warn('[UserNotifications] Disconnected');
            },
            onStompError: (frame) => {
                console.error('[UserNotifications] Error:', frame.headers['message']);
                console.error('[UserNotifications] Details:', frame.body);
            },
        });

        client.activate();
        clientRef.current = client;

        return () => {
            console.log("[UserNotifications] Deactivating...");
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
            if (client) {
                client.deactivate();
            }
        };
    }, [userId, userToken, onFriendRequest, onFriendAccepted, onFriendRemoved, onIncomingCall]);
};
