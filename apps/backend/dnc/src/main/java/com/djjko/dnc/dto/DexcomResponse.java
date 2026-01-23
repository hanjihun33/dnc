package com.djjko.dnc.dto;

import com.djjko.dnc.entity.GlucoseData;
import com.djjko.dnc.entity.Sensor;
import com.djjko.dnc.entity.User;
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

        // DTO -> Entity 변환 편의 메서드
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