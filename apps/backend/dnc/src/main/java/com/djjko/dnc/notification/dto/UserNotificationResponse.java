package com.djjko.dnc.notification.dto;

import com.djjko.dnc.notification.entity.UserNotification;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public record UserNotificationResponse(
        Long notificationId,
        String type,
        String title,
        String body,
        String readAt,
        String createdAt
) {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public static UserNotificationResponse from(UserNotification notification) {
        return new UserNotificationResponse(
                notification.getNotificationId(),
                notification.getNotificationType(),
                notification.getTitle(),
                notification.getBody(),
                formatDate(notification.getReadAt()),
                formatDate(notification.getCreatedAt())
        );
    }

    private static String formatDate(LocalDateTime value) {
        return value == null ? null : value.format(FORMATTER);
    }
}
