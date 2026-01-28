package com.djjko.dnc.alert.repository;

import com.djjko.dnc.alert.entity.UserAlertSetting;
import com.djjko.dnc.alert.model.AlertType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAlertSettingRepository extends JpaRepository<UserAlertSetting, Long> {
    List<UserAlertSetting> findByUser_UserId(Long userId);

    Optional<UserAlertSetting> findByUser_UserIdAndAlertType(Long userId, AlertType alertType);
}
