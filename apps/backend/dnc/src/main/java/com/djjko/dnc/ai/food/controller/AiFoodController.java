package com.djjko.dnc.ai.food.controller;

import com.djjko.dnc.ai.food.dto.AiFoodAnalyzeResponse;
import com.djjko.dnc.ai.food.dto.AiFoodNutrition;
import com.djjko.dnc.meal.domain.FoodMetadata;
import com.djjko.dnc.meal.repository.FoodMetadataRepository;
import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/ai/food")
public class AiFoodController {

    private final FoodMetadataRepository foodMetadataRepository;

    public AiFoodController(FoodMetadataRepository foodMetadataRepository) {
        this.foodMetadataRepository = foodMetadataRepository;
    }

    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "음식 사진 분석")
    public AiFoodAnalyzeResponse analyze(
        @RequestPart("image") MultipartFile image,
        @RequestParam(value = "estimatedWeight", required = false) Double estimatedWeight
    ) {
        if (image == null || image.isEmpty()) {
            return new AiFoodAnalyzeResponse(
                List.of("0분", "30분", "60분", "90분", "120분"),
                List.of(0, 0, 0, 0, 0),
                "No image provided.",
                "알 수 없는 음식",
                null,
                estimatedWeight
            );
        }

        String foodName = "닭갈비";
        var metadata = foodMetadataRepository.findFirstByFoodNameIgnoreCase(foodName);
        AiFoodNutrition nutrition = metadata
            .map(result -> toNutrition(result, estimatedWeight))
            .orElse(null);
        Double resolvedWeight = metadata
            .map(result -> resolveWeight(result.getBaseWeight(), estimatedWeight))
            .orElse(estimatedWeight);

        return new AiFoodAnalyzeResponse(
            List.of("0분", "30분", "60분", "90분", "120분"),
            List.of(98, 120, 142, 130, 118),
            "Estimated glucose response after the meal.",
            foodName,
            nutrition,
            resolvedWeight
        );
    }

    private AiFoodNutrition toNutrition(FoodMetadata metadata, Double estimatedWeight) {
        Double baseWeight = metadata.getBaseWeight();
        Double resolvedWeight = resolveWeight(baseWeight, estimatedWeight);
        double ratio = resolveRatio(baseWeight, resolvedWeight);
        String servingSize = resolvedWeight == null
            ? "1인분"
            : String.format("%.0fg", resolvedWeight);

        return new AiFoodNutrition(
            scale(metadata.getCaloriesPerBase(), ratio),
            servingSize,
            scale(metadata.getCarbsPerBase(), ratio),
            scale(metadata.getProteinPerBase(), ratio),
            scale(metadata.getFatPerBase(), ratio),
            scale(metadata.getSugarsPerBase(), ratio),
            scale(metadata.getSodiumPerBase(), ratio)
        );
    }

    private Double resolveWeight(Double baseWeight, Double estimatedWeight) {
        if (estimatedWeight != null && estimatedWeight > 0) {
            return estimatedWeight;
        }
        return baseWeight;
    }

    private double resolveRatio(Double baseWeight, Double resolvedWeight) {
        if (baseWeight == null || baseWeight <= 0) {
            return 1;
        }
        if (resolvedWeight == null || resolvedWeight <= 0) {
            return 1;
        }
        return resolvedWeight / baseWeight;
    }

    private int scale(Double value, double ratio) {
        if (value == null) {
            return 0;
        }
        return (int) Math.round(value * ratio);
    }
}
