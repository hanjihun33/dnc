package com.djjko.dnc.push.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.BatchResponse;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.MulticastMessage;
import com.google.firebase.messaging.Notification;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class FcmService {

    public boolean isReady() {
        return !FirebaseApp.getApps().isEmpty();
    }

    public void sendToTokens(List<String> tokens, String title, String body, Map<String, String> data,
                             TokenFailureHandler failureHandler) {
        if (tokens == null || tokens.isEmpty()) {
            return;
        }
        if (!isReady()) {
            log.warn("FirebaseApp not initialized. Skip sending FCM.");
            return;
        }

        MulticastMessage message = MulticastMessage.builder()
                .addAllTokens(tokens)
                .setNotification(Notification.builder().setTitle(title).setBody(body).build())
                .putAllData(data)
                .build();

        try {
            BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);
            if (response.getFailureCount() > 0 && failureHandler != null) {
                for (int i = 0; i < response.getResponses().size(); i++) {
                    if (!response.getResponses().get(i).isSuccessful()) {
                        failureHandler.onFailure(tokens.get(i), response.getResponses().get(i).getException());
                    }
                }
            }
        } catch (FirebaseMessagingException e) {
            log.error("FCM send failed: {}", e.getMessage());
        }
    }

    @FunctionalInterface
    public interface TokenFailureHandler {
        void onFailure(String token, FirebaseMessagingException exception);
    }
}
