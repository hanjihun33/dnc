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
                .name(request.getName()) // 병합 브랜치에서 추가됨
                .birthDate(request.getBirthDate()) // 병합 브랜치에서 추가됨
                .provider("local")
                .providerId(null) // 병합 브랜치에서 추가됨
                .build();

        User saved = userRepository.save(user);

        return new AuthSignupResponse(saved.getUserId(), saved.getEmail(), saved.getNickname());
    }

    public void checkEmailAvailable(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }
    }

    public void checkNicknameAvailable(String nickname) {
        if (userRepository.existsByNickname(nickname)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Nickname already in use");
        }
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
        // 1. "Bearer " 접두사에서 토큰 추출
        if (refreshToken == null || !refreshToken.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }
        String token = refreshToken.substring(7);

        // 2. 리프레시 토큰 검증
        jwtUtil.validateRefreshToken(token);

        // 3. 토큰에서 사용자 ID 추출
        Long userId = jwtUtil.getUserId(token);

        // 4. 사용자 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        // 5. 새 액세스 토큰 생성
        String newAccessToken = jwtUtil.generateAccessToken(user.getUserId(), user.getEmail());

        // 6. 새 액세스 토큰 반환
        return new AuthReissueResponse(newAccessToken);
    }
}
