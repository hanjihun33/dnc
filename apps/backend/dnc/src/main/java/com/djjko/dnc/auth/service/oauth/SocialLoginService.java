package com.djjko.dnc.auth.service.oauth;

import com.djjko.dnc.auth.dto.response.OAuthTokenResponse;
import com.djjko.dnc.auth.dto.response.SocialLoginResponse;
import com.djjko.dnc.auth.entity.SocialAccount;
import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.auth.repository.SocialAccountRepository;
import com.djjko.dnc.auth.repository.UserRepository;
import com.djjko.dnc.auth.security.JwtUtil;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

@Service
public class SocialLoginService {

    private static final Logger log = LoggerFactory.getLogger(SocialLoginService.class);
    private static final Set<String> SOCIAL_PROVIDERS = Set.of("google", "kakao", "naver");
    private static final LocalDate DEFAULT_BIRTH_DATE = LocalDate.of(1970, 1, 1);

    private final OAuthService oAuthService;
    private final SocialAccountRepository socialAccountRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final long accessTokenExpirationMs;

    public SocialLoginService(
        OAuthService oAuthService,
        SocialAccountRepository socialAccountRepository,
        UserRepository userRepository,
        JwtUtil jwtUtil,
        @Value("${jwt.expiration_time}") long accessTokenExpirationMs
    ) {
        this.oAuthService = oAuthService;
        this.socialAccountRepository = socialAccountRepository;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.accessTokenExpirationMs = accessTokenExpirationMs;
    }

    public boolean supports(String provider) {
        return provider != null && SOCIAL_PROVIDERS.contains(provider.toLowerCase(Locale.ROOT));
    }

    public SocialLoginResponse login(String provider, String code, String state) {
        String normalizedProvider = normalizeProvider(provider);

        OAuthTokenResponse tokenResponse = oAuthService.exchangeCodeForToken(normalizedProvider, code, state);
        if (tokenResponse == null || tokenResponse.getAccessToken() == null || tokenResponse.getAccessToken().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OAuth token exchange failed");
        }

        JsonNode userInfoJson = oAuthService.fetchUserInfo(normalizedProvider, tokenResponse.getAccessToken());
        SocialUserInfo socialUserInfo = parseUserInfo(normalizedProvider, userInfoJson);

        UserResolution resolution = resolveUser(normalizedProvider, socialUserInfo);
        User user = resolution.user();

        String accessToken = jwtUtil.generateAccessToken(user.getUserId(), user.getEmail());
        String refreshToken = jwtUtil.generateRefreshToken(user.getUserId(), user.getEmail());

        return new SocialLoginResponse(
            user.getUserId(),
            resolution.newUser(),
            accessToken,
            refreshToken,
            "Bearer",
            accessTokenExpirationMs
        );
    }

    private String normalizeProvider(String provider) {
        if (!supports(provider)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported social provider: " + provider);
        }
        return provider.toLowerCase(Locale.ROOT);
    }

    private UserResolution resolveUser(String provider, SocialUserInfo info) {
        return socialAccountRepository.findByProviderAndProviderUserId(provider, info.providerId())
            .map(account -> {
                User user = account.getUser();
                boolean userUpdated = updateExistingUser(user, info, provider);
                if (userUpdated) {
                    user = userRepository.save(user);
                }
                boolean accountUpdated = updateExistingSocialAccount(account, info);
                if (accountUpdated) {
                    socialAccountRepository.save(account);
                }
                return new UserResolution(user, false);
            })
            .orElseGet(() -> findByEmailOrCreateAndLink(provider, info));
    }

    private UserResolution findByEmailOrCreateAndLink(String provider, SocialUserInfo info) {
        String userEmail = info.userEmail();
        return userRepository.findByEmail(userEmail)
            .map(existing -> {
                if (existing.getProfileImageUrl() == null || existing.getProfileImageUrl().isBlank()) {
                    existing.setProfileImageUrl(info.profileImageUrl());
                }
                User saved = userRepository.save(existing);
                linkSocialAccount(saved, provider, info);
                return new UserResolution(saved, false);
            })
            .orElseGet(() -> createUser(provider, info));
    }

    private UserResolution createUser(String provider, SocialUserInfo info) {
        User user = User.builder()
            .email(info.userEmail())
            .password(null)
            .nickname(info.nickname())
            .name(info.name())
            .birthDate(DEFAULT_BIRTH_DATE)
            .profileImageUrl(info.profileImageUrl())
            .build();

        User saved = userRepository.save(user);
        linkSocialAccount(saved, provider, info);
        log.info("Created new social user. userId={} provider={} providerUserId={}", saved.getUserId(), provider, info.providerId());
        return new UserResolution(saved, true);
    }

    private void linkSocialAccount(User user, String provider, SocialUserInfo info) {
        SocialAccount socialAccount = socialAccountRepository
            .findByProviderAndProviderUserId(provider, info.providerId())
            .orElseGet(SocialAccount::new);

        socialAccount.setUser(user);
        socialAccount.setProvider(provider);
        socialAccount.setProviderUserId(info.providerId());
        socialAccount.setEmail(info.email());

        socialAccountRepository.save(socialAccount);
    }

    private boolean updateExistingUser(User user, SocialUserInfo info, String provider) {
        boolean updated = false;
        if (shouldUpdateEmail(user.getEmail(), info.userEmail())) {
            user.setEmail(info.userEmail());
            updated = true;
        }
        if (shouldUpdateNickname(user.getNickname(), info.nickname(), provider)) {
            user.setNickname(info.nickname());
            updated = true;
        }
        if (shouldUpdateName(user.getName(), info.name(), user.getNickname())) {
            user.setName(info.name());
            updated = true;
        }
        if (shouldUpdateProfileImage(user.getProfileImageUrl(), info.profileImageUrl())) {
            user.setProfileImageUrl(info.profileImageUrl());
            updated = true;
        }
        return updated;
    }

