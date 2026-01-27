package com.djjko.dnc.glucose.client;

import com.djjko.dnc.glucose.dto.DexcomResponse;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Component
@RequiredArgsConstructor
public class DexcomApiClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    // 설정 파일(application.yml)에 URL이 없으면 샌드박스 주소 기본 사용
    @Value("${oauth.providers.dexcom.api-base:https://sandbox-api.dexcom.com/v3}")
    private String baseUrl;

    @Value("${oauth.providers.dexcom.client-id}")
    private String clientId;

    @Value("${oauth.providers.dexcom.client-secret}")
    private String clientSecret;

    @Value("${oauth.providers.dexcom.redirect-uri}")
    private String redirectUri;


    /**
     * 혈당 데이터(EGV) 가져오기
     * @param token : Bearer 토큰 (액세스 토큰)
     * @param startDate : 조회 시작 시간
     * @param endDate : 조회 종료 시간
     */
    public DexcomResponse getEgvs(String token, LocalDateTime startDate, LocalDateTime endDate) {
        String formattedStartDate = startDate.minusHours(9).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        String formattedEndDate = endDate.minusHours(9).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        // 1. URL 생성 (쿼리 파라미터로 시간 범위 설정)
        String url = UriComponentsBuilder.fromUriString(baseUrl + "/users/self/egvs")
                .queryParam("startDate", formattedStartDate)
                .queryParam("endDate", formattedEndDate)
                .toUriString();

        // 2. 헤더 설정 (인증 토큰 추가)
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + token);

        // 3. 요청 전송
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            log.info("Dexcom API 호출 중... URL: {}", url);
            ResponseEntity<DexcomResponse> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    DexcomResponse.class
            );
            return response.getBody();

        } catch (HttpClientErrorException e) {
            // 4xx/5xx 에러는 그대로 다시 던져서 서비스 레이어에서 처리하도록 함
            log.error("Dexcom API 호출 실패 (HTTP Status {}): {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw e;
        } catch (Exception e) {
            // 그 외 네트워크 오류 등 (예: 연결 끊김 등)
            log.error("Dexcom API 호출 실패: {}", e.getMessage());
            throw new RuntimeException("덱스콤 연동 중 알 수 없는 오류", e);
        }
    }

    /**
     * 리프레시 토큰으로 새 액세스 토큰 발급받기
     */
    public DexcomTokenResponse refreshAccessToken(String refreshToken) {
        String url = baseUrl + "/oauth2/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
        map.add("client_id", clientId);
        map.add("client_secret", clientSecret);
        map.add("refresh_token", refreshToken);
        map.add("grant_type", "refresh_token");
        map.add("redirect_uri", redirectUri);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(map, headers);

        try {
            log.info("🔄 토큰 갱신 시도 중... URL: {}", url);
            // exchange를 사용하여 예외 발생 없이 응답을 직접 처리
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    String.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                // 성공 시에만 JSON 파싱
                return objectMapper.readValue(response.getBody(), DexcomTokenResponse.class);
            } else {
                // 실패 시, 응답 본문을 그대로 로그에 남기고 예외 발생
                log.error("토큰 갱신 실패 (HTTP Status {}): 응답 본문 -> {}", response.getStatusCode(), response.getBody());
                throw new RuntimeException("덱스콤 토큰 갱신 실패: " + response.getBody());
            }
        } catch (Exception e) {
            // JSON 파싱 실패 등 예상치 못한 오류
            log.error("토큰 갱신 처리 중 심각한 오류 발생: {}", e.getMessage());
            throw new RuntimeException("덱스콤 토큰 갱신 실패", e);
        }
    }

    // [참고] 토큰 응답을 받기 위한 DTO 내부 클래스 (파일 아래에 추가)
    @Getter
    @Setter
    @JsonIgnoreProperties(ignoreUnknown = true) // 이 클래스에 정의되지 않은 필드는 무시
    public static class DexcomTokenResponse {
        @JsonProperty("access_token")
        private String accessToken;
        @JsonProperty("refresh_token")
        private String refreshToken;
        @JsonProperty("expires_in")
        private int expiresIn;
    }
}
