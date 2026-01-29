package com.djjko.dnc.meal.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "food_metadata")
public class FoodMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "food_code")
    private Long foodCode;

    @Column(name = "food_name")
    private String foodName;

    @Column(name = "base_weight")
    private Double baseWeight;

    @Column(name = "cal_per_base")
    private Double caloriesPerBase;

    @Column(name = "carbs_per_base")
    private Double carbsPerBase;

    @Column(name = "sugars_per_base")
    private Double sugarsPerBase;

    @Column(name = "fat_per_base")
    private Double fatPerBase;

    @Column(name = "protein_per_base")
    private Double proteinPerBase;

    @Column(name = "sodium_per_base")
    private Double sodiumPerBase;

    public Long getFoodCode() {
        return foodCode;
    }

    public String getFoodName() {
        return foodName;
    }

    public Double getBaseWeight() {
        return baseWeight;
    }

    public Double getCaloriesPerBase() {
        return caloriesPerBase;
    }

    public Double getCarbsPerBase() {
        return carbsPerBase;
    }

    public Double getSugarsPerBase() {
        return sugarsPerBase;
    }

    public Double getFatPerBase() {
        return fatPerBase;
    }

    public Double getProteinPerBase() {
        return proteinPerBase;
    }

    public Double getSodiumPerBase() {
        return sodiumPerBase;
    }
}
