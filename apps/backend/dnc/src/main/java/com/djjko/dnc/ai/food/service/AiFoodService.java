package com.djjko.dnc.ai.food.service;

import com.djjko.dnc.ai.food.FoodAnalysis;
import com.djjko.dnc.ai.food.FoodAnalysisRepository;
import com.djjko.dnc.ai.food.dto.AiFoodAnalyzeResponse;
import com.djjko.dnc.ai.food.dto.AiFoodDetectResult;
import com.djjko.dnc.ai.food.dto.AiFoodNutrition;
import com.djjko.dnc.ai.food.dto.AiGlucosePredictionRequest;
import com.djjko.dnc.prediction.entity.GlucosePrediction;
import com.djjko.dnc.prediction.repository.GlucosePredictionRepository;
import com.djjko.dnc.meal.domain.FoodMetadata;
import com.djjko.dnc.meal.repository.FoodMetadataRepository;
import com.djjko.dnc.meal.domain.FoodRecord;
import com.djjko.dnc.meal.repository.FoodRecordRepository;
import com.djjko.dnc.storage.FileStorageService;
import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.auth.repository.UserRepository;
import com.djjko.dnc.report.repository.GlucoseDataRepository;
import com.djjko.dnc.user.model.DiabetesType;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AiFoodService {

    private static final Logger log = LoggerFactory.getLogger(AiFoodService.class);
    private static final List<String> DEFAULT_LABELS = List.of("0", "30", "60", "90", "120");
    private static final List<Integer> DEFAULT_VALUES = List.of(98, 120, 142, 130, 118);
    private static final List<Integer> ZERO_VALUES = List.of(0, 0, 0, 0, 0);
    private static final String DEFAULT_GUIDE = "Estimated glucose response after the meal.";
    private static final String FALLBACK_FOOD_NAME = "Unknown food";
    private static final String IMAGE_PREFIX = "ai";
    private static final double DEFAULT_WEIGHT_KG = 70.0;
    private static final double DEFAULT_HEIGHT_CM = 170.0;
    private static final double DEFAULT_SYS_BG = 120.0;
    private static final double DEFAULT_SYS_BP = 120.0;
    private static final double DEFAULT_FASTING_HOURS = 8.0;
    private static final double DEFAULT_TREND_SLOPE_UP = 0.0;
    private static final double DEFAULT_TREND_SLOPE_DOWN = 0.0;
    private static final String DEFAULT_MEAL_ORDER = "veggie_protein_first";
    private static final String DEFAULT_EXERCISE_INTENSITY = "low";
    private static final double DEFAULT_FIBER = 0.0;
    private static final String FOOD_MODEL_NAME = "food-detection";
    private static final String FOOD_MODEL_VERSION = "v1";
    private static final String PREDICTION_MODEL_NAME = "glucose-prediction";
    private static final String PREDICTION_MODEL_VERSION = "v1";

    private final AiServerClient aiServerClient;
    private final FoodMetadataRepository foodMetadataRepository;
    private final FileStorageService fileStorageService;
    private final UserRepository userRepository;
    private final GlucoseDataRepository glucoseDataRepository;
    private final FoodAnalysisRepository foodAnalysisRepository;
    private final GlucosePredictionRepository glucosePredictionRepository;
    private final ObjectMapper objectMapper;
    private final com.djjko.dnc.ai.gemini.service.AiFoodGuideService aiFoodGuideService;
    private final FoodRecordRepository foodRecordRepository;

    public AiFoodService(
            AiServerClient aiServerClient,
            FoodMetadataRepository foodMetadataRepository,
            FileStorageService fileStorageService,
            UserRepository userRepository,
            GlucoseDataRepository glucoseDataRepository,
            FoodAnalysisRepository foodAnalysisRepository,
            GlucosePredictionRepository glucosePredictionRepository,
            ObjectMapper objectMapper,
            com.djjko.dnc.ai.gemini.service.AiFoodGuideService aiFoodGuideService,
            FoodRecordRepository foodRecordRepository) {
        this.aiServerClient = aiServerClient;
        this.foodMetadataRepository = foodMetadataRepository;
        this.fileStorageService = fileStorageService;
        this.userRepository = userRepository;
        this.glucoseDataRepository = glucoseDataRepository;
        this.foodAnalysisRepository = foodAnalysisRepository;
        this.glucosePredictionRepository = glucosePredictionRepository;
        this.objectMapper = objectMapper;
        this.aiFoodGuideService = aiFoodGuideService;
        this.foodRecordRepository = foodRecordRepository;
    }

    public AiFoodAnalyzeResponse analyze(Long userId, MultipartFile image, Double estimatedWeight) {
        if (image == null || image.isEmpty()) {
            return new AiFoodAnalyzeResponse(
                    DEFAULT_LABELS,
                    ZERO_VALUES,
                    "No image provided.",
                    FALLBACK_FOOD_NAME,
                    null,
                    null,
                    null,
                    estimatedWeight,
                    null);
        }

        String imageUrl = null;
        try {
            imageUrl = fileStorageService.save(image, IMAGE_PREFIX);
        } catch (Exception ex) {
            log.warn("Failed to store AI analyze image: {}", ex.getMessage());
        }

        var detection = aiServerClient.analyzeFood(image);
        String detectedName = detection.map(result -> result.foodName())
                .filter(name -> name != null && !name.isBlank())
                .orElse(FALLBACK_FOOD_NAME);
        var detectedBox = detection.map(result -> result.box()).orElse(null);
        String detectedQuantity = detection.map(result -> result.quantity()).orElse(null);

        Optional<FoodMetadata> metadata = resolveMetadata(detectedName);
        String foodName = metadata.map(FoodMetadata::getFoodName).orElse(detectedName);
        AiFoodNutrition nutrition = metadata
                .map(result -> toNutrition(result, estimatedWeight, detectedQuantity))
                .orElse(null);
        Double resolvedWeight = metadata
                .map(result -> resolveWeight(result.getBaseWeight(), estimatedWeight, detectedQuantity))
                .orElse(estimatedWeight);

        String guide = detection.isPresent()
                ? DEFAULT_GUIDE
                : "AI server returned no detectable food.";

        List<Integer> values = DEFAULT_VALUES;
        Optional<List<Double>> predictedValues = fetchGlucosePrediction(userId, nutrition);
        if (predictedValues.isPresent()) {
            values = mapPredictionValues(predictedValues.get());
        }

        // AI Guide Generation
        String aiGuide = null;
        try {
            // 임시 FoodRecord 생성 (가이드 생성을 위한 데이터 전달용)
            // 주의: 실제 DB에 저장되지 않은 상태이므로 ID는 null입니다.
            FoodRecord tempRecord = new FoodRecord();
            tempRecord.setEatenAt(LocalDateTime.now());
            tempRecord.setMealType(com.djjko.dnc.meal.domain.MealType.LUNCH); // 기본값 설정 (필요시 파라미터로 받아야 함)

            // 영양 성분 문자열 생성
            String nutritionSummary = nutrition != null ? String.format(
                    "- 칼로리: %d kcal\n- 탄수화물: %d g\n- 단백질: %d g\n- 지방: %d g\n- 당류: %d g\n- 나트륨: %d mg",
                    nutrition.calories(), nutrition.carbs(), nutrition.protein(), nutrition.fat(), nutrition.sugar(),
                    nutrition.sodium()) : "영양 성분 정보 없음";

            // 음식 목록 문자열 생성
            String foodListString = foodName
                    + (resolvedWeight != null ? String.format(" (%.0fg)", resolvedWeight) : "");

            com.djjko.dnc.auth.entity.User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                aiGuide = aiFoodGuideService.generateGuide(user, tempRecord, foodListString, nutritionSummary);
            }
        } catch (Exception e) {
            log.warn("AI Guide generation failed: {}", e.getMessage());
            aiGuide = "가이드 생성 실패";
        }

        return buildResponse(DEFAULT_LABELS, values, guide, foodName, detectedBox, imageUrl, nutrition, resolvedWeight,
                aiGuide);
    }

    public void analyzeAndPersist(
            Long userId,
            Long foodId,
            LocalDateTime eatenAt,
            MultipartFile image,
            Double estimatedWeight) {
        if (foodId == null || image == null || image.isEmpty()) {
            return;
        }

        Optional<AiFoodDetectResult> detection = aiServerClient.analyzeFood(image);
        String detectedName = detection.map(AiFoodDetectResult::foodName)
                .filter(name -> name != null && !name.isBlank())
                .orElse(null);
        Optional<FoodMetadata> metadata = resolveMetadata(detectedName);
        String detectedQuantity = detection.map(AiFoodDetectResult::quantity).orElse(null);

        Double resolvedWeight = metadata
                .map(result -> resolveWeight(result.getBaseWeight(), estimatedWeight, detectedQuantity))
                .orElse(estimatedWeight);

        FoodAnalysis analysis = new FoodAnalysis();
        analysis.setFoodId(foodId);
        analysis.setFoodCode(metadata.map(FoodMetadata::getFoodCode).orElse(null));
        analysis.setEstimatedWeight(resolvedWeight);
        analysis.setAiConfidence(detection.map(AiFoodDetectResult::confidence).orElse(null));
        analysis.setAiComment(resolveAiComment(detection));
        analysis.setModelName(FOOD_MODEL_NAME);
        analysis.setModelVersion(FOOD_MODEL_VERSION);
        analysis.setAnalyzedAt(LocalDateTime.now());
        analysis.setRawResultJson(serializeDetection(detection.orElse(null)));
        foodAnalysisRepository.save(analysis);

        AiFoodNutrition nutrition = metadata
                .map(result -> toNutrition(result, estimatedWeight, detectedQuantity))
                .orElse(null);
        Optional<List<Double>> predictionValues = fetchGlucosePrediction(userId, nutrition);
        if (predictionValues.isPresent()) {
            persistPredictions(userId, foodId, eatenAt, predictionValues.get());
        }

        // Persist AI Guide
        try {
            com.djjko.dnc.auth.entity.User user = userRepository.findById(userId).orElse(null);
            FoodRecord record = foodRecordRepository.findById(foodId).orElse(null);

            if (user != null && record != null) {
                String nutritionSummary = nutrition != null ? String.format(
                        "- 칼로리: %d kcal\n- 탄수화물: %d g\n- 단백질: %d g\n- 지방: %d g\n- 당류: %d g\n- 나트륨: %d mg",
                        nutrition.calories(), nutrition.carbs(), nutrition.protein(), nutrition.fat(),
                        nutrition.sugar(), nutrition.sodium()) : "영양 성분 정보 없음";

                String foodName = metadata.map(FoodMetadata::getFoodName).orElse(detectedName);
                String foodListString = (foodName != null ? foodName : "알 수 없는 음식")
                        + (resolvedWeight != null ? String.format(" (%.0fg)", resolvedWeight) : "");

                String aiGuide = aiFoodGuideService.generateGuide(user, record, foodListString, nutritionSummary);
                record.setAiGuide(aiGuide);
                foodRecordRepository.save(record);
            }
        } catch (Exception e) {
            log.warn("Failed to persist AI guide: {}", e.getMessage());
        }
    }

    private Optional<FoodMetadata> resolveMetadata(String detectedName) {
        if (detectedName == null || detectedName.isBlank()) {
            return Optional.empty();
        }
        Optional<FoodMetadata> byName = foodMetadataRepository.findFirstByFoodNameIgnoreCase(detectedName);
        if (byName.isPresent()) {
            return byName;
        }
        if (!detectedName.matches("\\d+")) {
            return Optional.empty();
        }
        try {
            Long code = Long.parseLong(detectedName);
            return foodMetadataRepository.findById(code);
        } catch (NumberFormatException ex) {
            return Optional.empty();
        }
    }

    private AiFoodAnalyzeResponse buildResponse(
            List<String> labels,
            List<Integer> values,
            String guide,
            String foodName,
            com.djjko.dnc.ai.food.dto.AiFoodDetectBox foodBox,
            String imageUrl,
            AiFoodNutrition nutrition,
            Double estimatedWeight,
            String aiGuide) {
        return new AiFoodAnalyzeResponse(
                labels,
                values,
                guide,
                foodName,
                foodBox,
                imageUrl,
                nutrition,
                estimatedWeight,
                aiGuide);
    }

    private Optional<List<Double>> fetchGlucosePrediction(Long userId, AiFoodNutrition nutrition) {
        if (userId == null || nutrition == null) {
            return Optional.empty();
        }
        Optional<AiGlucosePredictionRequest> request = buildPredictionRequest(userId, nutrition);
        if (request.isEmpty()) {
            return Optional.empty();
        }
        return aiServerClient.predictGlucose(request.get());
    }

    private Optional<AiGlucosePredictionRequest> buildPredictionRequest(Long userId, AiFoodNutrition nutrition) {
        Optional<User> user = userRepository.findById(userId);
        if (user.isEmpty()) {
            return Optional.empty();
        }

        double weightKg = user.get().getWeightKg() != null
                ? user.get().getWeightKg().doubleValue()
                : DEFAULT_WEIGHT_KG;
        double heightCm = user.get().getHeightCm() != null
                ? user.get().getHeightCm().doubleValue()
                : DEFAULT_HEIGHT_CM;
        boolean isT2d = user.get().getDiabetesType() == DiabetesType.TYPE2;

        Double latestGlucose = Optional.ofNullable(
                glucoseDataRepository.findTopByUser_UserIdOrderByMeasuredAtDesc(userId))
                .map(data -> data.getValue() == null ? null : data.getValue().doubleValue())
                .orElse(null);
        double sysBg = latestGlucose != null ? latestGlucose : DEFAULT_SYS_BG;

        return Optional.of(new AiGlucosePredictionRequest(
                nutrition.carbs(),
                nutrition.protein(),
                nutrition.fat(),
                DEFAULT_FIBER,
                nutrition.sodium(),
                DEFAULT_MEAL_ORDER,
                DEFAULT_EXERCISE_INTENSITY,
                weightKg,
                heightCm,
                sysBg,
                DEFAULT_SYS_BP,
                DEFAULT_FASTING_HOURS,
                DEFAULT_TREND_SLOPE_UP,
                DEFAULT_TREND_SLOPE_DOWN,
                isT2d));
    }

    private List<Integer> mapPredictionValues(List<Double> values) {
        if (values == null || values.size() < 25) {
            return DEFAULT_VALUES;
        }
        int[] indices = { 0, 6, 12, 18, 24 };
        return List.of(
                roundValue(values.get(indices[0])),
                roundValue(values.get(indices[1])),
                roundValue(values.get(indices[2])),
                roundValue(values.get(indices[3])),
                roundValue(values.get(indices[4])));
    }

    private void persistPredictions(
            Long userId,
            Long foodId,
            LocalDateTime eatenAt,
            List<Double> values) {
        if (userId == null || foodId == null || values == null || values.isEmpty()) {
            return;
        }
        LocalDateTime baseTime = eatenAt != null ? eatenAt : LocalDateTime.now();
        List<Integer> offsets = resolvePredictionOffsets(values.size());
        List<GlucosePrediction> predictions = new ArrayList<>();
        LocalDateTime createdAt = LocalDateTime.now();

        for (int i = 0; i < values.size(); i += 1) {
            Integer minutes = offsets.get(i);
            GlucosePrediction prediction = new GlucosePrediction();
            prediction.setUserId(userId);
            prediction.setFoodId(foodId);
            prediction.setPredictedValue(roundValue(values.get(i)));
            prediction.setTargetTime(baseTime.plusMinutes(minutes));
            prediction.setModelName(PREDICTION_MODEL_NAME);
            prediction.setModelVersion(PREDICTION_MODEL_VERSION);
            prediction.setCreatedAt(createdAt);
            predictions.add(prediction);
        }

        glucosePredictionRepository.saveAll(predictions);
        updatePeakGlucose(foodId, values);
    }

    private void updatePeakGlucose(Long foodId, List<Double> values) {
        Integer peak = null;
        for (Double value : values) {
            if (value == null) {
                continue;
            }
            int rounded = roundValue(value);
            if (peak == null || rounded > peak) {
                peak = rounded;
            }
        }
        if (peak == null) {
            return;
        }
        final int peakValue = peak;
        foodRecordRepository.findById(foodId).ifPresent(record -> {
            record.setPeakGlucose(peakValue);
            record.setUpdatedAt(LocalDateTime.now());
            foodRecordRepository.save(record);
        });
    }

    private List<Integer> resolvePredictionOffsets(int size) {
        if (size == 5) {
            return List.of(0, 30, 60, 90, 120);
        }
        if (size == 25) {
            List<Integer> offsets = new ArrayList<>(size);
            for (int i = 0; i < size; i += 1) {
                offsets.add(i * 5);
            }
            return offsets;
        }
        int step = size > 1 ? Math.round(120f / (size - 1)) : 0;
        List<Integer> offsets = new ArrayList<>(size);
        for (int i = 0; i < size; i += 1) {
            offsets.add(i * step);
        }
        return offsets;
    }

    private String resolveAiComment(Optional<AiFoodDetectResult> detection) {
        if (detection.isPresent()) {
            String quantity = detection.get().quantity();
            if (quantity != null && !quantity.isBlank()) {
                return quantity;
            }
        }
        return detection.isPresent() ? DEFAULT_GUIDE : "AI server returned no detectable food.";
    }

    private String serializeDetection(AiFoodDetectResult detection) {
        if (detection == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(detection);
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize AI detection result: {}", ex.getMessage());
            return null;
        }
    }

    private int roundValue(Double value) {
        if (value == null) {
            return 0;
        }
        return (int) Math.round(value);
    }

    private AiFoodNutrition toNutrition(FoodMetadata metadata, Double estimatedWeight, String quantity) {
        Double baseWeight = metadata.getBaseWeight();
        Double resolvedWeight = resolveWeight(baseWeight, estimatedWeight, quantity);
        double ratio = resolveRatio(baseWeight, resolvedWeight);
        String servingSize = resolvedWeight == null
                ? "1 serving"
                : String.format("%.0fg", resolvedWeight);

        return new AiFoodNutrition(
                scale(metadata.getCaloriesPerBase(), ratio),
                servingSize,
                scale(metadata.getCarbsPerBase(), ratio),
                scale(metadata.getProteinPerBase(), ratio),
                scale(metadata.getFatPerBase(), ratio),
                scale(metadata.getSugarsPerBase(), ratio),
                scale(metadata.getSodiumPerBase(), ratio));
    }

    private Double resolveWeight(Double baseWeight, Double estimatedWeight, String quantity) {
        if (estimatedWeight != null && estimatedWeight > 0) {
            return estimatedWeight;
        }
        // AI Quantity Adjustment Logic
        double multiplier = getQuantityMultiplier(quantity);

        if (baseWeight != null) {
            return baseWeight * multiplier;
        }
        return baseWeight;
    }

    private double getQuantityMultiplier(String quantity) {
        if (quantity == null) {
            return 1.0;
        }
        switch (quantity.toUpperCase()) {
            case "Q1":
                return 0.25; // 25%
            case "Q2":
                return 0.50; // 50%
            case "Q3":
                return 0.75; // 75%
            case "Q4":
                return 1.00; // 100% (Base)
            case "Q5":
                return 1.25; // 125%
            default:
                return 1.0;
        }
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
