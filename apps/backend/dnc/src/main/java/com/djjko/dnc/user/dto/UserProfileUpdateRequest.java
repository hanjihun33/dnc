package com.djjko.dnc.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserProfileUpdateRequest {

    @Schema(example = "닉네임")
    @Size(max = 50)
    private String nickname;

    @Schema(example = "홍길동")
    @Size(max = 100)
    private String name;

    @Schema(example = "1995-03-21")
    @Past
    private LocalDate birthDate;
}
