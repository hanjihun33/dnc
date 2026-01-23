package com.djjko.dnc.controller;

import com.djjko.dnc.model.dto.request.AuthLoginRequest;
import com.djjko.dnc.model.dto.request.AuthSignupRequest;
import com.djjko.dnc.model.dto.response.AuthLoginResponse;
import com.djjko.dnc.model.dto.response.AuthLogoutResponse;
import com.djjko.dnc.model.dto.response.AuthSignupResponse;
import com.djjko.dnc.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthSignupResponse> signup(@Valid @RequestBody AuthSignupRequest request) {
        AuthSignupResponse response = authService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public AuthLoginResponse login(@Valid @RequestBody AuthLoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/logout")
    public AuthLogoutResponse logout() {
        return new AuthLogoutResponse("Logged out");
    }
}
