package com.djjko.dnc.prediction.repository;

import com.djjko.dnc.prediction.entity.GlucosePrediction;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GlucosePredictionRepository extends JpaRepository<GlucosePrediction, Long> {
}
