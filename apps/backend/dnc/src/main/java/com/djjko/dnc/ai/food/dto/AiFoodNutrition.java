package com.djjko.dnc.ai.food.dto;

public record AiFoodNutrition(
    int calories,
    String servingSize,
    int carbs,
    int protein,
    int fat,
    int sugar,
    int sodium
) {
}
