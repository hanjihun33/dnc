package com.djjko.dnc.repository;

import com.djjko.dnc.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    // 덱스콤 ID로 유저 찾기
    Optional<User> findByProviderId(String providerId);
}