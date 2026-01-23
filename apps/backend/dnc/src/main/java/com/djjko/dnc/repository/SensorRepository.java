package com.djjko.dnc.repository;

import com.djjko.dnc.entity.Sensor;
import com.djjko.dnc.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SensorRepository extends JpaRepository<Sensor, Long> {
    // 기기 시리얼 번호로 센서 찾기
    Optional<Sensor> findByDeviceId(String deviceId);
    // 특정 유저의 활성 상태인 센서 찾기
    Optional<Sensor> findByUserAndStatus(User user, Sensor.SensorStatus status);
    Optional<Sensor> findByDeviceIdAndStatus(String deviceId, Sensor.SensorStatus status);
}