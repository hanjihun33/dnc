package com.djjko.dnc.ai.food.service;

import com.djjko.dnc.ai.food.dto.AiFoodDetectResponse;
import com.djjko.dnc.ai.food.dto.AiFoodDetectResult;
import com.djjko.dnc.ai.food.dto.AiGlucosePredictionRequest;
import com.djjko.dnc.ai.food.dto.AiGlucosePredictionResponse;
import com.djjko.dnc.ai.model.dto.ModelUpdateRequest;
import java.io.IOException;
import java.net.http.HttpClient;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;

@Component
public class AiServerClient {

    private static final Logger log = LoggerFactory.getLogger(AiServerClient.class);

    private final RestClient restClient;

    public AiServerClient(
            RestClient.Builder restClientBuilder,
            @Value("${ai.server.base-url}") String baseUrl) {
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .build();
        this.restClient = restClientBuilder
                .requestFactory(new JdkClientHttpRequestFactory(httpClient))
                .baseUrl(baseUrl)
                .build();
    }

    public Optional<AiFoodDetectResult> analyzeFood(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            return Optional.empty();
        }
        try {
            ByteArrayResource resource = new ByteArrayResource(image.getBytes()) {
                @Override
                public String getFilename() {
                    String name = image.getOriginalFilename();
                    return StringUtils.hasText(name) ? name : "image.jpg";
                }
            };
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", resource);

            AiFoodDetectResponse response = restClient
                    .post()
                    .uri("/api/v1/ai/food/analyze")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(AiFoodDetectResponse.class);

            if (response == null || response.result() == null || response.result().isEmpty()) {
                return Optional.empty();
            }

            return response.result().stream()
                    .max(Comparator.comparing(result -> result.confidence() == null ? 0.0 : result.confidence()));
        } catch (IOException | RestClientException ex) {
            log.warn("AI server analyze request failed: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    public Optional<List<Double>> predictGlucose(AiGlucosePredictionRequest request) {
        try {
            AiGlucosePredictionResponse response = restClient
                    .post()
                    .uri("/api/v1/predictions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(AiGlucosePredictionResponse.class);

            if (response == null || response.forecast() == null || response.forecast().isEmpty()) {
                return Optional.empty();
            }
            return Optional.of(response.forecast());
        } catch (RestClientException ex) {
            log.warn("AI server prediction request failed: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    public void updateModel(ModelUpdateRequest request) {
        try {
            restClient
                    .post()
                    .uri("/api/v1/model/update")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException ex) {
            log.warn("AI server model update request failed: {}", ex.getMessage());
        }
    }
}
