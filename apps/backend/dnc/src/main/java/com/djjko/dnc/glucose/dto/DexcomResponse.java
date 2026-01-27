package com.djjko.dnc.glucose.dto;

import com.djjko.dnc.glucose.entity.GlucoseData;
import com.djjko.dnc.glucose.entity.Sensor;
import com.djjko.dnc.auth.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

@Getter
@NoArgsConstructor
@ToString
@JsonIgnoreProperties(ignoreUnknown = true)
public class DexcomResponse {

    private String recordType;
    private String recordVersion;
    private String userId;
    private List<Record> records;

    @Getter
    @NoArgsConstructor
    @ToString
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Record {
        private String recordId;
        private ZonedDateTime systemTime;
        private int value;
        private String trend;
        private Double trendRate;
        private String transmitterId;

        // DTO -> 엔티티 변환 편의 메서드
        public GlucoseData toEntity(User user, Sensor sensor) {
            return GlucoseData.builder()
                    .user(user)
                    .sensor(sensor)
                    .value(this.value)
                    .trend(this.trend)
                    .trendRate(this.trendRate)
                    .dexcomRecordId(this.recordId)
                    // 한국 시간으로 변환해서 저장
                    .measuredAt(this.systemTime.withZoneSameInstant(ZoneId.of("Asia/Seoul")).toLocalDateTime())
                    .source(GlucoseData.Source.AUTO)
                    .build();
        }
    }
}
