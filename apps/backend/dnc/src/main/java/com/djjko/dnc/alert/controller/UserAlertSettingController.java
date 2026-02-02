package com.djjko.dnc.alert.controller;

import com.djjko.dnc.alert.dto.UserAlertSettingResponse;
import com.djjko.dnc.alert.dto.UserAlertSettingUpdateRequest;
import com.djjko.dnc.alert.model.AlertType;
import com.djjko.dnc.alert.service.UserAlertSettingService;
import com.djjko.dnc.auth.service.CurrentUserService;
import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/users/me/alert-settings")
public class UserAlertSettingController {

    private final UserAlertSettingService userAlertSettingService;
    private final CurrentUserService currentUserService;

    public UserAlertSettingController(UserAlertSettingService userAlertSettingService,
                                      CurrentUserService currentUserService) {
        this.userAlertSettingService = userAlertSettingService;
        this.currentUserService = currentUserService;
    }

    @Operation(summary = "알림 설정 목록 조회")
    @GetMapping
    public List<UserAlertSettingResponse> getSettings() {
        Long userId = currentUserService.getRequiredUserId();
        return userAlertSettingService.getSettings(userId);
    }

    @Operation(summary = "알림 설정 수정")
    @PatchMapping("/{type}")
    public UserAlertSettingResponse updateSetting(
            @PathVariable("type") String type,
            @RequestBody UserAlertSettingUpdateRequest request
    ) {
        AlertType alertType = AlertType.fromCode(type);
        if (alertType == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid alert type");
        }
        Long userId = currentUserService.getRequiredUserId();
        return userAlertSettingService.updateSetting(userId, alertType, request);
    }
}
