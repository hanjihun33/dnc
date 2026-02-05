package com.djjko.dnc.notification.repository;

import com.djjko.dnc.notification.entity.UserNotification;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserNotificationRepository extends JpaRepository<UserNotification, Long> {
    List<UserNotification> findByUser_UserIdOrderByCreatedAtDesc(Long userId);

    List<UserNotification> findByUser_UserIdAndReadAtIsNullOrderByCreatedAtDesc(Long userId);

    Optional<UserNotification> findByNotificationIdAndUser_UserId(Long notificationId, Long userId);

    @Modifying
    @Query("update UserNotification n set n.readAt = :readAt where n.user.userId = :userId and n.readAt is null")
    int markAllRead(@Param("userId") Long userId, @Param("readAt") LocalDateTime readAt);
}
