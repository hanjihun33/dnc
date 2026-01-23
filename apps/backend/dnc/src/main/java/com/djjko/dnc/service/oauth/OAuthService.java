package com.djjko.dnc.service.oauth;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import com.djjko.dnc.config.oauth.OAuthProviderProperties;
import com.djjko.dnc.config.oauth.OAuthProvidersProperties;
import com.djjko.dnc.model.dto.response.OAuthTokenResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

@Service
public class OAuthService {

    private static final Logger log = LoggerFactory.getLogger(OAuthService.class);
    private final OAuthProvidersProperties providersProperties;
    private final RestTemplate restTemplate;

    public OAuthService(OAuthProvidersProperties providersProperties, RestTemplateBuilder restTemplateBuilder) {
        this.providersProperties = providersProperties;
        this.restTemplate = restTemplateBuilder.build();
    }

    public String buildAuthorizeUrl(String providerName, String state) {
        OAuthProviderProperties provider = providersProperties.getProvider(providerName);
        log.info("OAuth authorize redirect_uri for {}: {}", providerName, provider.getRedirectUri());
        String scope = String.join(" ", provider.getScopes());

        StringBuilder url = new StringBuilder(provider.getAuthUri());
        if (!provider.getAuthUri().contains("?")) {
            url.append("?");
        } else if (!provider.getAuthUri().endsWith("&") && !provider.getAuthUri().endsWith("?")) {
            url.append("&");
        }

        url.append("response_type=code");
        url.append("&client_id=").append(encode(provider.getClientId()));
        url.append("&redirect_uri=").append(encode(provider.getRedirectUri()));
        if (!scope.isBlank()) {
            url.append("&scope=").append(encode(scope));
        }
        if (state != null && !state.isBlank()) {
            url.append("&state=").append(encode(state));
        }
        return url.toString();
    }

    public OAuthTokenResponse exchangeCodeForToken(String providerName, String code) {
        OAuthProviderProperties provider = providersProperties.getProvider(providerName);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "authorization_code");
        body.add("code", code);
        body.add("redirect_uri", provider.getRedirectUri());
        body.add("client_id", provider.getClientId());
        body.add("client_secret", provider.getClientSecret());

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        return restTemplate.postForObject(URI.create(provider.getTokenUri()), request, OAuthTokenResponse.class);
    }

    public OAuthTokenResponse refreshToken(String providerName, String refreshToken) {
        OAuthProviderProperties provider = providersProperties.getProvider(providerName);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "refresh_token");
        body.add("refresh_token", refreshToken);
        body.add("client_id", provider.getClientId());
        body.add("client_secret", provider.getClientSecret());

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        return restTemplate.postForObject(URI.create(provider.getTokenUri()), request, OAuthTokenResponse.class);
    }

    public String fetchEgvData(String providerName, String accessToken, String startDate, String endDate) {
        OAuthProviderProperties provider = providersProperties.getProvider(providerName);
        String base = provider.getApiBase();
        if (base == null || base.isBlank()) {
            throw new IllegalStateException("API base URL is not configured for " + providerName);
        }

        String url = String.format(
            "%s/users/self/egvs?startDate=%s&endDate=%s",
            base, startDate, endDate
        );
        log.info("Dexcom EGV request url: {}", url);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, request, String.class);
            return response.getBody();
        } catch (RestClientException ex) {
            throw ex;
        }
    }

    public String fetchDataRange(String providerName, String accessToken, String lastSyncTime) {
        OAuthProviderProperties provider = providersProperties.getProvider(providerName);
        String base = provider.getApiBase();
        if (base == null || base.isBlank()) {
            throw new IllegalStateException("API base URL is not configured for " + providerName);
        }

        String url = String.format("%s/users/self/dataRange", base);
        if (lastSyncTime != null && !lastSyncTime.isBlank()) {
            url = String.format("%s?lastSyncTime=%s", url, encode(lastSyncTime));
        }
        log.info("Dexcom dataRange request url: {}", url);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, request, String.class);
            return response.getBody();
        } catch (RestClientException ex) {
            throw ex;
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
