package com.djjko.dnc.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
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
