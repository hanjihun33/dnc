package com.djjko.dnc.push.dto;

import com.djjko.dnc.push.model.PushPlatform;
import lombok.Getter;

@Getter
public class PushTokenRequest {
    private String token;
    private PushPlatform platform;
}
