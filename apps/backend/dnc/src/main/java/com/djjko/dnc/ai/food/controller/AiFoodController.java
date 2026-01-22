package com.djjko.dnc.ai.food.controller;

import com.djjko.dnc.ai.food.dto.AiFoodAnalyzeResponse;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/ai/food")
public class AiFoodController {

    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AiFoodAnalyzeResponse analyze(@RequestPart("image") MultipartFile image) {
        if (image == null || image.isEmpty()) {
            return new AiFoodAnalyzeResponse(
                List.of("0", "30", "60", "90", "120"),
                List.of(0, 0, 0, 0, 0),
                "No image provided."
            );
        }

        return new AiFoodAnalyzeResponse(
            List.of("0", "30", "60", "90", "120"),
            List.of(98, 120, 142, 130, 118),
            "Estimated glucose response after the meal."
        );
    }
}