    private boolean updateExistingSocialAccount(SocialAccount account, SocialUserInfo info) {
        if (shouldUpdateEmail(account.getEmail(), info.email())) {
            account.setEmail(info.email());
            return true;
        }
        return false;
    }

    private boolean shouldUpdateEmail(String current, String incoming) {
        if (incoming == null || incoming.isBlank() || incoming.endsWith(".local")) {
            return false;
        }
        return current == null || current.isBlank() || current.endsWith(".local");
    }

    private boolean shouldUpdateNickname(String current, String incoming, String provider) {
        if (incoming == null || incoming.isBlank()) {
            return false;
        }
        if (current == null || current.isBlank()) {
            return true;
        }
        return current.startsWith(provider + "_");
    }

    private boolean shouldUpdateName(String current, String incoming, String currentNickname) {
        if (incoming == null || incoming.isBlank()) {
            return false;
        }
        if (current == null || current.isBlank()) {
            return true;
        }
        return currentNickname != null && current.equals(currentNickname);
    }

    private boolean shouldUpdateProfileImage(String current, String incoming) {
        if (incoming == null || incoming.isBlank()) {
            return false;
        }
        return current == null || current.isBlank();
    }

    private SocialUserInfo parseUserInfo(String provider, JsonNode root) {
        return switch (provider) {
            case "google" -> parseGoogle(root);
            case "kakao" -> parseKakao(root);
            case "naver" -> parseNaver(root);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported social provider: " + provider);
        };
    }

    private SocialUserInfo parseGoogle(JsonNode root) {
        String providerId = getText(root, "sub");
        String email = getText(root, "email");
        String name = coalesce(getText(root, "name"), getText(root, "given_name"));
        String nickname = coalesce(getText(root, "given_name"), deriveNickname(email, providerId, "google"));
        String profileImageUrl = getText(root, "picture");
        return finalizeUserInfo("google", providerId, email, name, nickname, profileImageUrl);
    }

    private SocialUserInfo parseKakao(JsonNode root) {
        String providerId = getText(root, "id");

        JsonNode account = root.path("kakao_account");
        JsonNode profile = account.path("profile");

        String email = getText(account, "email");
        String nickname = coalesce(getText(profile, "nickname"), deriveNickname(email, providerId, "kakao"));
        String name = coalesce(getText(account, "name"), nickname);
        String profileImageUrl = coalesce(getText(profile, "profile_image_url"), getText(profile, "thumbnail_image_url"));

        return finalizeUserInfo("kakao", providerId, email, name, nickname, profileImageUrl);
    }

    private SocialUserInfo parseNaver(JsonNode root) {
        JsonNode response = root.path("response");

        String providerId = getText(response, "id");
        String email = getText(response, "email");
        String nickname = coalesce(getText(response, "nickname"), deriveNickname(email, providerId, "naver"));
        String name = coalesce(getText(response, "name"), nickname);
        String profileImageUrl = getText(response, "profile_image");

        return finalizeUserInfo("naver", providerId, email, name, nickname, profileImageUrl);
    }

    private SocialUserInfo finalizeUserInfo(
        String provider,
        String providerId,
        String email,
        String name,
        String nickname,
        String profileImageUrl
    ) {
        if (providerId == null || providerId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Missing provider user id for " + provider);
        }

        String resolvedEmail = normalizeEmail(email);
        String userEmail = resolveUserEmail(provider, providerId, resolvedEmail);

        String resolvedNickname = nickname;
        if (resolvedNickname == null || resolvedNickname.isBlank()) {
            resolvedNickname = deriveNickname(resolvedEmail, providerId, provider);
        }

        String resolvedName = name;
        if (resolvedName == null || resolvedName.isBlank()) {
            resolvedName = resolvedNickname;
        }

        return new SocialUserInfo(providerId, resolvedEmail, userEmail, resolvedName, resolvedNickname, profileImageUrl);
    }

    private String deriveNickname(String email, String providerId, String provider) {
        if (email != null && email.contains("@")) {
            String localPart = email.substring(0, email.indexOf('@'));
            if (!localPart.isBlank()) {
                return localPart;
            }
        }
        return provider + "_" + providerId;
    }

    private String resolveUserEmail(String provider, String providerId, String email) {
        if (email == null || email.isBlank()) {
            return providerId + "@" + provider + ".local";
        }
        String normalized = email.trim();
        String prefix = provider + "_";
        if (normalized.startsWith(prefix)) {
            return normalized;
        }
        return prefix + normalized;
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String trimmed = email.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private String getText(JsonNode node, String field) {
        if (node == null || node.isMissingNode()) {
            return null;
        }
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        String text = value.asText();
        return text == null || text.isBlank() ? null : text;
    }

    @SafeVarargs
    private final <T> T coalesce(T... values) {
        for (T value : values) {
            if (value == null) {
                continue;
            }
            if (value instanceof String s && s.isBlank()) {
                continue;
            }
            return value;
        }
        return null;
    }

    private record SocialUserInfo(
        String providerId,
        String email,
        String userEmail,
        String name,
        String nickname,
        String profileImageUrl
    ) {
        SocialUserInfo {
            Objects.requireNonNull(providerId, "providerId must not be null");
        }
    }

    private record UserResolution(User user, boolean newUser) {
    }
}
