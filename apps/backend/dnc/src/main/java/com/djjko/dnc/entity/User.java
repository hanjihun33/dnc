package com.djjko.dnc.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;

    private String email;
    private String nickname;

    // 덱스콤 유저 ID ("36f0...")를 저장할 곳 (필수!)
    private String providerId;

    @Builder.Default
    private String provider = "dexcom";

    private LocalDateTime createdAt;

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