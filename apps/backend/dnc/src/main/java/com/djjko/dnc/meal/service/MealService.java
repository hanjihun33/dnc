package com.djjko.dnc.meal.service;

import com.djjko.dnc.ai.food.FoodAnalysis;
import com.djjko.dnc.ai.food.FoodAnalysisRepository;
import com.djjko.dnc.ai.food.service.AiFoodService;
import com.djjko.dnc.meal.domain.FoodMetadata;
import com.djjko.dnc.meal.domain.FoodRecord;
import com.djjko.dnc.meal.domain.MealType;
import com.djjko.dnc.meal.dto.MealResponse;
import com.djjko.dnc.meal.dto.MealUpdateRequest;
import com.djjko.dnc.meal.repository.FoodMetadataRepository;
import com.djjko.dnc.meal.repository.FoodRecordRepository;
import com.djjko.dnc.storage.FileStorageService;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class MealService {

    private static final Logger log = LoggerFactory.getLogger(MealService.class);

    private final FoodRecordRepository repository;
    private final FileStorageService fileStorageService;
    private final AiFoodService aiFoodService;
    private final FoodAnalysisRepository foodAnalysisRepository;
    private final FoodMetadataRepository foodMetadataRepository;

    public MealService(
            FoodRecordRepository repository,
            FileStorageService fileStorageService,
            AiFoodService aiFoodService,
            FoodAnalysisRepository foodAnalysisRepository,
            FoodMetadataRepository foodMetadataRepository) {
        this.repository = repository;
        this.fileStorageService = fileStorageService;
        this.aiFoodService = aiFoodService;
        this.foodAnalysisRepository = foodAnalysisRepository;
        this.foodMetadataRepository = foodMetadataRepository;
    }

    public MealResponse create(
            Long userId,
            MultipartFile image,
            String foodName,
            Double carbsGrams,
            Double weightGrams,
            Double servingCount,
            String mealType,
            String eatenAt,
            String memo,
            String aiGuide) {
        FoodRecord record = new FoodRecord();
        record.setUserId(userId);
        record.setFoodName(foodName);
        record.setCarbsGrams(carbsGrams);
        record.setWeightGrams(weightGrams);
        record.setServingCount(servingCount);
        record.setMealType(MealType.from(mealType));
        record.setEatenAt(parseDateTime(eatenAt));
        record.setMemo(memo);
        record.setAiGuide(aiGuide);

        if (image != null && !image.isEmpty()) {
            record.setImageUrl(fileStorageService.save(image));
        }

        LocalDateTime now = LocalDateTime.now();
        record.setRecordedAt(now);
        record.setUpdatedAt(now);

        FoodRecord savedRecord = repository.save(record);
        if (image != null && !image.isEmpty()) {
            try {
                aiFoodService.analyzeAndPersist(
                        userId,
                        savedRecord.getFoodId(),
                        savedRecord.getEatenAt(),
                        image,
                        null);
            } catch (Exception ex) {
                log.warn("Failed to persist AI analysis for meal {}: {}", savedRecord.getFoodId(), ex.getMessage());
            }
        }

        return buildMealResponse(savedRecord);
    }

    @Transactional(readOnly = true)
    public List<MealResponse> findAll(Long userId) {
        return repository.findByUserIdOrderByRecordedAtDesc(userId).stream()
                .map(this::buildMealResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<MealResponse> findOne(Long mealId) {
        return repository.findById(mealId).map(this::buildMealResponse);
    }

    public Optional<MealResponse> update(Long mealId, MealUpdateRequest request) {
        return repository.findById(mealId).map(record -> {
            MealType newType = MealType.from(request.mealType());
            if (newType != null) {
                record.setMealType(newType);
            }
            if (request.foodName() != null) {
                record.setFoodName(request.foodName());
            }
            if (request.carbsGrams() != null) {
                record.setCarbsGrams(request.carbsGrams());
            }
            if (request.weightGrams() != null) {
                record.setWeightGrams(request.weightGrams());
            }
            if (request.servingCount() != null) {
                record.setServingCount(request.servingCount());
            }
            if (request.peakGlucose() != null) {
                record.setPeakGlucose(request.peakGlucose());
            }
            if (request.eatenAt() != null && !request.eatenAt().isBlank()) {
                record.setEatenAt(parseDateTime(request.eatenAt()));
            }
            if (request.memo() != null) {
                record.setMemo(request.memo());
            }
            record.setUpdatedAt(LocalDateTime.now());
            return buildMealResponse(record);
        });
    }

    public Optional<MealResponse> updateImage(Long mealId, Long userId, MultipartFile image) {
        return repository.findById(mealId).map(record -> {
            if (image != null && !image.isEmpty()) {
                record.setImageUrl(fileStorageService.save(image));
                record.setUpdatedAt(LocalDateTime.now());
                try {
                    aiFoodService.analyzeAndPersist(
                            userId,
                            record.getFoodId(),
                            record.getEatenAt(),
                            image,
                            null);
                } catch (Exception ex) {
                    log.warn("Failed to persist AI analysis for meal {}: {}", record.getFoodId(), ex.getMessage());
                }
            }
            return buildMealResponse(record);
        });
    }

    public void delete(Long mealId) {
        repository.deleteById(mealId);
    }

    @Transactional(readOnly = true)
    public List<MealResponse> getMealsByRange(Long userId, LocalDateTime start, LocalDateTime end) {
        return repository.findAllByUserIdAndEatenAtBetween(userId, start, end).stream()
                .map(this::buildMealResponse)
                .toList();
    }

    private LocalDateTime parseDateTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException ex) {
            try {
                return OffsetDateTime.parse(value)
                        .atZoneSameInstant(java.time.ZoneId.systemDefault())
                        .toLocalDateTime();
            } catch (DateTimeParseException ignored) {
                return null;
            }
        }
    }

    private MealResponse buildMealResponse(FoodRecord record) {
        if (record == null) {
            return null;
        }

        // Resolve mapped URL (e.g., presigned URL for S3)
        // Resolve mapped URL (e.g., presigned URL for S3)
        String resolvedImageUrl = null;
        if (record.getImageUrl() != null) {
            String originalUrl = record.getImageUrl();
            resolvedImageUrl = fileStorageService.resolveMappedUrl(originalUrl);
            log.debug("Image URL Resolution - Original: {}, Resolved: {}", originalUrl, resolvedImageUrl);
            // record.setImageUrl(resolvedUrl); // DO NOT MODIFY ENTITY - Causes dirty check
            // update!
        }

        NutritionSummary nutrition = resolveNutrition(record);
        String resolvedFoodName = record.getFoodName();
        if ((resolvedFoodName == null || resolvedFoodName.isBlank()) && nutrition != null) {
            resolvedFoodName = nutrition.foodName();
        }
        return MealResponse.from(
                record,
                nutrition == null ? null : nutrition.calories(),
                nutrition == null ? null : nutrition.carbs(),
                nutrition == null ? null : nutrition.protein(),
                nutrition == null ? null : nutrition.fat(),
                resolvedFoodName,
                resolvedImageUrl);
    }

    private NutritionSummary resolveNutrition(FoodRecord record) {
        if (record == null || record.getFoodId() == null) {
            return null;
        }
        Optional<FoodAnalysis> analysis = foodAnalysisRepository
                .findTopByFoodIdOrderByAnalyzedAtDesc(record.getFoodId());
        Optional<FoodMetadata> metadata = Optional.empty();
        if (analysis.isPresent()) {
            Long foodCode = analysis.get().getFoodCode();
            if (foodCode != null) {
                metadata = foodMetadataRepository.findById(foodCode);
            }
        }
        if (metadata.isEmpty()) {
            String foodName = record.getFoodName();
            if (foodName != null && !foodName.isBlank()) {
                metadata = foodMetadataRepository.findFirstByFoodNameIgnoreCase(foodName);
            }
        }
        if (metadata.isEmpty()) {
            return null;
        }

        FoodMetadata meta = metadata.get();
        Double resolvedWeight = resolveWeight(
                meta.getBaseWeight(),
                analysis.map(FoodAnalysis::getEstimatedWeight).orElse(null),
                record.getWeightGrams(),
                record.getServingCount());
        double ratio = resolveRatio(meta.getBaseWeight(), resolvedWeight);

        Integer calories = scale(meta.getCaloriesPerBase(), ratio);
        Integer carbs = scale(meta.getCarbsPerBase(), ratio);
        Integer protein = scale(meta.getProteinPerBase(), ratio);
        Integer fat = scale(meta.getFatPerBase(), ratio);

        if (calories == null && carbs == null && protein == null && fat == null && meta.getFoodName() == null) {
            return null;
        }

        return new NutritionSummary(calories, carbs, protein, fat, meta.getFoodName());
    }

    private Double resolveWeight(
            Double baseWeight,
            Double estimatedWeight,
            Double manualWeight,
            Double servingCount) {
        if (manualWeight != null && manualWeight > 0) {
            return manualWeight;
        }
        if (servingCount != null && servingCount > 0 && baseWeight != null && baseWeight > 0) {
            return baseWeight * servingCount;
        }
        if (estimatedWeight != null && estimatedWeight > 0) {
            return estimatedWeight;
        }
        return baseWeight;
    }

    private double resolveRatio(Double baseWeight, Double resolvedWeight) {
        if (baseWeight == null || baseWeight <= 0) {
            return 1.0;
        }
        if (resolvedWeight == null || resolvedWeight <= 0) {
            return 1.0;
        }
        return resolvedWeight / baseWeight;
    }

    private Integer scale(Double value, double ratio) {
        if (value == null) {
            return null;
        }
        return (int) Math.round(value * ratio);
    }

    private record NutritionSummary(
            Integer calories,
            Integer carbs,
            Integer protein,
            Integer fat,
            String foodName) {
    }
}
