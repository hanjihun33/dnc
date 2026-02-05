package com.djjko.dnc.notification.service;

import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.notification.dto.UserNotificationResponse;
import com.djjko.dnc.notification.entity.UserNotification;
import com.djjko.dnc.notification.repository.UserNotificationRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UserNotificationService {

    private final UserNotificationRepository userNotificationRepository;

    @Transactional(readOnly = true)
    public List<UserNotificationResponse> list(Long userId, boolean unreadOnly) {
        List<UserNotification> notifications = unreadOnly
                ? userNotificationRepository.findByUser_UserIdAndReadAtIsNullOrderByCreatedAtDesc(userId)
                : userNotificationRepository.findByUser_UserIdOrderByCreatedAtDesc(userId);
        return notifications.stream().map(UserNotificationResponse::from).toList();
    }

    @Transactional
    public UserNotificationResponse markRead(Long userId, Long notificationId) {
        UserNotification notification = userNotificationRepository
                .findByNotificationIdAndUser_UserId(notificationId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        notification.markRead();
        return UserNotificationResponse.from(notification);
    }

    @Transactional
    public int markAllRead(Long userId) {
        return userNotificationRepository.markAllRead(userId, LocalDateTime.now());
    }

    @Transactional
    public void create(User user, String type, String title, String body) {
        if (user == null) {
            return;
        }
        UserNotification notification = UserNotification.builder()
                .user(user)
                .notificationType(type)
                .title(title)
                .body(body)
                .build();
        userNotificationRepository.save(notification);
    }
}
