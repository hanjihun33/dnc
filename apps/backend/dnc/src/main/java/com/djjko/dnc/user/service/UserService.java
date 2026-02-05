package com.djjko.dnc.user.service;

import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.auth.repository.OAuthTokenRepository;
import com.djjko.dnc.auth.repository.UserRepository;
import com.djjko.dnc.user.dto.UserHealthUpdateRequest;
import com.djjko.dnc.user.dto.UserPasswordChangeRequest;
import com.djjko.dnc.user.dto.UserProfileResponse;
import com.djjko.dnc.user.dto.UserProfileUpdateRequest;
import com.djjko.dnc.glucose.entity.Sensor;
import com.djjko.dnc.glucose.repository.SensorRepository;
import java.time.LocalDateTime;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;
import com.djjko.dnc.storage.FileStorageService;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final PasswordEncoder passwordEncoder;
    private final SensorRepository sensorRepository;
    private final OAuthTokenRepository oauthTokenRepository;

    public UserService(
            UserRepository userRepository,
            FileStorageService fileStorageService,
            PasswordEncoder passwordEncoder,
            SensorRepository sensorRepository,
            OAuthTokenRepository oauthTokenRepository) {
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
        this.passwordEncoder = passwordEncoder;
        this.sensorRepository = sensorRepository;
        this.oauthTokenRepository = oauthTokenRepository;
    }

    public UserProfileResponse getProfile(Long userId) {
        User user = findUser(userId);
        return toResponse(user);
    }

    public UserProfileResponse updateProfile(Long userId, UserProfileUpdateRequest request) {
        User user = findUser(userId);
        if (request.getNickname() != null) {
            user.setNickname(request.getNickname());
        }
        if (request.getName() != null) {
            user.setName(request.getName());
        }
        if (request.getBirthDate() != null) {
            user.setBirthDate(request.getBirthDate());
        }
        User saved = userRepository.save(user);
        return toResponse(saved);
    }

    public UserProfileResponse updateHealth(Long userId, UserHealthUpdateRequest request) {
        User user = findUser(userId);
        if (request.getDiabetesType() != null) {
            user.setDiabetesType(request.getDiabetesType());
        }
        if (request.getDiagnosisYear() != null) {
            user.setDiagnosisYear(request.getDiagnosisYear());
        }
        if (request.getDiagnosisMonth() != null) {
            user.setDiagnosisMonth(request.getDiagnosisMonth());
        }
        if (request.getGender() != null) {
            user.setGender(request.getGender());
        }
        if (request.getHeightCm() != null) {
            user.setHeightCm(request.getHeightCm());
        }
        if (request.getWeightKg() != null) {
            user.setWeightKg(request.getWeightKg());
        }
        User saved = userRepository.save(user);
        return toResponse(saved);
    }

    public UserProfileResponse updateProfileImage(Long userId, MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Profile image is required");
        }
        User user = findUser(userId);
        String imageUrl = fileStorageService.save(image, "profile");
        user.setProfileImageUrl(imageUrl);
        User saved = userRepository.save(user);
        return toResponse(saved);
    }

    public UserProfileResponse deleteProfileImage(Long userId) {
        User user = findUser(userId);
        String currentUrl = user.getProfileImageUrl();
        if (currentUrl != null && !currentUrl.isBlank()) {
            fileStorageService.deleteByUrl(currentUrl);
        }
        user.setProfileImageUrl(null);
        User saved = userRepository.save(user);
        return toResponse(saved);
    }

    public void deleteAccount(Long userId) {
        User user = findUser(userId);
        String currentUrl = user.getProfileImageUrl();
        if (currentUrl != null && !currentUrl.isBlank()) {
            fileStorageService.deleteByUrl(currentUrl);
        }
        userRepository.delete(user);
    }

    public void changePassword(Long userId, UserPasswordChangeRequest request) {
        User user = findUser(userId);

        if (!"local".equalsIgnoreCase(user.getProvider())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Password change is only available for local accounts");
        }

        if (user.getPassword() == null || !passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current password is incorrect");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "New password must be different from the current password");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private UserProfileResponse toResponse(User user) {
        boolean sensorConnected = isSensorConnected(user);
        return new UserProfileResponse(
                user.getUserId(),
                user.getEmail(),
                user.getNickname(),
                user.getName(),
                user.getBirthDate(),
                user.getDiabetesType(),
                user.getDiagnosisYear(),
                user.getDiagnosisMonth(),
                user.getGender(),
                user.getHeightCm(),
                user.getWeightKg(),
                user.getProfileImageUrl(),
                sensorConnected,
                user.getProvider());
    }

    private boolean isSensorConnected(User user) {
        boolean hasActiveSensor = sensorRepository
                .findFirstByUserAndStatusOrderByStartedAtDesc(user, Sensor.SensorStatus.ACTIVE)
                .map(sensor -> {
                    LocalDateTime startedAt = sensor.getStartedAt();
                    if (startedAt == null)
                        return false;
                    LocalDateTime now = LocalDateTime.now();
                    if (now.isBefore(startedAt))
                        return false;
                    LocalDateTime endedAt = sensor.getEndedAt();
                    return endedAt == null || !now.isAfter(endedAt);
                })
                .orElse(false);
        if (hasActiveSensor) {
            return true;
        }

        return oauthTokenRepository.findByUserUserIdAndProvider(user.getUserId(), "dexcom")
                .map(token -> {
                    String accessToken = token.getAccessToken();
                    String refreshToken = token.getRefreshToken();
                    return (accessToken != null && !accessToken.isBlank())
                            || (refreshToken != null && !refreshToken.isBlank());
                })
                .orElse(false);
    }
}
