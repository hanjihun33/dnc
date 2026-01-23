package com.djjko.dnc.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AuthLoginResponse {

    private String accessToken;
    private String tokenType;
    private long expiresIn;
}
