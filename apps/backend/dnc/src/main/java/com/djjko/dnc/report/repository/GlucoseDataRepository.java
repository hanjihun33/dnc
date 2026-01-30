package com.djjko.dnc.report.repository;

import com.djjko.dnc.glucose.entity.GlucoseData;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GlucoseDataRepository extends JpaRepository<GlucoseData, Long> {
    boolean existsByDexcomRecordId(String dexcomRecordId);

    List<GlucoseData> findAllByUser_UserIdAndMeasuredAtBetween(
        Long userId,
        LocalDateTime start,
        LocalDateTime end
    );

    List<GlucoseData> findAllByUser_UserIdAndMeasuredAtBetweenOrderByMeasuredAtAsc(
        Long userId,
        LocalDateTime start,
        LocalDateTime end
    );

    GlucoseData findTopByUser_UserIdOrderByMeasuredAtDesc(Long userId);

    boolean existsByUser_UserIdAndMeasuredAtBefore(Long userId, LocalDateTime measuredAt);

    void deleteAllByUser_UserId(Long userId);
}
