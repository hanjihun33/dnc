package com.djjko.dnc.alert.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;

public enum AlertType {
    HIGH("high"),
    LOW("low"),
    VERY_LOW("very-low"),
    URGENT_LOW("urgent-low"),
    RAPID_RISE("rapid-rise");

    private final String code;

    AlertType(String code) {
        this.code = code;
    }

    @JsonValue
    public String getCode() {
        return code;
    }

    @JsonCreator
    public static AlertType fromCode(String code) {
        if (code == null) {
            return null;
        }
        return Arrays.stream(values())
                .filter(type -> type.code.equalsIgnoreCase(code))
                .findFirst()
                .orElse(null);
    }
}
