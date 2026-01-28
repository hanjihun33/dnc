package com.djjko.dnc.auth.repository;

import com.djjko.dnc.auth.entity.SocialAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SocialAccountRepository extends JpaRepository<SocialAccount, Long> {

    Optional<SocialAccount> findByProviderAndProviderUserId(String provider, String providerUserId);

    Optional<SocialAccount> findByUserUserIdAndProvider(Long userId, String provider);
}
