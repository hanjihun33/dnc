package com.djjko.dnc.ai.food.dto;

import java.util.List;

public record AiGlucosePredictionResponse(
    List<Double> forecast
) {
}
