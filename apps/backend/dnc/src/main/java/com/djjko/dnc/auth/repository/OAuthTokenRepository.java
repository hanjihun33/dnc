package com.djjko.dnc.auth.repository;

import java.util.Optional;

import com.djjko.dnc.auth.entity.OAuthToken;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OAuthTokenRepository extends JpaRepository<OAuthToken, Long> {

    Optional<OAuthToken> findByUserUserIdAndProvider(Long userId, String provider);

    void deleteByUserUserIdAndProvider(Long userId, String provider);
}
