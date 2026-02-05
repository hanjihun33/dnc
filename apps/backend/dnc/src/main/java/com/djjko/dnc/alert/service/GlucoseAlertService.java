package com.djjko.dnc.alert.service;

import com.djjko.dnc.alert.entity.UserAlertSetting;
import com.djjko.dnc.alert.model.AlertType;
import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.glucose.entity.GlucoseData;
import com.djjko.dnc.notification.service.UserNotificationService;
import com.djjko.dnc.push.entity.UserPushToken;
import com.djjko.dnc.push.service.FcmService;
import com.djjko.dnc.push.service.PushTokenService;
import com.google.firebase.messaging.MessagingErrorCode;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class GlucoseAlertService {

    private static final String LAST_ALERT_KEY_PREFIX = "alert:last:";

    private final RedisTemplate<String, Object> redisTemplate;
    private final UserAlertSettingService userAlertSettingService;
    private final PushTokenService pushTokenService;
    private final FcmService fcmService;
    private final UserNotificationService userNotificationService;

    public void evaluate(User user, GlucoseData data) {
        List<UserAlertSetting> settings = userAlertSettingService.getOrCreateSettings(user);
        Map<AlertType, UserAlertSetting> settingMap = new EnumMap<>(AlertType.class);
        for (UserAlertSetting setting : settings) {
            settingMap.put(setting.getAlertType(), setting);
        }

        boolean rapidRiseActive = isRapidRise(settingMap.get(AlertType.RAPID_RISE), data.getTrendRate());
        AlertType triggered = selectAlertType(settingMap, data);
        if (triggered == null) {
            return;
        }

        UserAlertSetting setting = settingMap.get(triggered);
        if (setting == null || !Boolean.TRUE.equals(setting.getEnabled())) {
            return;
        }

        if (!shouldNotify(user.getUserId(), setting)) {
            return;
        }

        markNotified(user.getUserId(), setting.getAlertType());
        boolean attachRapidRise = triggered == AlertType.HIGH && rapidRiseActive;
        String title = "혈당 알림";
        String body = buildBody(setting.getAlertType(), data.getValue(), attachRapidRise);
        userNotificationService.create(user, setting.getAlertType().getCode(), title, body);
        sendPush(user, setting.getAlertType(), data.getValue(), title, body);
    }

    private AlertType selectAlertType(Map<AlertType, UserAlertSetting> settings, GlucoseData data) {
        Integer value = data.getValue();
        Double trendRate = data.getTrendRate();

        if (value == null) {
            return null;
        }

        if (isVeryLow(settings.get(AlertType.VERY_LOW), value)) {
            return AlertType.VERY_LOW;
        }
        if (isLow(settings.get(AlertType.LOW), value)) {
            return AlertType.LOW;
        }
        if (isUrgentLow(settings.get(AlertType.URGENT_LOW), value, trendRate)) {
            return AlertType.URGENT_LOW;
        }
        if (isHigh(settings.get(AlertType.HIGH), value)) {
            return AlertType.HIGH;
        }
        if (isRapidRise(settings.get(AlertType.RAPID_RISE), trendRate)) {
            return AlertType.RAPID_RISE;
        }
        return null;
    }

    private boolean isVeryLow(UserAlertSetting setting, int value) {
        return isEnabled(setting) && setting.getThresholdValue() != null && value < setting.getThresholdValue();
    }

    private boolean isLow(UserAlertSetting setting, int value) {
        return isEnabled(setting) && setting.getThresholdValue() != null && value < setting.getThresholdValue();
    }

    private boolean isUrgentLow(UserAlertSetting setting, int value, Double trendRate) {
        if (!isEnabled(setting) || setting.getThresholdValue() == null || setting.getRateThreshold() == null) {
            return false;
        }
        if (trendRate == null) {
            return false;
        }
        return value < setting.getThresholdValue() && trendRate <= setting.getRateThreshold();
    }

    private boolean isHigh(UserAlertSetting setting, int value) {
        return isEnabled(setting) && setting.getThresholdValue() != null && value >= setting.getThresholdValue();
    }

    private boolean isRapidRise(UserAlertSetting setting, Double trendRate) {
        if (!isEnabled(setting) || setting.getRateThreshold() == null) {
            return false;
        }
        if (trendRate == null) {
            return false;
        }
        return trendRate >= setting.getRateThreshold();
    }

    private boolean isEnabled(UserAlertSetting setting) {
        return setting != null && Boolean.TRUE.equals(setting.getEnabled());
    }

    private boolean shouldNotify(Long userId, UserAlertSetting setting) {
        Integer intervalMinutes = setting.getIntervalMinutes();
        if (intervalMinutes == null || intervalMinutes <= 0) {
            intervalMinutes = 15;
        }
        String key = lastAlertKey(userId, setting.getAlertType());
        Object stored = redisTemplate.opsForValue().get(key);
        if (stored instanceof LocalDateTime last) {
            long minutes = ChronoUnit.MINUTES.between(last, LocalDateTime.now());
            return minutes >= intervalMinutes;
        }
        return true;
    }

    private void markNotified(Long userId, AlertType type) {
        String key = lastAlertKey(userId, type);
        redisTemplate.opsForValue().set(key, LocalDateTime.now());
    }

    private String lastAlertKey(Long userId, AlertType type) {
        return LAST_ALERT_KEY_PREFIX + userId + ":" + type.name();
    }

    private void sendPush(User user, AlertType type, Integer value, String title, String body) {
        List<UserPushToken> tokens = pushTokenService.getEnabledTokens(user.getUserId());
        if (tokens.isEmpty()) {
            return;
        }
        Map<String, String> payload = Map.of(
                "type", type.getCode(),
                "value", String.valueOf(value == null ? 0 : value)
        );

        List<String> tokenValues = tokens.stream().map(UserPushToken::getToken).toList();
        fcmService.sendToTokens(tokenValues, title, body, payload, (token, exception) -> {
            MessagingErrorCode code = exception.getMessagingErrorCode();
            if (code == MessagingErrorCode.UNREGISTERED || code == MessagingErrorCode.INVALID_ARGUMENT) {
                pushTokenService.disableToken(token);
            }
        });

        log.info("FCM sent (userId={}, type={}, tokens={})", user.getUserId(), type, tokenValues.size());
    }

    private String buildBody(AlertType type, Integer value, boolean attachRapidRise) {
        String displayValue = value == null ? "-" : value + "mg/dL";
        String base = switch (type) {
            case VERY_LOW -> "혈당이 매우 낮습니다. (" + displayValue + ")";
            case LOW -> "혈당이 낮습니다. (" + displayValue + ")";
            case URGENT_LOW -> "곧 저혈당 위험입니다. (" + displayValue + ")";
            case HIGH -> "혈당이 높습니다. (" + displayValue + ")";
            case RAPID_RISE -> "혈당이 급상승 중입니다. (" + displayValue + ")";
        };
        if (type == AlertType.HIGH && attachRapidRise) {
            return base + " 급상승 중입니다.";
        }
        return base;
    }
}
