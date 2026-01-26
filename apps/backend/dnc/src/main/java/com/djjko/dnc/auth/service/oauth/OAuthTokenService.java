package com.djjko.dnc.auth.service.oauth;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

import com.djjko.dnc.auth.entity.OAuthToken;
import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.auth.dto.response.OAuthTokenResponse;
import com.djjko.dnc.auth.repository.OAuthTokenRepository;
import com.djjko.dnc.auth.repository.UserRepository; // Added import
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class OAuthTokenService {

    private final OAuthTokenRepository oauthTokenRepository;
    private final UserRepository userRepository; // Added UserRepository

    public OAuthTokenService(OAuthTokenRepository oauthTokenRepository, UserRepository userRepository) { // Modified constructor
        this.oauthTokenRepository = oauthTokenRepository;
        this.userRepository = userRepository; // Initialize UserRepository
    }

    public OAuthToken saveToken(User user, String provider, OAuthTokenResponse response) {
        OAuthToken token = oauthTokenRepository
            .findByUserUserIdAndProvider(user.getUserId(), provider)
            .orElseGet(OAuthToken::new);

        token.setUser(user);
        token.setProvider(provider);
        token.setAccessToken(response.getAccessToken());
        token.setRefreshToken(response.getRefreshToken());
        token.setTokenType(response.getTokenType());
        token.setScope(response.getScope());
        token.setExpiresAt(resolveExpiresAt(response.getExpiresIn()));

        OAuthToken savedOAuthToken = oauthTokenRepository.save(token);

        // Update User entity with Dexcom tokens if provider is Dexcom
        if ("dexcom".equalsIgnoreCase(provider)) {
            user.updateDexcomTokens(response.getAccessToken(), response.getRefreshToken(), response.getExpiresIn().intValue());
            userRepository.save(user); // Save the updated User entity
        }

        return savedOAuthToken;
    }

    public OAuthToken getToken(User user, String provider) {
        return oauthTokenRepository
            .findByUserUserIdAndProvider(user.getUserId(), provider)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "OAuth token not found"));
    }

    private LocalDateTime resolveExpiresAt(Long expiresInSeconds) {
        if (expiresInSeconds == null) {
            return null;
        }
        return LocalDateTime.now(ZoneOffset.UTC).plusSeconds(expiresInSeconds);
    }
}
