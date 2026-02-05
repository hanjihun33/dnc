package com.djjko.dnc.meal.dto;

import com.djjko.dnc.meal.domain.FoodRecord;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public record MealResponse(
        Long mealId,
        Long userId,
        String foodName,
        Double carbsGrams,
        Double weightGrams,
        Double servingCount,
        Integer peakGlucose,
        String imageUrl,
        String mealType,
        String eatenAt,
        String memo,
        String recordedAt,
        String aiGuide,
        Integer calories,
        Integer carbs,
        Integer protein,
        Integer fat) {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public static MealResponse from(FoodRecord record) {
        return from(record, null, null, null, null);
    }

    public static MealResponse from(
            FoodRecord record,
            Integer calories,
            Integer carbs,
            Integer protein,
            Integer fat) {
        return from(record, calories, carbs, protein, fat, null, null);
    }

    public static MealResponse from(
            FoodRecord record,
            Integer calories,
            Integer carbs,
            Integer protein,
            Integer fat,
            String foodNameOverride,
            String imageUrlOverride) {
        String resolvedFoodName = record == null ? null : record.getFoodName();
        if (foodNameOverride != null && !foodNameOverride.isBlank()) {
            resolvedFoodName = foodNameOverride;
        }
        String finalImageUrl = record != null ? record.getImageUrl() : null;
        if (imageUrlOverride != null) {
            finalImageUrl = imageUrlOverride;
        }

        return new MealResponse(
                record.getFoodId(),
                record.getUserId(),
                resolvedFoodName,
                record.getCarbsGrams(),
                record.getWeightGrams(),
                record.getServingCount(),
                record.getPeakGlucose(),
                finalImageUrl,
                record.getMealType() == null ? null : record.getMealType().name(),
                formatDate(record.getEatenAt()),
                record.getMemo(),
                formatDate(record.getRecordedAt()),
                record.getAiGuide(),
                calories,
                carbs,
                protein,
                fat);
    }

    private static String formatDate(LocalDateTime value) {
        return value == null ? null : value.format(FORMATTER);
    }
}
