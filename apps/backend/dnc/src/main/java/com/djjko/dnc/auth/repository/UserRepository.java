package com.djjko.dnc.auth.repository;

import java.util.Optional;

import com.djjko.dnc.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<User> findByProviderId(String providerId);
}
