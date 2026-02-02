package com.djjko.dnc.alert.dto;

import lombok.Getter;

@Getter
public class UserAlertSettingUpdateRequest {
    private Integer thresholdValue;
    private Integer intervalMinutes;
    private Boolean enabled;
}
