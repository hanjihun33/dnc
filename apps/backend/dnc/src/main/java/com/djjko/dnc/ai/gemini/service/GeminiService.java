package com.djjko.dnc.ai.gemini.service;

import com.djjko.dnc.ai.gemini.dto.GeminiRequest;
import com.djjko.dnc.ai.gemini.dto.GeminiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Slf4j
@Service
public class GeminiService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${gms.api-key}")
    private String apiKey;

    @Value("${gms.ai.model:gemini-2.5-flash}")
    private String modelName;

    @Value("${gms.ai.base-url:https://generativelanguage.googleapis.com}")
    private String baseUrl;

    public GeminiService(RestTemplateBuilder builder, ObjectMapper objectMapper) {
        this.restTemplate = builder.build();
        this.objectMapper = objectMapper;
    }

    public String generateContent(String prompt) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("GMS API Key가 설정되지 않았습니다.");
            return "AI 서비스를 사용할 수 없습니다. (API Key 미설정)";
        }

        try {
            String url = UriComponentsBuilder.fromUriString(baseUrl)
                .path("/v1beta/models/{model}:generateContent")
                .queryParam("key", apiKey)
                .buildAndExpand(modelName)
                .toUriString();

            String safeUrl = UriComponentsBuilder.fromUriString(baseUrl)
                .path("/v1beta/models/{model}:generateContent")
                .queryParam("key", "****")
                .buildAndExpand(modelName)
                .toUriString();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            GeminiRequest requestBody = GeminiRequest.create(prompt);
            HttpEntity<GeminiRequest> entity = new HttpEntity<>(requestBody, headers);

            log.info("GMS API 호출 중... (Model: {}, URL: {})", modelName, safeUrl);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                log.error("GMS API 오류 응답: {}, body={}", response.getStatusCode(), response.getBody());
                return "AI 응답을 받아오지 못했습니다.";
            }

            String body = response.getBody();
            if (body == null || body.isBlank()) {
                log.error("GMS API 응답 본문이 비어있음");
                return "AI 응답을 받아오지 못했습니다.";
            }

            try {
                GeminiResponse parsed = objectMapper.readValue(body, GeminiResponse.class);
                String text = parsed != null ? parsed.getText() : "";
                if (text != null && !text.isBlank()) {
                    return text;
                }
                log.warn("GMS API 응답 text가 비어있음. body={}", body);
                return "AI 응답을 받아오지 못했습니다.";
            } catch (Exception parseEx) {
                log.error("GMS API 응답 파싱 실패: {}", parseEx.getMessage());
                log.error("GMS API raw response: {}", body);
                return "AI 응답을 받아오지 못했습니다.";
            }
        } catch (Exception e) {
            log.error("GMS API 호출 실패: {}", e.getMessage());
            return "AI 분석 중 오류가 발생했습니다: " + e.getMessage();
        }
    }
}
