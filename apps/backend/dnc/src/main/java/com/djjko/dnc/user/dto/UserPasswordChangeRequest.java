package com.djjko.dnc.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserPasswordChangeRequest {

    @Schema(example = "oldPassword123!")
    @NotBlank
    private String currentPassword;

    @Schema(example = "newPassword123!")
    @NotBlank
    @Size(min = 8, max = 100)
    private String newPassword;
}

