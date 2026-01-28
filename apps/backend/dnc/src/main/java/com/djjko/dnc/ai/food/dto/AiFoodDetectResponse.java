package com.djjko.dnc.ai.food.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record AiFoodDetectResponse(
    @JsonProperty("result") List<AiFoodDetectResult> result
) {
}
