package com.djjko.dnc.meal.dto;

public record MealUpdateRequest(
    String mealType,
    String eatenAt,
    String memo,
    String foodName,
    Double carbsGrams,
    Double weightGrams,
    Double servingCount,
    Integer peakGlucose
) {
}
