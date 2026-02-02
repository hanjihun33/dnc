package com.djjko.dnc.auth.service.oauth;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

import com.djjko.dnc.auth.entity.OAuthToken;
import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.auth.dto.response.OAuthTokenResponse;
import com.djjko.dnc.auth.repository.OAuthTokenRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class OAuthTokenService {

    private final OAuthTokenRepository oauthTokenRepository;

    public OAuthTokenService(OAuthTokenRepository oauthTokenRepository) {
        this.oauthTokenRepository = oauthTokenRepository;
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

        return oauthTokenRepository.save(token);
    }

    public OAuthToken getToken(User user, String provider) {
        return oauthTokenRepository
            .findByUserUserIdAndProvider(user.getUserId(), provider)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "OAuth token not found"));
    }

    public Optional<OAuthToken> findToken(User user, String provider) {
        return oauthTokenRepository.findByUserUserIdAndProvider(user.getUserId(), provider);
    }

    public void deleteToken(User user, String provider) {
        oauthTokenRepository.deleteByUserUserIdAndProvider(user.getUserId(), provider);
    }

    private LocalDateTime resolveExpiresAt(Long expiresInSeconds) {
        if (expiresInSeconds == null) {
            return null;
        }
        return LocalDateTime.now(ZoneOffset.UTC).plusSeconds(expiresInSeconds);
    }
}
