package com.djjko.dnc.alert.service;

import com.djjko.dnc.alert.dto.UserAlertSettingResponse;
import com.djjko.dnc.alert.dto.UserAlertSettingUpdateRequest;
import com.djjko.dnc.alert.entity.UserAlertSetting;
import com.djjko.dnc.alert.model.AlertType;
import com.djjko.dnc.alert.repository.UserAlertSettingRepository;
import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.auth.repository.UserRepository;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UserAlertSettingService {

    private static final int DEFAULT_INTERVAL_MINUTES = 15;
    private static final double DEFAULT_RAPID_RISE_RATE = 3.0;
    private static final double DEFAULT_URGENT_LOW_RATE = -3.0;
    private static final Set<Integer> ALLOWED_INTERVALS = Set.of(5, 10, 15, 20, 30, 60);

    private final UserAlertSettingRepository userAlertSettingRepository;
    private final UserRepository userRepository;

    @Transactional
    public List<UserAlertSettingResponse> getSettings(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        List<UserAlertSetting> settings = getOrCreateSettings(user);
        return settings.stream().map(this::toResponse).toList();
    }

    @Transactional
    public UserAlertSettingResponse updateSetting(Long userId, AlertType type, UserAlertSettingUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        UserAlertSetting setting = getOrCreateSetting(user, type);

        if (request.getIntervalMinutes() != null && !ALLOWED_INTERVALS.contains(request.getIntervalMinutes())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid intervalMinutes");
        }

        if (type == AlertType.RAPID_RISE) {
            setting.applyUpdate(null, request.getIntervalMinutes(), request.getEnabled());
        } else {
            setting.applyUpdate(request.getThresholdValue(), request.getIntervalMinutes(), request.getEnabled());
        }

        UserAlertSetting saved = userAlertSettingRepository.save(setting);
        return toResponse(saved);
    }

    @Transactional
    public List<UserAlertSetting> getOrCreateSettings(User user) {
        Map<AlertType, UserAlertSetting> existing = new EnumMap<>(AlertType.class);
        for (UserAlertSetting setting : userAlertSettingRepository.findByUser_UserId(user.getUserId())) {
            existing.put(setting.getAlertType(), setting);
        }

        List<UserAlertSetting> created = new ArrayList<>();
        for (AlertType type : AlertType.values()) {
            if (!existing.containsKey(type)) {
                UserAlertSetting setting = buildDefaultSetting(user, type);
                created.add(setting);
                existing.put(type, setting);
            }
        }

        if (!created.isEmpty()) {
            userAlertSettingRepository.saveAll(created);
        }

        return new ArrayList<>(existing.values());
    }

    @Transactional
    public UserAlertSetting getOrCreateSetting(User user, AlertType type) {
        return userAlertSettingRepository.findByUser_UserIdAndAlertType(user.getUserId(), type)
                .orElseGet(() -> userAlertSettingRepository.save(buildDefaultSetting(user, type)));
    }

    private UserAlertSettingResponse toResponse(UserAlertSetting setting) {
        return new UserAlertSettingResponse(
                setting.getAlertType(),
                setting.getThresholdValue(),
                setting.getRateThreshold(),
                setting.getIntervalMinutes(),
                setting.getEnabled()
        );
    }

    private UserAlertSetting buildDefaultSetting(User user, AlertType type) {
        return switch (type) {
            case HIGH -> baseSetting(user, type, 140, null);
            case LOW -> baseSetting(user, type, 70, null);
            case VERY_LOW -> baseSetting(user, type, 54, null);
            case URGENT_LOW -> baseSetting(user, type, 90, DEFAULT_URGENT_LOW_RATE);
            case RAPID_RISE -> baseSetting(user, type, null, DEFAULT_RAPID_RISE_RATE);
        };
    }

    private UserAlertSetting baseSetting(User user, AlertType type, Integer threshold, Double rateThreshold) {
        return UserAlertSetting.builder()
                .user(user)
                .alertType(type)
                .thresholdValue(threshold)
                .rateThreshold(rateThreshold)
                .intervalMinutes(DEFAULT_INTERVAL_MINUTES)
                .enabled(true)
                .build();
    }
}
