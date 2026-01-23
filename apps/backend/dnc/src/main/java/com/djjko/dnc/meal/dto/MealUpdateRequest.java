package com.djjko.dnc.meal.dto;

public record MealUpdateRequest(
    String mealType,
    String eatenAt,
    String memo
) {
}
