package com.djjko.dnc.ai.gemini.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import java.util.List;

@Getter
@NoArgsConstructor
public class GeminiResponse {
    private List<Candidate> candidates;

    @Getter
    @NoArgsConstructor
    public static class Candidate {
        private Content content;
        private String finishReason;
    }

    @Getter
    @NoArgsConstructor
    public static class Content {
        private List<Part> parts;
        private String role;
    }

    @Getter
    @NoArgsConstructor
    public static class Part {
        private String text;
    }

    // 편의 메서드: 첫 번째 응답 텍스트 추출
    public String getText() {
        if (candidates == null || candidates.isEmpty())
            return "";
        Candidate first = candidates.get(0);
        if (first.getContent() == null || first.getContent().getParts() == null
                || first.getContent().getParts().isEmpty()) {
            return "";
        }
        return first.getContent().getParts().get(0).getText();
    }
}
