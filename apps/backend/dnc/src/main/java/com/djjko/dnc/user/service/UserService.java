package com.djjko.dnc.user.service;

import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.auth.repository.UserRepository;
import com.djjko.dnc.user.dto.UserHealthUpdateRequest;
import com.djjko.dnc.user.dto.UserProfileResponse;
import com.djjko.dnc.user.dto.UserProfileUpdateRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
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


    private User findUser(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private UserProfileResponse toResponse(User user) {
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
            user.getProfileImageUrl()
        );
    }
}
