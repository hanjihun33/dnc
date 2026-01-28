package com.djjko.dnc.alert.dto;

import com.djjko.dnc.alert.model.AlertType;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserAlertSettingResponse {
    private AlertType type;
    private Integer thresholdValue;
    private Double rateThreshold;
    private Integer intervalMinutes;
    private Boolean enabled;
}
