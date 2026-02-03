package com.djjko.dnc.ai.food.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiGlucosePredictionRequest(
    @JsonProperty("carbs") double carbs,
    @JsonProperty("protein") double protein,
    @JsonProperty("fat") double fat,
    @JsonProperty("fiber") double fiber,
    @JsonProperty("sodium") double sodium,
    @JsonProperty("meal_order") String mealOrder,
    @JsonProperty("exercise_intensity") String exerciseIntensity,
    @JsonProperty("weight_kg") double weightKg,
    @JsonProperty("height_cm") double heightCm,
    @JsonProperty("sys_bg") double sysBg,
    @JsonProperty("sys_bp") double sysBp,
    @JsonProperty("fasting_hours") double fastingHours,
    @JsonProperty("trend_slope_up") double trendSlopeUp,
    @JsonProperty("trend_slope_down") double trendSlopeDown,
    @JsonProperty("is_t2d") boolean isT2d,
    @JsonProperty("user_id") long userId,
    @JsonProperty("time_stamp") String timeStamp,
    @JsonProperty("has_enough_data") boolean hasEnoughData
) {
}
