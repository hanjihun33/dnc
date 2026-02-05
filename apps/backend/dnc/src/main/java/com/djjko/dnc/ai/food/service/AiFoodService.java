package com.djjko.dnc.ai.food.service;

import com.djjko.dnc.ai.food.FoodAnalysis;
import com.djjko.dnc.ai.food.FoodAnalysisRepository;
import com.djjko.dnc.ai.food.dto.AiFoodAnalyzeResponse;
import com.djjko.dnc.ai.food.dto.AiFoodDetectResult;
import com.djjko.dnc.ai.food.dto.AiGuideStatusResponse;
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
import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
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
    private static final DateTimeFormatter TIMESTAMP_FORMATTER = DateTimeFormatter.ISO_OFFSET_DATE_TIME;
    private static final Duration GUIDE_JOB_TTL = Duration.ofMinutes(15);
    private static final int GUIDE_EXECUTOR_SIZE = 2;

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
    private final ExecutorService aiGuideExecutor = Executors.newFixedThreadPool(GUIDE_EXECUTOR_SIZE);
    private final ConcurrentMap<String, GuideTaskState> guideTaskStore = new ConcurrentHashMap<>();

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

    private enum GuideTaskStatus {
        PENDING,
        COMPLETED,
        FAILED
    }

    private static final class GuideTaskState {
        private final Long userId;
        private final LocalDateTime createdAt;
        private volatile GuideTaskStatus status;
        private volatile String aiGuide;
        private volatile String message;

        private GuideTaskState(Long userId) {
            this.userId = userId;
            this.createdAt = LocalDateTime.now();
            this.status = GuideTaskStatus.PENDING;
        }
    }

    @PreDestroy
    public void shutdownGuideExecutor() {
        aiGuideExecutor.shutdown();
    }

    public AiFoodAnalyzeResponse analyze(
            Long userId,
            MultipartFile image,
            Double estimatedWeight,
            boolean aiGuideEnabled) {
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
                    null,
                    "DISABLED",
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

        String aiGuide = null;
        String aiGuideStatus = aiGuideEnabled ? GuideTaskStatus.PENDING.name() : "DISABLED";
        String aiGuideRequestId = null;

        if (aiGuideEnabled) {
            aiGuideRequestId = enqueueGuideTask(userId, foodName, resolvedWeight, nutrition);
            if (aiGuideRequestId == null) {
                aiGuideStatus = GuideTaskStatus.FAILED.name();
            }
        }

        return buildResponse(
                DEFAULT_LABELS,
                values,
                guide,
                foodName,
                detectedBox,
                imageUrl,
                nutrition,
                resolvedWeight,
                aiGuide,
                aiGuideStatus,
                aiGuideRequestId);
    }

    public Optional<AiGuideStatusResponse> getGuideStatus(Long userId, String requestId) {
        if (requestId == null || requestId.isBlank()) {
            return Optional.empty();
        }
        cleanupExpiredGuideTasks();
        GuideTaskState state = guideTaskStore.get(requestId);
        if (state == null || !state.userId.equals(userId)) {
            return Optional.empty();
        }
        return Optional.of(new AiGuideStatusResponse(
                requestId,
                state.status.name(),
                state.aiGuide,
                state.message));
    }

    private String enqueueGuideTask(
            Long userId,
            String foodName,
            Double resolvedWeight,
            AiFoodNutrition nutrition) {
        cleanupExpiredGuideTasks();
        if (userId == null) {
            return null;
        }
        if (userRepository.findById(userId).isEmpty()) {
            return null;
        }

        final String requestId = UUID.randomUUID().toString();
        GuideTaskState state = new GuideTaskState(userId);
        guideTaskStore.put(requestId, state);

        aiGuideExecutor.submit(() -> {
            try {
                String aiGuide = generatePreviewGuide(userId, foodName, resolvedWeight, nutrition);
                state.aiGuide = aiGuide;
                state.status = GuideTaskStatus.COMPLETED;
                state.message = null;
            } catch (Exception ex) {
                log.warn("Async AI guide generation failed. requestId={}, message={}", requestId, ex.getMessage());
                state.status = GuideTaskStatus.FAILED;
                state.message = "AI 코칭 생성에 실패했어요.";
            }
        });

        return requestId;
    }

    private String generatePreviewGuide(
            Long userId,
            String foodName,
            Double resolvedWeight,
            AiFoodNutrition nutrition) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("User not found"));

        FoodRecord tempRecord = new FoodRecord();
        tempRecord.setEatenAt(LocalDateTime.now());
        tempRecord.setMealType(com.djjko.dnc.meal.domain.MealType.LUNCH);

        String nutritionSummary = buildNutritionSummary(nutrition);
        String normalizedFoodName =
                (foodName != null && !foodName.isBlank()) ? foodName : FALLBACK_FOOD_NAME;
        String foodListString = normalizedFoodName
                + (resolvedWeight != null ? String.format(" (%.0fg)", resolvedWeight) : "");

        return aiFoodGuideService.generateGuide(user, tempRecord, foodListString, nutritionSummary);
    }

    private String buildNutritionSummary(AiFoodNutrition nutrition) {
        if (nutrition == null) {
            return "영양 성분 정보 없음";
        }
        return String.format(
                "- 칼로리: %d kcal%n- 탄수화물: %d g%n- 단백질: %d g%n- 지방: %d g%n- 당류: %d g%n- 나트륨: %d mg",
                nutrition.calories(),
                nutrition.carbs(),
                nutrition.protein(),
                nutrition.fat(),
                nutrition.sugar(),
                nutrition.sodium());
    }

    private void cleanupExpiredGuideTasks() {
        LocalDateTime threshold = LocalDateTime.now().minus(GUIDE_JOB_TTL);
        guideTaskStore.entrySet().removeIf(entry -> entry.getValue().createdAt.isBefore(threshold));
    }

    public void analyzeAndPersist(
            Long userId,
            Long foodId,
            LocalDateTime eatenAt,
            MultipartFile image,
            Double estimatedWeight) {
        if (foodId == null) {
            return;
        }

        FoodRecord record = foodRecordRepository.findById(foodId).orElse(null);
        if (record == null) {
            return;
        }

        String detectedName = null;
        String detectedQuantity = null;
        Optional<AiFoodDetectResult> detection = Optional.empty();

        // If foodName is already provided (by user or client), skip duplicate AI
        // detection
        if (record.getFoodName() != null && !record.getFoodName().isBlank()) {
            detectedName = record.getFoodName();
            log.info("Skipping AI detection for foodId: {} as name '{}' is provided.", foodId, detectedName);
        } else if (image != null && !image.isEmpty()) {
            // Only run AI if image exists and no name provided
            detection = aiServerClient.analyzeFood(image);
            detectedName = detection.map(AiFoodDetectResult::foodName)
                    .filter(name -> name != null && !name.isBlank())
                    .orElse(null);
            detectedQuantity = detection.map(AiFoodDetectResult::quantity).orElse(null);
        }

        final String finalDetectedQuantity = detectedQuantity;
        Optional<FoodMetadata> metadata = resolveMetadata(detectedName);

        Double resolvedWeight = metadata
                .map(result -> resolveWeight(result.getBaseWeight(), estimatedWeight, finalDetectedQuantity))
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
                .map(result -> toNutrition(result, estimatedWeight, finalDetectedQuantity))
                .orElse(null);

        // If user provided specific carbs, use it for prediction (optional enhancement)
        // For now, we rely on resolved nutrition from metadata to generate consistency
        // in guide/prediction.

        Optional<List<Double>> predictionValues = fetchGlucosePrediction(userId, nutrition);
        if (predictionValues.isPresent()) {
            persistPredictions(userId, foodId, eatenAt, predictionValues.get());
        }

        // Persist AI Guide
        try {
            com.djjko.dnc.auth.entity.User user = userRepository.findById(userId).orElse(null);
            // FoodRecord record = foodRecordRepository.findById(foodId).orElse(null); //
            // Already fetched above

            if (user != null && record != null) {
                // If AI Guide was provided by client, skip generation
                if (record.getAiGuide() != null && !record.getAiGuide().isBlank()) {
                    log.info("Skipping AI guide generation for foodId: {} as it is already provided.", foodId);
                } else {
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
            }
        } catch (Exception e) {
            log.warn("Failed to persist AI guide: {}", e.getMessage());
        }
    }

    private Optional<FoodMetadata> resolveMetadata(String detectedName) {
        if (detectedName == null) {
            return Optional.empty();
        }
        String normalized = detectedName.trim();
        if (normalized.isBlank()) {
            return Optional.empty();
        }
        Optional<FoodMetadata> byName = foodMetadataRepository.findFirstByFoodNameIgnoreCase(normalized);
        if (byName.isPresent()) {
            return byName;
        }
        if (!normalized.matches("\\d+")) {
            return Optional.empty();
        }
        try {
            Long code = Long.parseLong(normalized);
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
            String aiGuide,
            String aiGuideStatus,
            String aiGuideRequestId) {
        return new AiFoodAnalyzeResponse(
                labels,
                values,
                guide,
                foodName,
                foodBox,
                imageUrl,
                nutrition,
                estimatedWeight,
                aiGuide,
                aiGuideStatus,
                aiGuideRequestId);
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

        long glucoseCount = glucoseDataRepository.countByUser_UserId(userId);
        boolean hasEnoughData = glucoseCount > 0;
        String timeStamp = OffsetDateTime.now(ZoneOffset.UTC).format(TIMESTAMP_FORMATTER);

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
                isT2d,
                userId,
                timeStamp,
                hasEnoughData));
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
