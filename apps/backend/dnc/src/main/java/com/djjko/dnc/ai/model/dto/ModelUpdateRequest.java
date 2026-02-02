package com.djjko.dnc.ai.model.dto;

import java.util.List;

public record ModelUpdateRequest(
    List<ModelUpdateGlucose> glucose,
    List<ModelUpdateEvent> events
) {
}
