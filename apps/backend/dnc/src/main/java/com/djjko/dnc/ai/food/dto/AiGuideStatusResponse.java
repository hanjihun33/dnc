package com.djjko.dnc.ai.food.dto;

public record AiGuideStatusResponse(
        String requestId,
        String status,
        String aiGuide,
        String message) {
}
