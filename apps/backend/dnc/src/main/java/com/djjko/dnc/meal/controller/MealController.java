package com.djjko.dnc.meal.controller;

import com.djjko.dnc.meal.dto.MealResponse;
import com.djjko.dnc.meal.dto.MealUpdateRequest;
import com.djjko.dnc.meal.service.MealService;
import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import java.util.Optional;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/meals")
public class MealController {

    private final MealService mealService;

    public MealController(MealService mealService) {
        this.mealService = mealService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "식사 기록 생성")
    public MealResponse create(
        @RequestHeader(value = "X-User-Id", defaultValue = "1") Long userId,
        @RequestPart(value = "image", required = false) MultipartFile image,
        @RequestParam(value = "mealType", required = false) String mealType,
        @RequestParam(value = "eatenAt", required = false) String eatenAt,
        @RequestParam(value = "memo", required = false) String memo
    ) {
        return mealService.create(userId, image, mealType, eatenAt, memo);
    }

    @GetMapping
    @Operation(summary = "식사 기록 목록 조회")
    public List<MealResponse> list(
        @RequestHeader(value = "X-User-Id", defaultValue = "1") Long userId
    ) {
        return mealService.findAll(userId);
    }

    @GetMapping("/{mealId}")
    @Operation(summary = "식사 기록 단건 조회")
    public Optional<MealResponse> get(@PathVariable Long mealId) {
        return mealService.findOne(mealId);
    }

    @PatchMapping("/{mealId}")
    @Operation(summary = "식사 기록 수정")
    public Optional<MealResponse> update(
        @PathVariable Long mealId,
        @RequestBody MealUpdateRequest request
    ) {
        return mealService.update(mealId, request);
    }

    @DeleteMapping("/{mealId}")
    @Operation(summary = "식사 기록 삭제")
    public void delete(@PathVariable Long mealId) {
        mealService.delete(mealId);
    }
}
