package com.djjko.dnc.notification.controller;

import com.djjko.dnc.auth.service.CurrentUserService;

import com.djjko.dnc.notification.dto.UserNotificationResponse;

import com.djjko.dnc.notification.service.UserNotificationService;

import io.swagger.v3.oas.annotations.Operation;

import java.util.List;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.GetMapping;

import org.springframework.web.bind.annotation.PatchMapping;

import org.springframework.web.bind.annotation.PathVariable;

import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RequestParam;

import org.springframework.web.bind.annotation.RestController;

@RestController

@RequestMapping("/api/v1/users/me/notifications")

public class UserNotificationController {

    private final UserNotificationService userNotificationService;

    private final CurrentUserService currentUserService;

    public UserNotificationController(

            UserNotificationService userNotificationService,

            CurrentUserService currentUserService) {

        this.userNotificationService = userNotificationService;

        this.currentUserService = currentUserService;

    }

    @Operation(summary = "알림 목록 조회")

    @GetMapping

    public List<UserNotificationResponse> list(

            @RequestParam(value = "unreadOnly", required = false, defaultValue = "false") boolean unreadOnly

    ) {

        Long userId = currentUserService.getRequiredUserId();

        return userNotificationService.list(userId, unreadOnly);

    }

    @Operation(summary = "알림 읽음 처리")

    @PatchMapping("/{notificationId}/read")

    public UserNotificationResponse markRead(@PathVariable("notificationId") Long notificationId) {

        Long userId = currentUserService.getRequiredUserId();

        return userNotificationService.markRead(userId, notificationId);

    }

    @Operation(summary = "알림 전체 읽음 처리")

    @PatchMapping("/read-all")

    public ResponseEntity<Void> markAllRead() {

        Long userId = currentUserService.getRequiredUserId();

        userNotificationService.markAllRead(userId);

        return ResponseEntity.noContent().build();

    }

}
