package com.djjko.dnc.auth.controller;

import com.djjko.dnc.auth.dto.response.SocialLoginResponse;
import com.djjko.dnc.auth.service.oauth.OAuthService;
import com.djjko.dnc.auth.service.oauth.SocialLoginService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/login")
public class SocialLoginController {

    private final OAuthService oAuthService;
    private final SocialLoginService socialLoginService;

    public SocialLoginController(OAuthService oAuthService, SocialLoginService socialLoginService) {
        this.oAuthService = oAuthService;
        this.socialLoginService = socialLoginService;
    }

    @GetMapping("/{provider}/authorize")
    @Operation(summary = "소셜 로그인 인가 URL 요청")
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
    @Operation(summary = "소셜 로그인 콜백 처리")
    public SocialLoginResponse callback(
        @PathVariable String provider,
        @RequestParam String code,
        @RequestParam(required = false) String state
    ) {
        return socialLoginService.login(provider, code, state);
    }
}
