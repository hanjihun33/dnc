package com.djjko.dnc.auth.controller;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.UUID;

import com.djjko.dnc.auth.dto.response.OAuthTokenResponse;
import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.auth.service.oauth.OAuthService;
import com.djjko.dnc.auth.service.oauth.OAuthStateService;
import com.djjko.dnc.auth.service.oauth.OAuthTokenService;
import com.djjko.dnc.auth.repository.UserRepository;
import com.djjko.dnc.auth.security.JwtUtil;
import com.djjko.dnc.glucose.entity.Sensor;
import com.djjko.dnc.glucose.repository.SensorRepository;
import com.djjko.dnc.report.repository.GlucoseDataRepository;
import com.djjko.dnc.glucose.service.SensorService;
import com.djjko.dnc.glucose.service.CgmPipelineService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import com.djjko.dnc.auth.dto.response.OAuthAuthorizeResponse;

@Slf4j
@RestController
@RequestMapping("/api/v1/oauth")
public class OAuthController {

    private final OAuthService oAuthService;
    private final OAuthStateService oAuthStateService;
    private final OAuthTokenService oAuthTokenService;
    private final UserRepository userRepository;
    private final SensorRepository sensorRepository;
    private final SensorService sensorService; // New dependency
    private final GlucoseDataRepository glucoseDataRepository;
    private final CgmPipelineService cgmPipelineService; // New dependency
    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper;
    private final String appOauthRedirectUri;

    public OAuthController(
            OAuthService oAuthService,
            OAuthStateService oAuthStateService,
            OAuthTokenService oAuthTokenService,
            UserRepository userRepository,
            SensorRepository sensorRepository,
            SensorService sensorService,
            GlucoseDataRepository glucoseDataRepository,
            CgmPipelineService cgmPipelineService,
            JwtUtil jwtUtil,
            ObjectMapper objectMapper,
            @Value("${app.oauth-redirect-uri:testapp://}") String appOauthRedirectUri) {
        this.oAuthService = oAuthService;
        this.oAuthStateService = oAuthStateService;
        this.oAuthTokenService = oAuthTokenService;
        this.userRepository = userRepository;
        this.sensorRepository = sensorRepository;
        this.sensorService = sensorService;
        this.glucoseDataRepository = glucoseDataRepository;
        this.cgmPipelineService = cgmPipelineService;
        this.jwtUtil = jwtUtil;
        this.objectMapper = objectMapper;
        this.appOauthRedirectUri = appOauthRedirectUri;
    }

    @GetMapping("/{provider}/authorize")
    @Operation(summary = "OAuth authorize URL redirect")
    public ResponseEntity<Void> authorize(
            @PathVariable("provider") String provider,
            @RequestParam(value = "state", required = false) String state,
            HttpServletRequest request) {
        String clientState = (state == null || state.isBlank()) ? UUID.randomUUID().toString() : state;
        String resolvedState = resolveAuthenticatedUserOrHeader(request)
                .map(user -> oAuthStateService.issueState(user, clientState))
                .orElse(clientState);
        String authorizeUrl = oAuthService.buildAuthorizeUrl(provider, resolvedState);

        log.info("Redirecting to {} auth URL: {}", provider, authorizeUrl);

        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(authorizeUrl));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    @GetMapping("/{provider}/authorize-url")
    @Operation(summary = "OAuth authorize URL")
    public OAuthAuthorizeResponse authorizeUrl(
            @PathVariable("provider") String provider,
            @RequestParam(value = "state", required = false) String state,
            HttpServletRequest request) {
        String clientState = (state == null || state.isBlank()) ? UUID.randomUUID().toString() : state;
        String resolvedState = resolveAuthenticatedUserOrHeader(request)
                .map(user -> oAuthStateService.issueState(user, clientState))
                .orElse(clientState);
        String authorizeUrl = oAuthService.buildAuthorizeUrl(provider, resolvedState);
        return new OAuthAuthorizeResponse(authorizeUrl);
    }

