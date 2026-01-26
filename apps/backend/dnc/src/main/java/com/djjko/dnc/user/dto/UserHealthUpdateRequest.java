package com.djjko.dnc.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import com.djjko.dnc.user.model.DiabetesType;

@Getter
@Setter
public class UserHealthUpdateRequest {

    @Schema(example = "TYPE1")
    private DiabetesType diabetesType;

    @Schema(example = "2012")
    @Min(1900)
    @Max(2100)
    private Integer diagnosisYear;

    @Schema(example = "3")
    @Min(1)
    @Max(12)
    private Integer diagnosisMonth;

    @Schema(example = "FEMALE")
    @Size(max = 20)
    private String gender;

    @Schema(example = "165.2")
    @DecimalMin(value = "0.0", inclusive = false)
    @DecimalMax("300.0")
    private BigDecimal heightCm;

    @Schema(example = "54.7")
    @DecimalMin(value = "0.0", inclusive = false)
    @DecimalMax("500.0")
    private BigDecimal weightKg;
}
