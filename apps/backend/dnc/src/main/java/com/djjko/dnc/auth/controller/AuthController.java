package com.djjko.dnc.auth.controller;

import com.djjko.dnc.auth.dto.request.AuthLoginRequest;
import com.djjko.dnc.auth.dto.request.AuthSignupRequest;
import com.djjko.dnc.auth.dto.response.AuthLoginResponse;
import com.djjko.dnc.auth.dto.response.AuthLogoutResponse;
import com.djjko.dnc.auth.dto.response.AuthReissueResponse;
import com.djjko.dnc.auth.dto.response.AuthSignupResponse;
import com.djjko.dnc.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    @Operation(summary = "회원가입")
    public ResponseEntity<AuthSignupResponse> signup(@Valid @RequestBody AuthSignupRequest request) {
        AuthSignupResponse response = authService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    @Operation(summary = "로그인")
    public AuthLoginResponse login(@Valid @RequestBody AuthLoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/check-email")
    @Operation(summary = "이메일 중복 확인")
    public ResponseEntity<Void> checkEmail(@RequestParam("email") String email) {
        authService.checkEmailAvailable(email);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/check-nickname")
    @Operation(summary = "닉네임 중복 확인")
    public ResponseEntity<Void> checkNickname(@RequestParam("nickname") String nickname) {
        authService.checkNicknameAvailable(nickname);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/logout")
    @Operation(summary = "로그아웃")
    public AuthLogoutResponse logout() {
        return new AuthLogoutResponse("Logged out");
    }

    @PostMapping("/reissue")
    @Operation(summary = "토큰 재발급")
    public ResponseEntity<AuthReissueResponse> reissue(@RequestHeader("Authorization") String refreshToken) {
        AuthReissueResponse response = authService.reissue(refreshToken);
        return ResponseEntity.ok(response);
    }
}
