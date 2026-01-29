package com.djjko.dnc.ai.gemini.service;

import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.meal.domain.FoodRecord;
import java.time.format.DateTimeFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiFoodGuideService {

    private final GeminiService geminiService;

    public String generateGuide(User user, FoodRecord foodRecord, String foodListString, String nutritionSummary) {
        String prompt = buildPrompt(user, foodRecord, foodListString, nutritionSummary);
        return geminiService.generateContent(prompt);
    }

    private String buildPrompt(User user, FoodRecord record, String foodListString, String nutritionSummary) {
        StringBuilder sb = new StringBuilder();

        sb.append("너는 당뇨 환자용 영양 코치다.\n");
        sb.append("아래 정보만 근거로 한국어로 매우 짧게 답하라.\n");
        sb.append("형식은 정확히 3줄, 각 줄 1문장, 총 220자 이내.\n");
        sb.append("각 줄은 '먹는 순서:', '영양 밸런스:', '건강 팁:' 으로 시작.\n");
        sb.append("인사, 서론, 결론, 구분선, 이모지, 마크다운 금지.\n");
        sb.append("과장 금지, 실천 가능한 조언만.\n");
        sb.append("메뉴/메모/영양 요약에 없는 재료나 반찬을 추정하지 말 것.\n");
        sb.append("확실하지 않으면 '채소가 있다면'처럼 조건부로 표현.\n\n");

        sb.append("[사용자]\n");
        sb.append("나이/성별: ").append(getAge(user)).append("세/").append(user.getGender()).append("\n");
        sb.append("당뇨 유형: ").append(user.getDiabetesType()).append("\n\n");

        sb.append("[식사]\n");
        sb.append("시간: ").append(record.getEatenAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))).append("\n");
        sb.append("식사 유형: ").append(record.getMealType()).append("\n");
        sb.append("메뉴: ").append(foodListString).append("\n");
        if (record.getMemo() != null && !record.getMemo().isBlank()) {
            sb.append("메모: ").append(record.getMemo()).append("\n");
        }
        sb.append("\n");

        sb.append("[영양 요약]\n");
        sb.append(nutritionSummary).append("\n");

        return sb.toString();
    }

    private int getAge(User user) {
        if (user.getBirthDate() == null) {
            return 0;
        }
        return java.time.LocalDate.now().getYear() - user.getBirthDate().getYear();
    }
}
