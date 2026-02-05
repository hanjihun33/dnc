package com.djjko.dnc.report.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class ReportGeminiService {

    @Value("${gms.api-key}")
    private String apiKey;

    @Value("${gms.ai.base-url:https://generativelanguage.googleapis.com}")
    private String baseUrl;

    @Value("${gms.ai.model:gemini-2.5-flash}")
    private String modelName;

    private final RestTemplate restTemplate;

    // Constructor with timeout configuration
    public ReportGeminiService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10000); // 10 seconds
        factory.setReadTimeout(30000); // 30 seconds
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * 리포트 전용 AI 분석 메서드 (GMS 프록시 적용)
     */
    public String generateHealthSummary(String contextData, String persona) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("GMS API Key가 설정되지 않았습니다.");
            return "AI 서비스를 사용할 수 없습니다. (API Key 미설정)";
        }

        try {
            // 프롬프트 구성
            String systemInstruction = "";
            if ("DAILY".equals(persona)) {
                systemInstruction = "너는 다정한 'AI 건강 러닝메이트'야. 사용자의 하루 혈당/식사 데이터를 보고 따뜻하게 격려하거나 조심할 점을 3문장 이내로 요약해줘. 이모지를 적절히 사용해. 수치는 팩트 그대로 인용해.";
            } else if ("SENSOR_FINAL".equals(persona)) {
                systemInstruction = "너는 전문적인 'AI 데이터 분석가'야. 지난 10일간의 데이터를 종합 분석해서 성과 위주로 칭찬하고 개선점을 짚어줘. 어조는 전문적이지만 격려하는 톤으로.";
            }

            String prompt = systemInstruction + "\n\n[데이터]\n" + contextData;

            // GMS URL 구성
            String url = UriComponentsBuilder.fromUriString(baseUrl)
                    .path("/v1beta/models/{model}:generateContent")
                    .queryParam("key", apiKey)
                    .buildAndExpand(modelName)
                    .toUriString();

            // 안전한 URL (API 키 숨김)
            String safeUrl = UriComponentsBuilder.fromUriString(baseUrl)
                    .path("/v1beta/models/{model}:generateContent")
                    .queryParam("key", "****")
                    .buildAndExpand(modelName)
                    .toUriString();

            // Request Body 구성
            Map<String, Object> requestBody = new HashMap<>();
            Map<String, Object> content = new HashMap<>();
            content.put("parts", Collections.singletonList(Map.of("text", prompt)));
            requestBody.put("contents", Collections.singletonList(content));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            log.info("=== GMS API 호출 시작 ===");
            log.info("Base URL: {}", baseUrl);
            log.info("Model: {}", modelName);
            log.info("Full URL: {}", safeUrl);
            log.info("Prompt length: {} chars", prompt.length());

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            log.info("GMS API 응답 성공: Status={}", response.getStatusCode());
            return extractTextFromGeminiResponse(response.getBody());

        } catch (Exception e) {
            log.error("=== GMS API 호출 실패 ===");
            log.error("Error Type: {}", e.getClass().getSimpleName());
            log.error("Error Message: {}", e.getMessage());
            log.error("Base URL: {}", baseUrl);
            log.error("Model: {}", modelName);
            log.error("Full Stack Trace:", e);

            // AI 연결 실패 시 기본 메시지 반환
            return "어제의 건강 데이터를 분석했습니다. 평균 혈당과 식사 기록을 확인하여 꾸준히 관리해보세요! 💪";
        }
    }

    private String extractTextFromGeminiResponse(Map responseBody) {
        try {
            List<Map> candidates = (List<Map>) responseBody.get("candidates");
            if (candidates == null || candidates.isEmpty())
                return "분석 결과를 생성하지 못했습니다.";

            Map content = (Map) candidates.get(0).get("content");
            List<Map> parts = (List<Map>) content.get("parts");
            return (String) parts.get(0).get("text");
        } catch (Exception e) {
            log.error("GMS Response Parsing Error", e);
            return "분석 내용을 처리하는 중 오류가 발생했습니다.";
        }
    }
}
