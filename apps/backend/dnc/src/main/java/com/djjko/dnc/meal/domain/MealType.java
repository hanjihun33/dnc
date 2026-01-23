package com.djjko.dnc.meal.domain;

public enum MealType {
    BREAKFAST,
    LUNCH,
    DINNER,
    SNACK;

    public static MealType from(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return MealType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
