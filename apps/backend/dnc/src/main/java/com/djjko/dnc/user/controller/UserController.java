package com.djjko.dnc.user.controller;

import com.djjko.dnc.user.dto.UserHealthUpdateRequest;
import com.djjko.dnc.user.dto.UserProfileResponse;
import com.djjko.dnc.user.dto.UserProfileUpdateRequest;
import com.djjko.dnc.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @Operation(summary = "내 정보 조회")
    @GetMapping("/me")
    public UserProfileResponse me(
        @Parameter(description = "임시 사용자 ID", example = "1")
        @RequestHeader(value = "X-User-Id", defaultValue = "1") Long userId
    ) {
        return userService.getProfile(userId);
    }

    @Operation(summary = "회원정보 수정")
    @PatchMapping("/me/profile")
    public UserProfileResponse updateProfile(
        @Parameter(description = "임시 사용자 ID", example = "1")
        @RequestHeader(value = "X-User-Id", defaultValue = "1") Long userId,
        @Valid @RequestBody UserProfileUpdateRequest request
    ) {
        return userService.updateProfile(userId, request);
    }

    @Operation(summary = "건강정보 수정")
    @PatchMapping("/me/health")
    public UserProfileResponse updateHealth(
        @Parameter(description = "임시 사용자 ID", example = "1")
        @RequestHeader(value = "X-User-Id", defaultValue = "1") Long userId,
        @Valid @RequestBody UserHealthUpdateRequest request
    ) {
        return userService.updateHealth(userId, request);
    }

}
