package com.djjko.dnc.auth.service.oauth;

import com.djjko.dnc.auth.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * OAuth state 토큰을 서명해 발급/검증하여,
 * 공급자 리다이렉트에 인증 헤더/쿠키가 없어도
 * 콜백에서 사용자를 식별할 수 있도록 한다.
 */
@Slf4j
@Service
public class OAuthStateService {

    private static final String STATE_TYPE = "oauth-state";

    private final SecretKey secretKey;
    private final long stateExpirationSeconds;

    public OAuthStateService(
        @Value("${jwt.secret}") String secret,
        @Value("${oauth.state-expiration-seconds:600}") long stateExpirationSeconds
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.stateExpirationSeconds = stateExpirationSeconds;
    }

    public String issueState(User user, String clientState) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(stateExpirationSeconds);

        return Jwts.builder()
            .subject(String.valueOf(user.getUserId()))
            .claim("email", user.getEmail())
            .claim("type", STATE_TYPE)
            .claim("client_state", clientState)
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiry))
            .signWith(secretKey)
            .compact();
    }

    public Optional<Long> resolveUserId(String stateToken) {
        if (stateToken == null || stateToken.isBlank()) {
            return Optional.empty();
        }

        try {
            Claims claims = parseClaims(stateToken);
            String type = claims.get("type", String.class);
            if (!STATE_TYPE.equals(type)) {
                log.warn("OAuth state type mismatch: {}", type);
                return Optional.empty();
            }
            return Optional.of(Long.parseLong(claims.getSubject()));
        } catch (ExpiredJwtException e) {
            log.warn("OAuth state token expired: {}", e.getMessage());
            return Optional.empty();
        } catch (MalformedJwtException | SignatureException | IllegalArgumentException e) {
            log.warn("Invalid OAuth state token: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}

