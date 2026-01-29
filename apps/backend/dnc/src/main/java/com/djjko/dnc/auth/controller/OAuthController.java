package com.djjko.dnc.auth.controller;

import java.net.URI;
import java.util.UUID;

import com.djjko.dnc.auth.dto.response.OAuthTokenResponse;
import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.auth.service.oauth.OAuthService;
import com.djjko.dnc.auth.service.oauth.OAuthStateService;
import com.djjko.dnc.auth.service.oauth.OAuthTokenService;
import com.djjko.dnc.auth.repository.UserRepository;
import com.djjko.dnc.auth.security.JwtUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper;

    public OAuthController(
        OAuthService oAuthService,
        OAuthStateService oAuthStateService,
        OAuthTokenService oAuthTokenService,
        UserRepository userRepository,
        JwtUtil jwtUtil,
        ObjectMapper objectMapper
    ) {
        this.oAuthService = oAuthService;
        this.oAuthStateService = oAuthStateService;
        this.oAuthTokenService = oAuthTokenService;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/{provider}/authorize")
    @Operation(summary = "OAuth 인가 URL 요청")
    public ResponseEntity<Void> authorize(
        @PathVariable String provider,
        @RequestParam(required = false) String state,
        HttpServletRequest request
    ) {
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
    @Operation(summary = "OAuth 인가 URL 조회")
    public OAuthAuthorizeResponse authorizeUrl(
        @PathVariable String provider,
        @RequestParam(required = false) String state,
        HttpServletRequest request
    ) {
        String clientState = (state == null || state.isBlank()) ? UUID.randomUUID().toString() : state;
        String resolvedState = resolveAuthenticatedUserOrHeader(request)
            .map(user -> oAuthStateService.issueState(user, clientState))
            .orElse(clientState);
        String authorizeUrl = oAuthService.buildAuthorizeUrl(provider, resolvedState);
        return new OAuthAuthorizeResponse(authorizeUrl);
    }

    @GetMapping("/{provider}/callback")
    @Operation(summary = "OAuth 콜백 처리")
    public ResponseEntity<?> callback(
        @PathVariable String provider,
        @RequestParam String code,
        @RequestParam(required = false) String state
    ) {
        OAuthTokenResponse response = oAuthService.exchangeCodeForToken(provider, code, state);
        java.util.Optional<com.djjko.dnc.auth.entity.User> userOpt = resolveAuthenticatedUserOrState(state);
        if (userOpt.isPresent()) {
            com.djjko.dnc.auth.entity.User user = userOpt.get();
            log.info("OAuth callback resolved userId={} provider={}", user.getUserId(), provider);
            updateProviderIdIfDexcom(user, provider, response);
            oAuthTokenService.saveToken(user, provider, response);
            log.info("OAuth token saved for userId={} provider={}", user.getUserId(), provider);
        } else {
            log.warn("OAuth callback could not resolve user. provider={} statePresent={}", provider, state != null && !state.isBlank());
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{provider}/token")
    @Operation(summary = "OAuth 토큰 발급 및 저장")
    public OAuthTokenResponse exchangeAndStore(
        @PathVariable String provider,
        @RequestParam String code
    ) {
        OAuthTokenResponse response = oAuthService.exchangeCodeForToken(provider, code);
        User user = resolveRequiredUser();
        updateProviderIdIfDexcom(user, provider, response);
        oAuthTokenService.saveToken(user, provider, response);
        return response;
    }

    @PostMapping("/{provider}/refresh")
    @Operation(summary = "OAuth 토큰 갱신")
    public OAuthTokenResponse refreshToken(@PathVariable String provider) {
        com.djjko.dnc.auth.entity.User user = resolveRequiredUser();
        String refreshToken = oAuthTokenService.getToken(user, provider).getRefreshToken();
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Refresh token is missing");
        }
        OAuthTokenResponse response = oAuthService.refreshToken(provider, refreshToken);
        oAuthTokenService.saveToken(user, provider, response);
        return response;
    }

    @GetMapping("/{provider}/egvs")
    @Operation(summary = "CGM 혈당 데이터 조회")
    public ResponseEntity<String> fetchEgvs(
        @PathVariable String provider,
        @Parameter(description = "Start date (YYYY-MM-DDTHH:mm:ss)", example = "2026-01-27T00:00:00")
        @RequestParam String startDate,
        @Parameter(description = "End date (YYYY-MM-DDTHH:mm:ss)", example = "2026-01-27T23:59:59")
        @RequestParam String endDate
    ) {
        com.djjko.dnc.auth.entity.User user = resolveRequiredUser();
        String accessToken = oAuthTokenService.getToken(user, provider).getAccessToken();
        String body = oAuthService.fetchEgvData(provider, accessToken, startDate, endDate);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{provider}/data-range")
    @Operation(summary = "CGM 데이터 범위 조회")
    public ResponseEntity<String> fetchDataRange(
        @PathVariable String provider,
        @RequestParam(required = false) String lastSyncTime
    ) {
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

    private java.util.Optional<com.djjko.dnc.auth.entity.User> resolveAuthenticatedUserOrHeader(HttpServletRequest request) {
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

    private com.djjko.dnc.auth.entity.User resolveRequiredUser() {
        return resolveAuthenticatedUser()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Login required"));
    }
}
