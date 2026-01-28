package com.djjko.dnc.ai.gemini.dto;

import lombok.Builder;
import lombok.Getter;
import java.util.List;

@Getter
@Builder
public class GeminiRequest {
    private List<Content> contents;

    @Getter
    @Builder
    public static class Content {
        private List<Part> parts;
    }

    @Getter
    @Builder
    public static class Part {
        private String text;
    }

    public static GeminiRequest create(String prompt) {
        return GeminiRequest.builder()
                .contents(List.of(
                        Content.builder()
                                .parts(List.of(Part.builder().text(prompt).build()))
                                .build()))
                .build();
    }
}
