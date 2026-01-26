package com.djjko.dnc.glucose.controller;

import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.auth.repository.UserRepository;
import com.djjko.dnc.glucose.service.CgmPipelineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@RestController
@RequestMapping("/api/v1/glucose")
@RequiredArgsConstructor
public class GlucoseController {

    private final CgmPipelineService cgmPipelineService;
    private final UserRepository userRepository; // UserRepository 추가

    // 파라미터로 days를 받게 수정 (기본값 30일) -> 3년치 뽑고 싶으면 days=1095 입력
    @PostMapping("/fetch-history")
    public String fetchHistory(@RequestParam("userId") Long userId,
                               @RequestParam(value = "days", defaultValue = "30") int days) {

        return cgmPipelineService.fetchHistoricalData(userId, days);
    }

    // 임시 테스트용 최신 데이터 가져오기 엔드포인트
    @GetMapping("/fetch-latest-data/{userId}")
    public String fetchLatestData(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with ID: " + userId));

        cgmPipelineService.fetchLatestDataForUser(user);
        return "Latest Dexcom data fetch initiated for user " + userId + ". Check logs for details.";
    }
}