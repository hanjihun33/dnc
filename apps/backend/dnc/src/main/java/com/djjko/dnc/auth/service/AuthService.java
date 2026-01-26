package com.djjko.dnc.auth.service;

import com.djjko.dnc.auth.dto.request.AuthLoginRequest;
import com.djjko.dnc.auth.dto.request.AuthSignupRequest;
import com.djjko.dnc.auth.dto.response.AuthLoginResponse;
import com.djjko.dnc.auth.dto.response.AuthReissueResponse;
import com.djjko.dnc.auth.dto.response.AuthSignupResponse;
import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.auth.repository.UserRepository;
import com.djjko.dnc.auth.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final long accessTokenExpirationMs;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       @Value("${jwt.expiration_time}") long accessTokenExpirationMs) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.accessTokenExpirationMs = accessTokenExpirationMs;
    }

    public AuthSignupResponse signup(AuthSignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .nickname(request.getNickname())
                .provider("local")
                .build();

        User saved = userRepository.save(user);

        return new AuthSignupResponse(saved.getUserId(), saved.getEmail(), saved.getNickname());
    }

    public AuthLoginResponse login(AuthLoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (user.getPassword() == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String accessToken = jwtUtil.generateAccessToken(user.getUserId(), user.getEmail());
        String refreshToken = jwtUtil.generateRefreshToken(user.getUserId(), user.getEmail());
        return new AuthLoginResponse(accessToken, refreshToken, "Bearer", accessTokenExpirationMs);
    }

    public AuthReissueResponse reissue(String refreshToken) {
        // 1. Extract token from "Bearer " prefix
        if (refreshToken == null || !refreshToken.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }
        String token = refreshToken.substring(7);

        // 2. Validate the refresh token
        jwtUtil.validateRefreshToken(token);

        // 3. Get user ID from the token
        Long userId = jwtUtil.getUserId(token);

        // 4. Find the user by ID
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        // 5. Generate a new access token
        String newAccessToken = jwtUtil.generateAccessToken(user.getUserId(), user.getEmail());

        // 6. Return the new access token
        return new AuthReissueResponse(newAccessToken);
    }
}
