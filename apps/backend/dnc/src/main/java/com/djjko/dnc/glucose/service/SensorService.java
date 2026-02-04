package com.djjko.dnc.glucose.service;

import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.auth.repository.UserRepository;
import com.djjko.dnc.glucose.dto.SensorResponse;
import com.djjko.dnc.glucose.entity.Sensor;
import com.djjko.dnc.glucose.repository.SensorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SensorService {

    private final SensorRepository sensorRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Optional<SensorResponse> getActiveSensor(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Optional<Sensor> activeSensor = sensorRepository.findFirstByUserAndStatusOrderByStartedAtDesc(user,
                Sensor.SensorStatus.ACTIVE);
        if (activeSensor.isPresent()) {
            return activeSensor.map(SensorResponse::from);
        }
        return sensorRepository.findFirstByUserAndStatusOrderByStartedAtDesc(user, Sensor.SensorStatus.PENDING)
                .map(SensorResponse::from);
    }

    @Transactional(readOnly = true)
    public java.util.List<SensorResponse> getSensorHistory(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return sensorRepository.findAllByUserOrderByStartedAtDesc(user)
                .stream()
                .map(SensorResponse::from)
                .toList();
    }

    @Transactional
    public void createPendingSensor(User user) {
        // [Refactoring] 기존에 존재하던 ACTIVE나 PENDING 센서가 있다면 모두 은퇴(INACTIVE) 처리
        // 재연동 시 무조건 새로운 '예열 중' 상태를 보여주기 위함입니다.
        java.util.List<Sensor> existingSensors = sensorRepository.findAllByUser(user).stream()
                .filter(s -> s.getStatus() == Sensor.SensorStatus.ACTIVE
                        || s.getStatus() == Sensor.SensorStatus.PENDING)
                .toList();

        if (!existingSensors.isEmpty()) {
            java.time.LocalDateTime now = java.time.LocalDateTime.now();
            existingSensors.forEach(s -> {
                s.changeStatus(Sensor.SensorStatus.INACTIVE);
                s.updateEndedAt(now);
            });
            sensorRepository.saveAllAndFlush(existingSensors);
            log.info("기존 센서 {}개 은퇴 처리 완료 (User {})", existingSensors.size(), user.getUserId());
        }

        Sensor sensor = Sensor.builder()
                .user(user)
                .status(Sensor.SensorStatus.PENDING)
                .provider("Dexcom")
                .startedAt(java.time.LocalDateTime.now())
                .build();
        sensorRepository.save(sensor);
        log.info("새로운 PENDING 센서 생성 완료 (User {})", user.getUserId());
    }
}
