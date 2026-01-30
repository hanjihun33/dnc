package com.djjko.dnc.push.controller;

import com.djjko.dnc.auth.service.CurrentUserService;
import com.djjko.dnc.push.dto.PushTokenRequest;
import com.djjko.dnc.push.service.PushTokenService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users/me/push-tokens")
public class PushTokenController {

    private final PushTokenService pushTokenService;
    private final CurrentUserService currentUserService;

    public PushTokenController(PushTokenService pushTokenService, CurrentUserService currentUserService) {
        this.pushTokenService = pushTokenService;
        this.currentUserService = currentUserService;
    }

    @Operation(summary = "푸시 토큰 등록")
    @PostMapping
    public ResponseEntity<Void> register(@RequestBody PushTokenRequest request) {
        Long userId = currentUserService.getRequiredUserId();
        pushTokenService.register(userId, request);
        return ResponseEntity.ok().build();
    }
}
