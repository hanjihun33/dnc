package com.djjko.dnc.glucose.controller;

import com.djjko.dnc.auth.service.CurrentUserService;
import com.djjko.dnc.glucose.dto.SensorResponse;
import com.djjko.dnc.glucose.service.SensorService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sensors")
@RequiredArgsConstructor
public class SensorController {

    private final SensorService sensorService;
    private final CurrentUserService currentUserService;

    @GetMapping("/active")
    @Operation(summary = "현재 활성화된 센서 조회")
    public ResponseEntity<SensorResponse> getActiveSensor() {
        Long userId = currentUserService.getRequiredUserId();
        return sensorService.getActiveSensor(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/history")
    @Operation(summary = "센서 이력 조회 (최신순)")
    public ResponseEntity<java.util.List<SensorResponse>> getSensorHistory() {
        Long userId = currentUserService.getRequiredUserId();
        java.util.List<SensorResponse> sensors = sensorService.getSensorHistory(userId);
        return ResponseEntity.ok(sensors);
    }
}
