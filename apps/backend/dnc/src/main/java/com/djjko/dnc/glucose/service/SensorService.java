package com.djjko.dnc.glucose.service;

import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.auth.repository.UserRepository;
import com.djjko.dnc.glucose.dto.SensorResponse;
import com.djjko.dnc.glucose.entity.Sensor;
import com.djjko.dnc.glucose.repository.SensorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SensorService {

    private final SensorRepository sensorRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Optional<SensorResponse> getActiveSensor(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Optional<Sensor> activeSensor = sensorRepository.findByUserAndStatus(user, Sensor.SensorStatus.ACTIVE);
        if (activeSensor.isPresent()) {
            return activeSensor.map(SensorResponse::from);
        }
        return sensorRepository.findByUserAndStatus(user, Sensor.SensorStatus.PENDING)
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
    public

    void createPendingSensor(User user) {
        boolean hasActiveOrPending = sensorRepository.findByUserAndStatus(user, Sensor.SensorStatus.ACTIVE).isPresent()
                || sensorRepository.findByUserAndStatus(user, Sensor.SensorStatus.PENDING).isPresent();

        if (hasActiveOrPending) {
            return;
        }

        Sensor sensor = Sensor.builder()
                .user(user)
                .status(Sensor.SensorStatus.PENDING)
                .provider("Dexcom")
                .startedAt(java.time.LocalDateTime.now())
                .build();
        sensorRepository.save(sensor);
    }
}
