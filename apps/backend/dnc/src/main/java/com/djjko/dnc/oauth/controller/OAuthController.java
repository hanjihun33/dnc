package com.djjko.dnc.oauth.controller;

import java.net.URI;
import java.util.UUID;

import com.djjko.dnc.oauth.dto.OAuthTokenResponse;
import com.djjko.dnc.oauth.service.OAuthService;
import com.djjko.dnc.oauth.service.OAuthTokenService;
import com.djjko.dnc.repository.UserRepository;
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

@RestController
@RequestMapping("/api/v1/oauth")
public class OAuthController {

    private final OAuthService oAuthService;
    private final OAuthTokenService oAuthTokenService;
    private final UserRepository userRepository;

    public OAuthController(OAuthService oAuthService, OAuthTokenService oAuthTokenService, UserRepository userRepository) {
        this.oAuthService = oAuthService;
        this.oAuthTokenService = oAuthTokenService;
        this.userRepository = userRepository;
    }

    @GetMapping("/{provider}/authorize")
    public ResponseEntity<Void> authorize(
        @PathVariable String provider,
        @RequestParam(required = false) String state
    ) {
        String resolvedState = (state == null || state.isBlank()) ? UUID.randomUUID().toString() : state;
        String authorizeUrl = oAuthService.buildAuthorizeUrl(provider, resolvedState);

        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(authorizeUrl));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    @GetMapping("/{provider}/callback")
    public OAuthTokenResponse callback(
        @PathVariable String provider,
        @RequestParam String code
    ) {
        OAuthTokenResponse response = oAuthService.exchangeCodeForToken(provider, code);
        resolveAuthenticatedUser().ifPresent(user -> oAuthTokenService.saveToken(user, provider, response));
        return response;
    }

    @PostMapping("/{provider}/token")
    public OAuthTokenResponse exchangeAndStore(
        @PathVariable String provider,
        @RequestParam String code
    ) {
        OAuthTokenResponse response = oAuthService.exchangeCodeForToken(provider, code);
        oAuthTokenService.saveToken(resolveRequiredUser(), provider, response);
        return response;
    }

    @PostMapping("/{provider}/refresh")
    public OAuthTokenResponse refreshToken(@PathVariable String provider) {
        com.djjko.dnc.entity.User user = resolveRequiredUser();
        String refreshToken = oAuthTokenService.getToken(user, provider).getRefreshToken();
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Refresh token is missing");
        }
        OAuthTokenResponse response = oAuthService.refreshToken(provider, refreshToken);
        oAuthTokenService.saveToken(user, provider, response);
        return response;
    }

    @GetMapping("/{provider}/egvs")
    public ResponseEntity<String> fetchEgvs(
        @PathVariable String provider,
        @RequestParam String startDate,
        @RequestParam String endDate
    ) {
        com.djjko.dnc.entity.User user = resolveRequiredUser();
        String accessToken = oAuthTokenService.getToken(user, provider).getAccessToken();
        String body = oAuthService.fetchEgvData(provider, accessToken, startDate, endDate);
        return ResponseEntity.ok(body);
    }

    private java.util.Optional<com.djjko.dnc.entity.User> resolveAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
            || !authentication.isAuthenticated()
            || authentication instanceof AnonymousAuthenticationToken) {
            return java.util.Optional.empty();
        }
        return userRepository.findByEmail(authentication.getName());
    }

    private com.djjko.dnc.entity.User resolveRequiredUser() {
        return resolveAuthenticatedUser()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Login required"));
    }
}
