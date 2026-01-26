package com.djjko.dnc.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AuthSignupRequest {

    @Email
    @NotBlank
    private String email;

    @NotBlank
    @Size(min = 8, max = 72)
    private String password;

    @NotBlank
    @Size(max = 50)
    private String nickname;

    @NotBlank
    @Size(max = 100)
    private String name;

    @NotNull
    @Past
    private LocalDate birthDate;
}