    @GetMapping("/{provider}/callback")
    @Operation(summary = "OAuth callback handler")
    public ResponseEntity<?> callback(
            @PathVariable("provider") String provider,
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "error", required = false) String error,
            @RequestParam(required = false, name = "error_description") String errorDescription,
            @RequestParam(required = false, name = "format") String format,
            @RequestHeader(value = "Accept", required = false) String accept) {
        // 1. 에러 발생 또는 인증 코드 누락 시 처리
        if (error != null || code == null || code.isBlank()) {
            String message = resolveOAuthFailureMessage(error, errorDescription, code);
            String status = isCancelError(error) ? "cancel" : "error";

            // 2. 요청 포맷에 따라 앱 리다이렉트 또는 예외 발생
            if (shouldRedirectToApp(format, accept)) {
                return redirectToApp(provider, status, message, accept);
            }
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }

        try {
            OAuthTokenResponse response = oAuthService.exchangeCodeForToken(provider, code, state);
            java.util.Optional<com.djjko.dnc.auth.entity.User> userOpt = resolveAuthenticatedUserOrState(state);
            if (userOpt.isPresent()) {
                com.djjko.dnc.auth.entity.User user = userOpt.get();
                log.info("OAuth callback resolved userId={} provider={}", user.getUserId(), provider);
                updateProviderIdIfDexcom(user, provider, response);
                oAuthTokenService.saveToken(user, provider, response);
                log.info("OAuth token saved for userId={} provider={}", user.getUserId(), provider);

                // [추가] 연동 즉시 데이터 수집 실행 (지연 시간 제거)
                if ("dexcom".equalsIgnoreCase(provider)) {
                    // 1. PENDING 센서 생성 (예열 상태 표시용)
                    try {
                        sensorService.createPendingSensor(user);
                        log.info("PENDING 상태 센서 생성 완료: User {}", user.getUserId());
                    } catch (Exception e) {
                        log.warn("PENDING 센서 생성 실패: {}", e.getMessage());
                    }

                    // 2. 즉시 데이터 동기화 시도 (예열 상태 확인을 위해 주석 처리)
                    // try {
                    // cgmPipelineService.fetchLatestDataForUser(user);
                    // log.info("Dexcom 연동 즉시 데이터 동기화 완료: User {}", user.getUserId());
                    // } catch (Exception e) {
                    // log.warn("Dexcom 연동 후 즉시 동기화 실패 (스케줄러가 처리 예정): {}", e.getMessage());
                    // }
                }
            } else {
                log.warn("OAuth callback could not resolve user. provider={} statePresent={}", provider,
                        state != null && !state.isBlank());
            }
            if (shouldRedirectToApp(format, accept)) {
                return redirectToApp(provider, "success", null, accept);
            }
            return ResponseEntity.ok(response);
        } catch (Exception ex) {
            if (shouldRedirectToApp(format, accept)) {
                return redirectToApp(provider, "error", ex.getMessage(), accept);
            }
            throw ex;
        }
    }

    @PostMapping("/{provider}/token")
    @Operation(summary = "OAuth token exchange")
    public OAuthTokenResponse exchangeAndStore(
            @PathVariable("provider") String provider,
            @RequestParam("code") String code) {
        OAuthTokenResponse response = oAuthService.exchangeCodeForToken(provider, code);
        User user = resolveRequiredUser();
        updateProviderIdIfDexcom(user, provider, response);
        oAuthTokenService.saveToken(user, provider, response);
        return response;
    }

    @PostMapping("/{provider}/refresh")
    @Operation(summary = "OAuth token refresh")
    public OAuthTokenResponse refreshToken(@PathVariable("provider") String provider) {
        com.djjko.dnc.auth.entity.User user = resolveRequiredUser();
        String refreshToken = oAuthTokenService.getToken(user, provider).getRefreshToken();
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Refresh token is missing");
        }
        OAuthTokenResponse response = oAuthService.refreshToken(provider, refreshToken);
        oAuthTokenService.saveToken(user, provider, response);
        return response;
    }

    @PostMapping("/{provider}/disconnect")
    @Operation(summary = "OAuth disconnect")
    @Transactional
    public ResponseEntity<Void> disconnect(
            @PathVariable("provider") String provider,
            @RequestParam(value = "deleteData", defaultValue = "false") boolean deleteData) {
        User user = resolveRequiredUser();

        oAuthTokenService.findToken(user, provider)
                .ifPresent(token -> oAuthService.revokeToken(provider, token));

        oAuthTokenService.deleteToken(user, provider);

        if ("dexcom".equalsIgnoreCase(provider)) {
            user.setDexcomUserId(null);
            userRepository.save(user);
            deactivateSensors(user);
            if (deleteData) {
                glucoseDataRepository.deleteAllByUser_UserId(user.getUserId());
                sensorRepository.deleteAllByUser_UserId(user.getUserId());
            }
        }

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{provider}/egvs")
    @Operation(summary = "CGM EGV data")
    public ResponseEntity<String> fetchEgvs(
            @PathVariable("provider") String provider,
            @Parameter(description = "Start date (YYYY-MM-DDTHH:mm:ss)", example = "2026-01-27T00:00:00") @RequestParam("startDate") String startDate,
            @Parameter(description = "End date (YYYY-MM-DDTHH:mm:ss)", example = "2026-01-27T23:59:59") @RequestParam("endDate") String endDate) {
        com.djjko.dnc.auth.entity.User user = resolveRequiredUser();
        String accessToken = oAuthTokenService.getToken(user, provider).getAccessToken();
        String body = oAuthService.fetchEgvData(provider, accessToken, startDate, endDate);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{provider}/data-range")
    @Operation(summary = "CGM data range")
    public ResponseEntity<String> fetchDataRange(
            @PathVariable("provider") String provider,
            @RequestParam(value = "lastSyncTime", required = false) String lastSyncTime) {
        com.djjko.dnc.auth.entity.User user = resolveRequiredUser();
        String accessToken = oAuthTokenService.getToken(user, provider).getAccessToken();
        String body = oAuthService.fetchDataRange(provider, accessToken, lastSyncTime);
        return ResponseEntity.ok(body);
    }

    private java.util.Optional<com.djjko.dnc.auth.entity.User> resolveAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return java.util.Optional.empty();
        }
        return userRepository.findByEmail(authentication.getName());
    }

    private java.util.Optional<com.djjko.dnc.auth.entity.User> resolveAuthenticatedUserOrHeader(
            HttpServletRequest request) {
        java.util.Optional<com.djjko.dnc.auth.entity.User> authenticatedUser = resolveAuthenticatedUser();
        if (authenticatedUser.isPresent()) {
            return authenticatedUser;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return java.util.Optional.empty();
        }

        String token = authHeader.substring(7);
        try {
            jwtUtil.validateAccessToken(token);
            String email = jwtUtil.getEmail(token);
            return userRepository.findByEmail(email);
        } catch (Exception e) {
            log.warn("Failed to resolve user from Authorization header: {}", e.getMessage());
            return java.util.Optional.empty();
        }
    }

    private java.util.Optional<com.djjko.dnc.auth.entity.User> resolveAuthenticatedUserOrState(String state) {
        java.util.Optional<com.djjko.dnc.auth.entity.User> authenticatedUser = resolveAuthenticatedUser();
        if (authenticatedUser.isPresent()) {
            return authenticatedUser;
        }
        return oAuthStateService.resolveUserId(state)
                .flatMap(userRepository::findById);
    }

    private void updateProviderIdIfDexcom(User user, String provider, OAuthTokenResponse response) {
        if (!"dexcom".equalsIgnoreCase(provider)) {
            return;
        }
        if (response == null || response.getAccessToken() == null || response.getAccessToken().isBlank()) {
            return;
        }
        try {
            String body = oAuthService.fetchDataRange(provider, response.getAccessToken(), null);
            if (body == null || body.isBlank()) {
                return;
            }
            JsonNode root = objectMapper.readTree(body);
            JsonNode userIdNode = root.findValue("userId");
            if (userIdNode == null || userIdNode.isNull()) {
                return;
            }
            String dexcomUserId = userIdNode.asText(null);
            if (dexcomUserId == null || dexcomUserId.isBlank()) {
                return;
            }
            user.setDexcomUserId(dexcomUserId);
            userRepository.save(user);
            log.info("Dexcom userId synced for user {} -> {}", user.getUserId(), dexcomUserId);
        } catch (Exception ex) {
            log.warn("Failed to resolve Dexcom userId for user {}: {}", user.getUserId(), ex.getMessage());
        }
    }

    private void deactivateSensors(User user) {
        java.util.List<Sensor> activeSensors = sensorRepository.findAllByUserAndStatus(user,
                Sensor.SensorStatus.ACTIVE);
        if (activeSensors.isEmpty()) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        for (Sensor sensor : activeSensors) {
            sensor.changeStatus(Sensor.SensorStatus.INACTIVE);
            sensor.updateEndedAt(now);
        }
        sensorRepository.saveAll(activeSensors);
    }

    private com.djjko.dnc.auth.entity.User resolveRequiredUser() {
        return resolveAuthenticatedUser()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Login required"));
    }

    private boolean shouldRedirectToApp(String format, String accept) {
        if (appOauthRedirectUri == null || appOauthRedirectUri.isBlank()) {
            return false;
        }
        if (format != null && format.equalsIgnoreCase("json")) {
            return false;
        }
        if (accept == null || accept.isBlank()) {
            return true;
        }
        String normalized = accept.toLowerCase();
        boolean hasJson = normalized.contains("application/json");
        boolean hasHtml = normalized.contains("text/html");
        boolean hasWildcard = normalized.contains("*/*");
        return !hasJson || hasHtml || hasWildcard;
    }

    private ResponseEntity<?> redirectToApp(String provider, String status, String error, String accept) {
        String redirectUrl = buildAppRedirectUrl(provider, status, error);
        if (wantsHtml(accept)) {
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.TEXT_HTML)
                    .body(buildHtmlResponse(status, redirectUrl));
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(redirectUrl));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    private boolean wantsHtml(String accept) {
        if (accept == null || accept.isBlank()) {
            return true;
        }
        String normalized = accept.toLowerCase();
        if (normalized.contains("application/json")) {
            return false;
        }
        return normalized.contains("text/html") || normalized.contains("*/*");
    }

    private String buildAppRedirectUrl(String provider, String status, String error) {
        String separator = appOauthRedirectUri.contains("?") ? "&" : "?";
        StringBuilder url = new StringBuilder(appOauthRedirectUri).append(separator);
        url.append("provider=").append(urlEncode(provider));
        url.append("&status=").append(urlEncode(status));
        if (error != null && !error.isBlank()) {
            url.append("&error=").append(urlEncode(error));
        }
        return url.toString();
    }

    private String buildHtmlResponse(String status, String appUrl) {
        String title;
        String description;
        if ("success".equalsIgnoreCase(status)) {
            title = "연동 완료";
            description = "앱으로 돌아가 주세요.";
        } else if ("cancel".equalsIgnoreCase(status)) {
            title = "연동 취소";
            description = "연동이 취소되었습니다.";
        } else {
            title = "연동 실패";
            description = "잠시 후 다시 시도해주세요.";
        }
        String safeAppUrl = urlEncode(appUrl);
        return """
                <!doctype html>
                <html lang="ko">
                  <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <title>%s</title>
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
                      <div class="title">%s</div>
                      <div class="desc">%s</div>
                      <div class="link">
                        앱이 열리지 않으면 <a id="open-app" href="#">여기를 눌러주세요</a>.
                      </div>
                    </div>
                    <script>
                      (function () {
                        var appUrl = decodeURIComponent("%s");
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
                """.formatted(title, title, description, safeAppUrl);
    }

    private String urlEncode(String value) {
        if (value == null) {
            return "";
        }
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String resolveOAuthFailureMessage(String error, String errorDescription, String code) {
        if (errorDescription != null && !errorDescription.isBlank()) {
            return errorDescription;
        }
        if (error != null && !error.isBlank()) {
            if (isCancelError(error)) {
                return "연동이 취소되었습니다.";
            }
            return error;
        }
        if (code == null || code.isBlank()) {
            return "OAuth 승인 코드가 없습니다.";
        }
        return "OAuth 요청에 실패했습니다.";
    }

    private boolean isCancelError(String error) {
        if (error == null) {
            return false;
        }
        String normalized = error.toLowerCase();
        return normalized.contains("access_denied")
                || normalized.contains("cancel")
                || normalized.contains("user_cancel")
                || normalized.contains("consent_denied");
    }
}
