package com.djjko.dnc.glucose.controller;

import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.auth.repository.UserRepository;
import com.djjko.dnc.auth.service.CurrentUserService;
import com.djjko.dnc.glucose.dto.GlucosePointDto;
import com.djjko.dnc.glucose.dto.RealtimeGlucoseResponse;
import com.djjko.dnc.glucose.service.CgmPipelineService;
import com.djjko.dnc.report.repository.GlucoseDataRepository;
import com.djjko.dnc.user.model.DiabetesType;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/glucose")
@RequiredArgsConstructor
public class GlucoseController {

    private final CgmPipelineService cgmPipelineService;
    private final UserRepository userRepository; // UserRepository 추가
    private final CurrentUserService currentUserService;
    private final GlucoseDataRepository glucoseDataRepository;

    private static final int DEFAULT_TARGET_MIN = 70;
    private static final int DEFAULT_TARGET_MAX = 140;
    private static final int DIABETES_TARGET_MAX = 180;
    private static final Duration MAX_RANGE = Duration.ofDays(7);
    private static final Duration DEFAULT_RANGE = Duration.ofHours(24);
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    // 파라미터로 days를 받게 수정 (기본값 30일) -> 3년치 뽑고 싶으면 days=1095 입력
    @PostMapping("/fetch-history")
    @Operation(summary = "혈당 이력 수집")
    public String fetchHistory(@RequestParam("userId") Long userId,
            @RequestParam(value = "days", defaultValue = "30") int days) {

        return cgmPipelineService.fetchHistoricalData(userId, days);
    }

    // 임시 테스트용 최신 데이터 가져오기 엔드포인트
    @GetMapping("/fetch-latest-data/{userId}")
    @Operation(summary = "최신 혈당 데이터 수집")
    public String fetchLatestData(@PathVariable("userId") Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with ID: " + userId));

        cgmPipelineService.fetchLatestDataForUser(user);
        return "Latest Dexcom data fetch initiated for user " + userId + ". Check logs for details.";
    }

    @GetMapping("/realtime")
    @Operation(summary = "실시간 혈당 그래프 데이터 조회 (현재 로그인 유저)")
    public RealtimeGlucoseResponse getRealtime(
            @RequestParam(value = "start", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(value = "end", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        Long userId = currentUserService.getRequiredUserId();
        LocalDateTime now = LocalDateTime.now();

        LocalDateTime rangeEnd = end == null ? now : end;
        if (rangeEnd.isAfter(now)) {
            rangeEnd = now;
        }

        LocalDateTime rangeStart = start == null ? rangeEnd.minus(DEFAULT_RANGE) : start;
        if (rangeStart.isAfter(rangeEnd)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "start must be before end");
        }

        if (Duration.between(rangeStart, rangeEnd).compareTo(MAX_RANGE) > 0) {
            rangeStart = rangeEnd.minus(MAX_RANGE);
        }

        List<GlucosePointDto> points = glucoseDataRepository
                .findAllByUser_UserIdAndMeasuredAtBetweenOrderByMeasuredAtAsc(userId, rangeStart, rangeEnd)
                .stream()
                .map(data -> new GlucosePointDto(
                        data.getMeasuredAt() == null ? null : data.getMeasuredAt().format(FORMATTER),
                        data.getValue(),
                        data.getTrend(),
                        data.getTrendRate()))
                .toList();

        boolean hasMore = glucoseDataRepository.existsByUser_UserIdAndMeasuredAtBefore(userId, rangeStart);
        Integer targetMax = resolveTargetMax(userId);

        var latest = glucoseDataRepository.findTopByUser_UserIdOrderByMeasuredAtDesc(userId);
        String latestMeasuredAt = latest == null || latest.getMeasuredAt() == null
                ? null
                : latest.getMeasuredAt().format(FORMATTER);
        Integer latestValue = latest == null ? null : latest.getValue();

        return new RealtimeGlucoseResponse(
                rangeStart.format(FORMATTER),
                rangeEnd.format(FORMATTER),
                DEFAULT_TARGET_MIN,
                targetMax,
                latestMeasuredAt,
                latestValue,
                hasMore,
                points);
    }

    private Integer resolveTargetMax(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with ID: " + userId));
        DiabetesType diabetesType = user.getDiabetesType();
        if (diabetesType == DiabetesType.TYPE1 || diabetesType == DiabetesType.TYPE2) {
            return DIABETES_TARGET_MAX;
        }
        return DEFAULT_TARGET_MAX;
    }
}
