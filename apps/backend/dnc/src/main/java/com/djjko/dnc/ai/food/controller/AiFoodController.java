package com.djjko.dnc.ai.food.controller;

import com.djjko.dnc.ai.food.dto.AiFoodAnalyzeResponse;
import com.djjko.dnc.ai.food.dto.AiGuideStatusResponse;
import com.djjko.dnc.ai.food.service.AiFoodService;
import com.djjko.dnc.auth.service.CurrentUserService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/ai/food")
public class AiFoodController {

    private final AiFoodService aiFoodService;
    private final CurrentUserService currentUserService;

    public AiFoodController(AiFoodService aiFoodService, CurrentUserService currentUserService) {
        this.aiFoodService = aiFoodService;
        this.currentUserService = currentUserService;
    }

    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Predict food from image")
    public AiFoodAnalyzeResponse analyze(
            @RequestPart("image") MultipartFile image,
            @RequestParam(value = "estimatedWeight", required = false) Double estimatedWeight,
            @RequestParam(value = "aiGuide", required = false, defaultValue = "true") boolean aiGuide) {
        Long userId = currentUserService.getRequiredUserId();
        return aiFoodService.analyze(userId, image, estimatedWeight, aiGuide);
    }

    @GetMapping("/guides/{requestId}")
    @Operation(summary = "Get async AI guide status")
    public ResponseEntity<AiGuideStatusResponse> getGuideStatus(@PathVariable("requestId") String requestId) {
        Long userId = currentUserService.getRequiredUserId();
        return aiFoodService.getGuideStatus(userId, requestId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
