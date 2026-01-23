package com.djjko.dnc.controller;

import com.djjko.dnc.service.CgmPipelineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/glucose")
@RequiredArgsConstructor
public class GlucoseController {

    private final CgmPipelineService cgmPipelineService;

    // 파라미터로 days를 받게 수정 (기본값 30일) -> 3년치 뽑고 싶으면 days=1095 입력
    @PostMapping("/fetch-history")
    public String fetchHistory(@RequestParam("userId") Long userId,
                               @RequestParam(value = "days", defaultValue = "30") int days) {

        return cgmPipelineService.fetchHistoricalData(userId, days);
    }
}