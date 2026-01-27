package com.djjko.dnc.user.controller;

import com.djjko.dnc.auth.service.CurrentUserService;
import com.djjko.dnc.user.dto.UserPasswordChangeRequest;
import com.djjko.dnc.user.dto.UserHealthUpdateRequest;
import com.djjko.dnc.user.dto.UserProfileResponse;
import com.djjko.dnc.user.dto.UserProfileUpdateRequest;
import com.djjko.dnc.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ResponseEntity;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;
    private final CurrentUserService currentUserService;

    public UserController(UserService userService, CurrentUserService currentUserService) {
        this.userService = userService;
        this.currentUserService = currentUserService;
    }

    @Operation(summary = "내 정보 조회")
    @GetMapping("/me")
    public UserProfileResponse me() {
        Long userId = currentUserService.getRequiredUserId();
        return userService.getProfile(userId);
    }

    @Operation(summary = "회원정보 수정")
    @PatchMapping("/me/profile")
    public UserProfileResponse updateProfile(
        @Valid @RequestBody UserProfileUpdateRequest request
    ) {
        Long userId = currentUserService.getRequiredUserId();
        return userService.updateProfile(userId, request);
    }

    @Operation(summary = "건강정보 수정")
    @PatchMapping("/me/health")
    public UserProfileResponse updateHealth(
        @Valid @RequestBody UserHealthUpdateRequest request
    ) {
        Long userId = currentUserService.getRequiredUserId();
        return userService.updateHealth(userId, request);
    }

    @Operation(summary = "프로필 이미지 업로드")
    @PatchMapping(value = "/me/profile-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserProfileResponse updateProfileImage(
        @Parameter(description = "프로필 이미지 파일")
        @Schema(type = "string", format = "binary")
        @RequestPart("image") MultipartFile image
    ) {
        Long userId = currentUserService.getRequiredUserId();
        return userService.updateProfileImage(userId, image);
    }

    @Operation(summary = "프로필 이미지 삭제")
    @DeleteMapping("/me/profile-image")
    public UserProfileResponse deleteProfileImage() {
        Long userId = currentUserService.getRequiredUserId();
        return userService.deleteProfileImage(userId);
    }

    @Operation(summary = "회원 탈퇴")
    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteAccount() {
        Long userId = currentUserService.getRequiredUserId();
        userService.deleteAccount(userId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "비밀번호 변경")
    @PatchMapping("/me/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody UserPasswordChangeRequest request) {
        Long userId = currentUserService.getRequiredUserId();
        userService.changePassword(userId, request);
        return ResponseEntity.noContent().build();
    }

}
