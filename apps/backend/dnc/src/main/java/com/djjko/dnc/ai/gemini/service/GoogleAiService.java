package com.djjko.dnc.ai.gemini.service;

import com.djjko.dnc.ai.gemini.dto.GeminiRequest;
import com.djjko.dnc.ai.gemini.dto.GeminiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Slf4j
@Service
public class GoogleAiService {

    private final RestTemplate restTemplate;

    @Value("${google.ai.api-key}")
    private String apiKey;

    @Value("${google.ai.model:gemini-2.0-flash}")
    private String modelName;

    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

    public GoogleAiService(RestTemplateBuilder builder) {
        this.restTemplate = builder.build();
    }

    public String generateContent(String prompt) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Google AI API Key가 설정되지 않았습니다.");
            return "AI 분석을 사용할 수 없습니다. (API Key 미설정)";
        }

        try {
            String url = UriComponentsBuilder.fromHttpUrl(BASE_URL)
                    .queryParam("key", apiKey)
                    .buildAndExpand(modelName)
                    .toUriString();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            GeminiRequest requestBody = GeminiRequest.create(prompt);
            HttpEntity<GeminiRequest> entity = new HttpEntity<>(requestBody, headers);

            log.info("Gemini API 호출 중... (Model: {})", modelName);
            GeminiResponse response = restTemplate.postForObject(url, entity, GeminiResponse.class);

            if (response != null) {
                return response.getText();
            }

            return "AI 응답을 받아오지 못했습니다.";

        } catch (Exception e) {
            log.error("Gemini API 호출 실패: {}", e.getMessage());
            return "AI 분석 중 오류가 발생했습니다.";
        }
    }
}
