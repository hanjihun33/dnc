package com.djjko.dnc.user.dto;

import java.math.BigDecimal;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Getter;
import com.djjko.dnc.user.model.DiabetesType;

@Getter
@AllArgsConstructor
public class UserProfileResponse {

    @Schema(example = "1")
    private Long userId;
    @Schema(example = "user@example.com")
    private String email;
    @Schema(example = "닉네임")
    private String nickname;
    @Schema(example = "홍길동")
    private String name;
    @Schema(example = "1995-03-21")
    private LocalDate birthDate;
    @Schema(example = "TYPE1")
    private DiabetesType diabetesType;
    @Schema(example = "2012")
    private Integer diagnosisYear;
    @Schema(example = "3")
    private Integer diagnosisMonth;
    @Schema(example = "FEMALE")
    private String gender;
    @Schema(example = "165.2")
    private BigDecimal heightCm;
    @Schema(example = "54.7")
    private BigDecimal weightKg;
    @Schema(example = "https://example.com/profile.jpg")
    private String profileImageUrl;
    @Schema(example = "true")
    private Boolean sensorConnected;
    @Schema(example = "local")
    private String provider;
}
