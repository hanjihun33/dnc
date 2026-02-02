package com.djjko.dnc.push.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;

public enum PushPlatform {
    ANDROID("android"),
    IOS("ios"),
    WEB("web");

    private final String code;

    PushPlatform(String code) {
        this.code = code;
    }

    @JsonValue
    public String getCode() {
        return code;
    }

    @JsonCreator
    public static PushPlatform fromCode(String code) {
        if (code == null) {
            return null;
        }
        return Arrays.stream(values())
                .filter(platform -> platform.code.equalsIgnoreCase(code))
                .findFirst()
                .orElse(null);
    }
}
