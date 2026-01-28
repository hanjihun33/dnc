package com.djjko.dnc.ai.gemini.service;

import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.meal.domain.FoodRecord;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiFoodGuideService {

    private final GeminiService geminiService;

    // TODO: FoodMetadata나 영양 성분을 가져오는 로직이 필요하다면 여기에 주입해야 합니다.
    // 현재는 FoodRecord와 User 정보만으로 간단히 프롬프트를 구성합니다.

    public String generateGuide(User user, FoodRecord foodRecord, String foodListString, String nutritionSummary) {
        String prompt = buildPrompt(user, foodRecord, foodListString, nutritionSummary);
        return geminiService.generateContent(prompt);
    }

    private String buildPrompt(User user, FoodRecord record, String foodListString, String nutritionSummary) {
        StringBuilder sb = new StringBuilder();

        // 1. 역할 정의
        sb.append("당신은 당뇨 환자를 위한 전문 영양 코치입니다.\n");
        sb.append("아래 제공된 사용자 정보와 섭취한 음식 데이터를 분석하여, 혈당 관리에 도움이 되는 현실적이고 따뜻한 피드백을 제공해주세요.\n\n");

        // 2. 사용자 정보
        sb.append("=== 1. 사용자 정보 ===\n");
        sb.append("- 나이/성별: ").append(getAge(user)).append("세 / ").append(user.getGender()).append("\n");
        sb.append("- 당뇨 유형: ").append(user.getDiabetesType()).append("\n");
        // TODO: 최근 특이사항(저혈당 이력 등)이 있다면 추가
        sb.append("\n");

        // 3. 식사 정보
        sb.append("=== 2. 식사 정보 ===\n");
        sb.append("- 식사 시간: ").append(record.getEatenAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")))
                .append("\n");
        sb.append("- 식사 유형: ").append(record.getMealType()).append("\n");
        sb.append("- 기록된 메뉴:\n").append(foodListString).append("\n");
        if (record.getMemo() != null && !record.getMemo().isBlank()) {
            sb.append("- 메모: ").append(record.getMemo()).append("\n");
        }
        sb.append("\n");

        // 4. 영양 성분 (전달받은 문자열 사용)
        sb.append("=== 3. 영양 성분 (추정치) ===\n");
        sb.append(nutritionSummary).append("\n\n");

        // 5. 코칭 가이드라인
        sb.append("=== 4. 코칭 가이드라인 ===\n");
        sb.append("다음 3가지 항목으로 답변을 구성해주세요.\n");
        sb.append(
                "1. 🥗 [먹는 순서 가이드]: 혈당 스파이크를 방지하기 위해 이번 식단에서 가장 먼저 섭취해야 할 음식과 순서를 구체적으로 알려주세요. (예: 채소 -> 단백질 -> 탄수화물 순서)\n");
        sb.append("2. ⚖️ [영양 밸런스 평가]: 탄단지 비율 관점에서 식단의 잘한 점과 보완할 점.\n");
        sb.append("3. 💡 [건강 팁]: 식후 운동이나 수분 섭취 등 가벼운 실천 팁 1가지.\n\n");
        sb.append("답변은 존댓말(해요체)로 부드럽게 작성해주시고, '혈당 예측' 내용은 제외해주세요.");

        return sb.toString();
    }

    private int getAge(User user) {
        if (user.getBirthDate() == null)
            return 0;
        return java.time.LocalDate.now().getYear() - user.getBirthDate().getYear();
    }
}
