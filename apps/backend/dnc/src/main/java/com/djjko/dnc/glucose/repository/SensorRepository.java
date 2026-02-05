package com.djjko.dnc.glucose.repository;

import com.djjko.dnc.glucose.entity.Sensor;
import com.djjko.dnc.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SensorRepository extends JpaRepository<Sensor, Long> {
    // 기기 시리얼 번호로 센서 찾기
    Optional<Sensor> findByDeviceId(String deviceId);

    // 특정 유저의 활성 상태인 센서 중 가장 최근 것 찾기
    java.util.Optional<Sensor> findFirstByUserAndStatusOrderByStartedAtDesc(User user, Sensor.SensorStatus status);

    java.util.Optional<Sensor> findFirstByUserAndDeviceIdAndStatusOrderByStartedAtDesc(User user, String deviceId,
            Sensor.SensorStatus status);

    Optional<Sensor> findByDeviceIdAndStatus(String deviceId, Sensor.SensorStatus status);

    Optional<Sensor> findByUserAndDeviceId(User user, String deviceId);

    List<Sensor> findAllByUserAndStatus(User user, Sensor.SensorStatus status);

    List<Sensor> findAllByUser(User user);

    void deleteAllByUser_UserId(Long userId);

    List<Sensor> findAllByUserOrderByStartedAtDesc(User user);

    Optional<Sensor> findByUserAndDeviceIdAndStatus(User user, String deviceId, Sensor.SensorStatus status);

    // [New] 모든 활성 센서 조회 (배치용)
    List<Sensor> findAllByStatus(Sensor.SensorStatus status);
}
