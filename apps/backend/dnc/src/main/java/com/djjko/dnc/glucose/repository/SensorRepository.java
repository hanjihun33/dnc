package com.djjko.dnc.glucose.repository;

import com.djjko.dnc.glucose.entity.Sensor;
import com.djjko.dnc.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SensorRepository extends JpaRepository<Sensor, Long> {
    // 기기 시리얼 번호로 센서 찾기
    Optional<Sensor> findByDeviceId(String deviceId);

    // 특정 유저의 활성 상태인 센서 찾기
    Optional<Sensor> findByUserAndStatus(User user, Sensor.SensorStatus status);

    Optional<Sensor> findByDeviceIdAndStatus(String deviceId, Sensor.SensorStatus status);

    List<Sensor> findAllByUserAndStatus(User user, Sensor.SensorStatus status);

    List<Sensor> findAllByUser(User user);

    void deleteAllByUser_UserId(Long userId);
}
