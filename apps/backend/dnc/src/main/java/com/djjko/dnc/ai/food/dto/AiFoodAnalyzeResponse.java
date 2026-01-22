package com.djjko.dnc.ai.food.dto;

import java.util.List;

public record AiFoodAnalyzeResponse(List<String> labels, List<Integer> values, String guide) {
}
