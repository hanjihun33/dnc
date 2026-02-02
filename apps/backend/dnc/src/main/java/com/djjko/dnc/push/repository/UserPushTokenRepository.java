package com.djjko.dnc.push.repository;

import com.djjko.dnc.push.entity.UserPushToken;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserPushTokenRepository extends JpaRepository<UserPushToken, Long> {
    List<UserPushToken> findByUser_UserIdAndEnabledTrue(Long userId);

    Optional<UserPushToken> findByToken(String token);
}
