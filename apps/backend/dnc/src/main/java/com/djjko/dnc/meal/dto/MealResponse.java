package com.djjko.dnc.meal.dto;

import com.djjko.dnc.meal.domain.FoodRecord;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public record MealResponse(
        Long mealId,
        Long userId,
        String foodName,
        Double carbsGrams,
        Integer peakGlucose,
        String imageUrl,
        String mealType,
        String eatenAt,
        String memo,
        String recordedAt,
        String aiGuide) {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public static MealResponse from(FoodRecord record) {
        return new MealResponse(
                record.getFoodId(),
                record.getUserId(),
                record.getFoodName(),
                record.getCarbsGrams(),
                record.getPeakGlucose(),
                record.getImageUrl(),
                record.getMealType() == null ? null : record.getMealType().name(),
                formatDate(record.getEatenAt()),
                record.getMemo(),
                formatDate(record.getRecordedAt()),
                record.getAiGuide());
    }

    private static String formatDate(LocalDateTime value) {
        return value == null ? null : value.format(FORMATTER);
    }
}
