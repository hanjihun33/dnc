package com.djjko.dnc.ai.food;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FoodAnalysisRepository extends JpaRepository<FoodAnalysis, Long> {
    Optional<FoodAnalysis> findTopByFoodIdOrderByAnalyzedAtDesc(Long foodId);
}
