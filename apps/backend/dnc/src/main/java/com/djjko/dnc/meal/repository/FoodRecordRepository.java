package com.djjko.dnc.meal.repository;

import com.djjko.dnc.meal.domain.FoodRecord;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FoodRecordRepository extends JpaRepository<FoodRecord, Long> {
    List<FoodRecord> findByUserIdOrderByRecordedAtDesc(Long userId);

    List<FoodRecord> findAllByUserIdAndEatenAtBetween(
            Long userId,
            LocalDateTime start,
            LocalDateTime end);
}
