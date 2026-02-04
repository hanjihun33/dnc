package com.djjko.dnc.auth.controller;

import com.djjko.dnc.auth.dto.response.SocialLoginResponse;
import com.djjko.dnc.auth.service.oauth.OAuthService;
import com.djjko.dnc.auth.service.oauth.SocialLoginService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/login")
public class SocialLoginController {

    private final OAuthService oAuthService;
    private final SocialLoginService socialLoginService;
    private final String appRedirectUri;
    private final String webRedirectUri;

    public SocialLoginController(
            OAuthService oAuthService,
            SocialLoginService socialLoginService,
            @Value("${app.social-login-redirect-uri:testapp://auth}") String appRedirectUri,
            @Value("${app.social-login-redirect-uri-web:http://localhost:3000/auth}") String webRedirectUri) {
        this.oAuthService = oAuthService;
        this.socialLoginService = socialLoginService;
        this.appRedirectUri = appRedirectUri;
        this.webRedirectUri = webRedirectUri;
    }

    @GetMapping("/{provider}/authorize")
    @Operation(summary = "소셜 로그인 인가 URL 요청")
    public ResponseEntity<Void> authorize(
            @PathVariable String provider,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String platform) {
        String resolvedState = resolveState(state, platform);
        String authorizeUrl = oAuthService.buildAuthorizeUrl(provider, resolvedState);

        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(authorizeUrl));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    @GetMapping("/{provider}/callback")
    @Operation(summary = "소셜 로그인 콜백 처리")
    public ResponseEntity<?> callback(
            @PathVariable String provider,
            @RequestParam String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false, name = "format") String format,
            @RequestHeader(value = "Accept", required = false) String accept) {
        SocialLoginResponse response = socialLoginService.login(provider, code, state);
        if (wantsJson(format, accept)) {
            return ResponseEntity.ok(response);
        }
        String redirectUrl = buildRedirectUrl(response, resolveRedirectBase(state));
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(redirectUrl));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    private boolean wantsJson(String format, String accept) {
        if (format != null && format.equalsIgnoreCase("json")) {
            return true;
        }
        if (accept == null || accept.isBlank()) {
            return false;
        }
        String normalized = accept.toLowerCase();
        boolean hasJson = normalized.contains("application/json");
        boolean hasHtml = normalized.contains("text/html");
        boolean hasWildcard = normalized.contains("*/*");
        return hasJson && !hasHtml && !hasWildcard;
    }

    private String buildHtmlResponse(SocialLoginResponse response) {
        String accessToken = urlEncode(response.getAccessToken());
        String refreshToken = urlEncode(response.getRefreshToken());
        String tokenType = urlEncode(response.getTokenType());
        String userId = response.getUserId() == null ? "" : String.valueOf(response.getUserId());
        String expiresIn = String.valueOf(response.getExpiresIn());
        String appUrl = buildAppRedirectUrl(response);
        return """
                <!doctype html>
                <html lang="ko">
                  <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <title>로그인 완료</title>
                    <style>
                      body {
                        margin: 0;
                        padding: 32px 20px;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                        background: #f8fafc;
                        color: #0f172a;
                      }
                      .card {
                        max-width: 420px;
                        margin: 0 auto;
                        background: #ffffff;
                        border-radius: 16px;
                        padding: 24px;
                        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
                        text-align: center;
                      }
                      .title { font-size: 18px; font-weight: 700; }
                      .desc { margin-top: 8px; color: #475569; font-size: 14px; }
                    </style>
                  </head>
                  <body>
                    <div class="card">
                      <div class="title">로그인이 완료되었습니다.</div>
                      <div class="desc">앱으로 돌아가 주세요.</div>
                      <div class="link">
                        앱이 열리지 않으면 <a id="open-app" href="#">여기를 눌러주세요</a>.
                      </div>
                    </div>
                    <script>
                      (function () {
                        var appUrl = "%s";
                        var anchor = document.getElementById("open-app");
                        if (anchor) {
                          anchor.setAttribute("href", appUrl);
                        }
                        setTimeout(function () {
                          window.location.href = appUrl;
                        }, 50);
                        setTimeout(function () {
                          window.close();
                        }, 500);
                      })();
                    </script>
                  </body>
                </html>
                """.formatted(appUrl);
    }

    private String buildRedirectUrl(SocialLoginResponse response, String baseRedirectUri) {
        String accessToken = urlEncode(response.getAccessToken());
        String refreshToken = urlEncode(response.getRefreshToken());
        String tokenType = urlEncode(response.getTokenType());
        String userId = response.getUserId() == null ? "" : String.valueOf(response.getUserId());
        String expiresIn = String.valueOf(response.getExpiresIn());
        String newUser = String.valueOf(response.isNewUser());

        String separator = baseRedirectUri.contains("?") ? "&" : "?";
        return baseRedirectUri
                + separator
                + "accessToken="
                + accessToken
                + "&refreshToken="
                + refreshToken
                + "&tokenType="
                + tokenType
                + "&userId="
                + userId
                + "&expiresIn="
                + expiresIn
                + "&newUser="
                + newUser;
    }

    private String buildAppRedirectUrl(SocialLoginResponse response) {
        return buildRedirectUrl(response, appRedirectUri);
    }

    private String resolveState(String state, String platform) {
        String baseState = (state == null || state.isBlank())
                ? UUID.randomUUID().toString()
                : state;
        String normalizedPlatform = normalizePlatform(platform);
        if (baseState.startsWith("app:") || baseState.startsWith("web:")) {
            return baseState;
        }
        return normalizedPlatform + ":" + baseState;
    }

    private String resolveRedirectBase(String state) {
        String platform = extractPlatform(state);
        if ("web".equals(platform)) {
            return webRedirectUri;
        }
        return appRedirectUri;
    }

    private String extractPlatform(String state) {
        if (state == null || state.isBlank()) {
            return "app";
        }
        String normalized = state.trim().toLowerCase();
        if (normalized.startsWith("web:")) {
            return "web";
        }
        if (normalized.startsWith("app:")) {
            return "app";
        }
        return "app";
    }

    private String normalizePlatform(String platform) {
        if (platform == null || platform.isBlank()) {
            return "app";
        }
        String normalized = platform.trim().toLowerCase();
        return "web".equals(normalized) ? "web" : "app";
    }

    private String urlEncode(String value) {
        if (value == null) {
            return "";
        }
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
