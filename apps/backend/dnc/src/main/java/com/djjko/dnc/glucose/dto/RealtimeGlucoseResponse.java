package com.djjko.dnc.glucose.dto;

import java.util.List;

public record RealtimeGlucoseResponse(
    String rangeStart,
    String rangeEnd,
    Integer targetMin,
    Integer targetMax,
    String latestMeasuredAt,
    Integer latestValue,
    boolean hasMore,
    List<GlucosePointDto> points
) {}
