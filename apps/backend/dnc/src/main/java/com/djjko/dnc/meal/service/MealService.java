package com.djjko.dnc.meal.service;

import com.djjko.dnc.meal.domain.FoodRecord;
import com.djjko.dnc.meal.domain.MealType;
import com.djjko.dnc.meal.dto.MealResponse;
import com.djjko.dnc.meal.dto.MealUpdateRequest;
import com.djjko.dnc.meal.repository.FoodRecordRepository;
import com.djjko.dnc.storage.FileStorageService;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class MealService {

    private final FoodRecordRepository repository;
    private final FileStorageService fileStorageService;

    public MealService(
        FoodRecordRepository repository,
        FileStorageService fileStorageService
    ) {
        this.repository = repository;
        this.fileStorageService = fileStorageService;
    }

    public MealResponse create(
        Long userId,
        MultipartFile image,
        String mealType,
        String eatenAt,
        String memo
    ) {
        FoodRecord record = new FoodRecord();
        record.setUserId(userId);
        record.setMealType(MealType.from(mealType));
        record.setEatenAt(parseDateTime(eatenAt));
        record.setMemo(memo);

        if (image != null && !image.isEmpty()) {
            record.setImageUrl(fileStorageService.save(image));
        }

        LocalDateTime now = LocalDateTime.now();
        record.setRecordedAt(now);
        record.setUpdatedAt(now);

        return MealResponse.from(repository.save(record));
    }

    @Transactional(readOnly = true)
    public List<MealResponse> findAll(Long userId) {
        return repository.findByUserIdOrderByRecordedAtDesc(userId).stream()
            .map(MealResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public Optional<MealResponse> findOne(Long mealId) {
        return repository.findById(mealId).map(MealResponse::from);
    }

    public Optional<MealResponse> update(Long mealId, MealUpdateRequest request) {
        return repository.findById(mealId).map(record -> {
            MealType newType = MealType.from(request.mealType());
            if (newType != null) {
                record.setMealType(newType);
            }
            if (request.eatenAt() != null && !request.eatenAt().isBlank()) {
                record.setEatenAt(parseDateTime(request.eatenAt()));
            }
            if (request.memo() != null) {
                record.setMemo(request.memo());
            }
            record.setUpdatedAt(LocalDateTime.now());
            return MealResponse.from(record);
        });
    }

    public void delete(Long mealId) {
        repository.deleteById(mealId);
    }

    private LocalDateTime parseDateTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException ex) {
            try {
                return OffsetDateTime.parse(value).toLocalDateTime();
            } catch (DateTimeParseException ignored) {
                return null;
            }
        }
    }
}
