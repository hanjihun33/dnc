package com.djjko.dnc.auth.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Getter
@Setter
@Entity
@Table(name = "users")
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(length = 255)
    private String password;

    @Column(length = 50)
    private String nickname;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String provider = "local";

    @Column(name = "provider_id", length = 255)
    private String providerId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(length = 2000) // 토큰이 엄청 길어서 넉넉하게 잡아야 함
    private String dexcomAccessToken;

    @Column(length = 2000)
    private String dexcomRefreshToken;

    // 토큰 만료 시간도 저장해두면 좋음 (선택 사항이지만 추천)
    private LocalDateTime tokenExpiresAt;

    // 토큰 정보를 업데이트하는 편의 메서드
    public void updateDexcomTokens(String accessToken, String refreshToken, int expiresIn) {
        this.dexcomAccessToken = accessToken;
        this.dexcomRefreshToken = refreshToken;
        this.tokenExpiresAt = LocalDateTime.now().plusSeconds(expiresIn);
    }
}
