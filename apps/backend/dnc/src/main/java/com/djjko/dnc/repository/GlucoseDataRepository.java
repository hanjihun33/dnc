package com.djjko.dnc.repository;

import com.djjko.dnc.entity.GlucoseData;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GlucoseDataRepository extends JpaRepository<GlucoseData, Long> {
    // 이미 저장된 데이터인지 확인 (중복 방지)
    boolean existsByDexcomRecordId(String dexcomRecordId);
}