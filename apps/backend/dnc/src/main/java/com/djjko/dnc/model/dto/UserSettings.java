package com.djjko.dnc.model.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSettings {

    private Long userId;
    private Integer targetMinGlucose;
    private Integer targetMaxGlucose;
    private Boolean isAlarmOn;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
