package com.djjko.dnc.push.entity;

import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.push.model.PushPlatform;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "user_push_tokens",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_user_token", columnNames = {"user_id", "token"}),
                @UniqueConstraint(name = "uk_token", columnNames = {"token"})
        })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class UserPushToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "token_id")
    private Long tokenId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PushPlatform platform;

    @Column(nullable = false, length = 512)
    private String token;

    @Column(nullable = false)
    private Boolean enabled;

    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public void touch(PushPlatform platform) {
        if (platform != null) {
            this.platform = platform;
        }
        this.enabled = true;
        this.lastSeenAt = LocalDateTime.now();
    }

    public void reassign(User user, PushPlatform platform) {
        this.user = user;
        touch(platform);
    }

    public void disable() {
        this.enabled = false;
    }
}
