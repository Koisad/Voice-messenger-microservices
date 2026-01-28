package com.voicecommunicator.signaling.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.voicecommunicator.signaling.model.SignalMessage;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SocketHandler extends TextWebSocketHandler {

    // active sessions list (ID -> WebSocket session)
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        System.out.println("New conenction WebSocket: " + session.getId());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.values().remove(session);
        System.out.println("Connection closed: " + session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        System.out.println("Received: " + payload);

        try {
            // JSON -> Java object
            SignalMessage signalMessage = objectMapper.readValue(payload, SignalMessage.class);
            String type = signalMessage.getType();

            if ("login".equalsIgnoreCase(type)) {
                String userId = signalMessage.getSender();
                sessions.put(userId, session);
                System.out.println("User logged in: " + userId);

            } else if ("offer".equalsIgnoreCase(type) || "answer".equalsIgnoreCase(type) || "candidate".equalsIgnoreCase(type)) {
                String targetUser = signalMessage.getTarget();
                WebSocketSession targetSession = sessions.get(targetUser);

                if (targetSession != null && targetSession.isOpen()) {
                    System.out.println("Pass " + type + " from " + signalMessage.getSender() + " to " + targetUser);
                    targetSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(signalMessage)));
                } else {
                    System.out.println("User not found: " + targetUser);
                }
            }

        } catch (Exception e) {
            System.err.println("JSON processing error: " + e.getMessage());
        }
    }
}