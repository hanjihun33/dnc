package com.djjko.dnc.repository;

import com.djjko.dnc.entity.GlucoseData;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface GlucoseDataRepository extends JpaRepository<GlucoseData, Long> {
    // 이미 저장된 데이터인지 확인 (중복 방지)
    boolean existsByDexcomRecordId(String dexcomRecordId);

    // [추가] 특정 유저의 특정 기간 혈당 데이터 조회
    List<GlucoseData> findAllByUser_UserIdAndMeasuredAtBetween(Long userId, LocalDateTime start, LocalDateTime end);
}