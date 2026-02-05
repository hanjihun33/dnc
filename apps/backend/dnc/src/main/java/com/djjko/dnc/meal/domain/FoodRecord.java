package com.djjko.dnc.meal.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "food_records")
public class FoodRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "food_id")
    private Long foodId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "food_name")
    private String foodName;

    @Column(name = "carbs_grams")
    private Double carbsGrams;

    @Column(name = "weight_grams")
    private Double weightGrams;

    @Column(name = "serving_count")
    private Double servingCount;

    @Column(name = "peak_glucose")
    private Integer peakGlucose;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "memo")
    private String memo;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type")
    private MealType mealType;

    @Column(name = "eaten_at")
    private LocalDateTime eatenAt;

    @Column(name = "recorded_at")
    private LocalDateTime recordedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Long getFoodId() {
        return foodId;
    }

    public void setFoodId(Long foodId) {
        this.foodId = foodId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getFoodName() {
        return foodName;
    }

    public void setFoodName(String foodName) {
        this.foodName = foodName;
    }

    public Double getCarbsGrams() {
        return carbsGrams;
    }

    public void setCarbsGrams(Double carbsGrams) {
        this.carbsGrams = carbsGrams;
    }

    public Double getWeightGrams() {
        return weightGrams;
    }

    public void setWeightGrams(Double weightGrams) {
        this.weightGrams = weightGrams;
    }

    public Double getServingCount() {
        return servingCount;
    }

    public void setServingCount(Double servingCount) {
        this.servingCount = servingCount;
    }

    public Integer getPeakGlucose() {
        return peakGlucose;
    }

    public void setPeakGlucose(Integer peakGlucose) {
        this.peakGlucose = peakGlucose;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getMemo() {
        return memo;
    }

    public void setMemo(String memo) {
        this.memo = memo;
    }

    @Column(name = "ai_guide", columnDefinition = "TEXT")
    private String aiGuide;

    public String getAiGuide() {
        return aiGuide;
    }

    public void setAiGuide(String aiGuide) {
        this.aiGuide = aiGuide;
    }

    public MealType getMealType() {
        return mealType;
    }

    public void setMealType(MealType mealType) {
        this.mealType = mealType;
    }

    public LocalDateTime getEatenAt() {
        return eatenAt;
    }

    public void setEatenAt(LocalDateTime eatenAt) {
        this.eatenAt = eatenAt;
    }

    public LocalDateTime getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(LocalDateTime recordedAt) {
        this.recordedAt = recordedAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
