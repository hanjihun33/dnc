package com.djjko.dnc.ai.model.service;

import com.djjko.dnc.ai.food.service.AiServerClient;
import com.djjko.dnc.ai.model.dto.ModelUpdateEvent;
import com.djjko.dnc.ai.model.dto.ModelUpdateGlucose;
import com.djjko.dnc.ai.model.dto.ModelUpdateRequest;
import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.auth.repository.UserRepository;
import com.djjko.dnc.glucose.entity.GlucoseData;
import com.djjko.dnc.meal.domain.FoodRecord;
import com.djjko.dnc.meal.repository.FoodRecordRepository;
import com.djjko.dnc.report.repository.GlucoseDataRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ModelUpdateService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AiServerClient aiServerClient;
    private final UserRepository userRepository;
    private final GlucoseDataRepository glucoseDataRepository;
    private final FoodRecordRepository foodRecordRepository;

    public ModelUpdateService(
        AiServerClient aiServerClient,
        UserRepository userRepository,
        GlucoseDataRepository glucoseDataRepository,
        FoodRecordRepository foodRecordRepository
    ) {
        this.aiServerClient = aiServerClient;
        this.userRepository = userRepository;
        this.glucoseDataRepository = glucoseDataRepository;
        this.foodRecordRepository = foodRecordRepository;
    }

    public void updateAllUsersLastThreeMonths(LocalDate today) {
        LocalDate endDate = today;
        LocalDate startDate = endDate.minusMonths(3);
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.plusDays(1).atStartOfDay().minusSeconds(1);

        List<User> users = userRepository.findAll();
        for (User user : users) {
            List<GlucoseData> glucoseData = glucoseDataRepository
                .findAllByUser_UserIdAndMeasuredAtBetween(user.getUserId(), start, end);
            List<ModelUpdateGlucose> glucosePayload = glucoseData.stream()
                .map(this::toGlucosePayload)
                .toList();

            List<FoodRecord> foodRecords = foodRecordRepository
                .findAllByUserIdAndEatenAtBetween(user.getUserId(), start, end);
            List<ModelUpdateEvent> eventPayload = foodRecords.stream()
                .filter(record -> record.getCarbsGrams() != null)
                .map(this::toEventPayload)
                .toList();

            if (glucosePayload.isEmpty() && eventPayload.isEmpty()) {
                continue;
            }
            aiServerClient.updateModel(new ModelUpdateRequest(glucosePayload, eventPayload));
        }
    }

    private ModelUpdateGlucose toGlucosePayload(GlucoseData data) {
        return new ModelUpdateGlucose(
            data.getGlucoseId(),
            data.getUser().getUserId(),
            data.getSensor() == null ? null : data.getSensor().getSensorId(),
            data.getValue(),
            data.getTrend(),
            data.getTrendRate(),
            data.getDexcomRecordId(),
            data.getSource() == null ? null : data.getSource().name(),
            formatDateTime(data.getMeasuredAt()),
            formatDateTime(data.getCreatedAt())
        );
    }

    private ModelUpdateEvent toEventPayload(FoodRecord record) {
        return new ModelUpdateEvent(
            record.getCarbsGrams(),
            formatDateTime(record.getEatenAt())
        );
    }

    private String formatDateTime(LocalDateTime value) {
        if (value == null) {
            return null;
        }
        return value.atZone(KST).format(FORMATTER);
    }
}
