package com.djjko.dnc.glucose.dto;

public record GlucosePointDto(
    String measuredAt,
    Integer value,
    String trend,
    Double trendRate
) {}
