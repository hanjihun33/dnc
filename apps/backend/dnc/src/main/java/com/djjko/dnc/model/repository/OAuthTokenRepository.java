package com.djjko.dnc.model.repository;

import java.util.Optional;

import com.djjko.dnc.model.entity.OAuthToken;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OAuthTokenRepository extends JpaRepository<OAuthToken, Long> {

    Optional<OAuthToken> findByUserUserIdAndProvider(Long userId, String provider);
}
