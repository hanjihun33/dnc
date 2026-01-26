package com.djjko.dnc.auth.service;

import com.djjko.dnc.auth.dto.request.AuthLoginRequest;
import com.djjko.dnc.auth.dto.request.AuthSignupRequest;
import com.djjko.dnc.auth.dto.response.AuthLoginResponse;
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
    private final long expirationMs;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       @Value("${jwt.expiration_time}") long expirationMs) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.expirationMs = expirationMs;
    }

    public AuthSignupResponse signup(AuthSignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setNickname(request.getNickname());
        user.setName(request.getName());
        user.setBirthDate(request.getBirthDate());
        user.setProvider("local");
        user.setProviderId(null);

        User saved = userRepository.save(user);

        return new AuthSignupResponse(saved.getUserId(), saved.getEmail(), saved.getNickname());
    }

    public AuthLoginResponse login(AuthLoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (user.getPassword() == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = jwtUtil.generateToken(user.getUserId(), user.getEmail());
        return new AuthLoginResponse(token, "Bearer", expirationMs);
    }
}
