package com.djjko.dnc.meal.repository;

import com.djjko.dnc.meal.domain.FoodMetadata;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FoodMetadataRepository extends JpaRepository<FoodMetadata, String> {
    Optional<FoodMetadata> findFirstByFoodNameIgnoreCase(String foodName);
}
