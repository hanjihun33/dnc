package com.djjko.dnc.push.service;

import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.auth.repository.UserRepository;
import com.djjko.dnc.push.dto.PushTokenRequest;
import com.djjko.dnc.push.entity.UserPushToken;
import com.djjko.dnc.push.model.PushPlatform;
import com.djjko.dnc.push.repository.UserPushTokenRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class PushTokenService {

    private final UserPushTokenRepository userPushTokenRepository;
    private final UserRepository userRepository;

    @Transactional
    public void register(Long userId, PushTokenRequest request) {
        if (request.getToken() == null || request.getToken().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token is required");
        }
        PushPlatform platform = request.getPlatform();
        if (platform == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Platform is required");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        userPushTokenRepository.findByToken(request.getToken())
                .ifPresentOrElse(existing -> {
                    if (!existing.getUser().getUserId().equals(user.getUserId())) {
                        existing.reassign(user, platform);
                    } else {
                        existing.touch(platform);
                    }
                    userPushTokenRepository.save(existing);
                }, () -> {
                    UserPushToken created = UserPushToken.builder()
                            .user(user)
                            .platform(platform)
                            .token(request.getToken())
                            .enabled(true)
                            .build();
                    created.touch(platform);
                    userPushTokenRepository.save(created);
                });
    }

    @Transactional(readOnly = true)
    public List<UserPushToken> getEnabledTokens(Long userId) {
        return userPushTokenRepository.findByUser_UserIdAndEnabledTrue(userId);
    }

    @Transactional
    public void disableToken(String token) {
        userPushTokenRepository.findByToken(token).ifPresent(existing -> {
            existing.disable();
            userPushTokenRepository.save(existing);
        });
    }
}
