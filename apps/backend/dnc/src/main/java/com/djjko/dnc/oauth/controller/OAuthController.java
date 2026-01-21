package com.djjko.dnc.oauth.controller;

import java.net.URI;
import java.util.UUID;

import com.djjko.dnc.oauth.dto.OAuthTokenResponse;
import com.djjko.dnc.oauth.service.OAuthService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/oauth")
public class OAuthController {

    private final OAuthService oAuthService;

    public OAuthController(OAuthService oAuthService) {
        this.oAuthService = oAuthService;
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
        return oAuthService.exchangeCodeForToken(provider, code);
    }
}
