package com.djjko.dnc.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AuthSignupResponse {

    private Long userId;
    private String email;
    private String nickname;
}
