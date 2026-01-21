package com.djjko.dnc.oauth.service;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import com.djjko.dnc.oauth.config.OAuthProviderProperties;
import com.djjko.dnc.oauth.config.OAuthProvidersProperties;
import com.djjko.dnc.oauth.dto.OAuthTokenResponse;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.boot.web.client.RestTemplateBuilder;

@Service
public class OAuthService {

    private final OAuthProvidersProperties providersProperties;
    private final RestTemplate restTemplate;

    public OAuthService(OAuthProvidersProperties providersProperties, RestTemplateBuilder restTemplateBuilder) {
        this.providersProperties = providersProperties;
        this.restTemplate = restTemplateBuilder.build();
    }

    public String buildAuthorizeUrl(String providerName, String state) {
        OAuthProviderProperties provider = providersProperties.getProvider(providerName);
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

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
