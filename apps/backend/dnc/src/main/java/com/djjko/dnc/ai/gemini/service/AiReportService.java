package com.djjko.dnc.ai.gemini.service;

import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.report.dto.GlucoseReportDto;
import com.djjko.dnc.report.dto.GlucoseReportDto.TimeInRangeDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiReportService {

    private final GeminiService geminiService;

    public String generateAnalysis(User user, GlucoseReportDto report) {
        if (report.getRecordCount() == 0) {
            return "분석할 혈당 데이터가 없습니다. 혈당을 꾸준히 기록해보세요!";
        }

        String prompt = buildPrompt(user, report);
        return geminiService.generateContent(prompt);
    }

    private String buildPrompt(User user, GlucoseReportDto report) {
        StringBuilder sb = new StringBuilder();

        // 1. 역할 부여
        sb.append("당신은 내분비내과 전문의입니다. 사용자의 혈당 데이터를 분석하고, 환자에게 따뜻하고 구체적인 건강 조언을 해주세요.\n");
        sb.append("말투는 '해요체'로 정중하고 친절하게 작성해주세요. (예: 점심 식후 혈당이 조금 높네요.)\n\n");

        // 2. 환자 정보
        sb.append("=== 환자 정보 ===\n");
        sb.append("- 이름(닉네임): ").append(user.getNickname()).append("\n");
        sb.append("- 당뇨 유형: ").append(user.getDiabetesType()).append("\n");
        sb.append("- 나이/성별: ").append(user.getBirthDate()).append("생, ").append(user.getGender()).append("\n");
        if (user.getDiagnosisYear() != null) {
            sb.append("- 진단 시기: ").append(user.getDiagnosisYear()).append("년\n");
        }
        sb.append("\n");

        // 3. 혈당 리포트 데이터
        sb.append("=== 혈당 분석 데이터 (").append(report.getPeriod()).append(") ===\n");
        sb.append("- 기간: ").append(report.getStartDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")))
                .append(" ~ ").append(report.getEndDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")))
                .append("\n");
        sb.append("- 총 기록 수: ").append(report.getRecordCount()).append("회\n");
        sb.append("- 평균 혈당: ").append(report.getAverageGlucose()).append(" mg/dL\n");
        sb.append("- 표준 편차: ").append(String.format("%.1f", report.getStandardDeviation())).append("\n");
        sb.append("- 최고/최저: ").append(report.getMaxGlucose()).append(" / ").append(report.getMinGlucose()).append("\n");

        TimeInRangeDto tir = report.getTimeInRange();
        if (tir != null) {
            sb.append("\n[Time In Range 상태]\n");
            sb.append("- 저혈당 위험 (Very Low + Low): ")
                    .append(String.format("%.1f", tir.getVeryLowPercent() + tir.getLowPercent())).append("%\n");
            sb.append("- 정상 범위 (In Range): ").append(String.format("%.1f", tir.getInRangePercent())).append("%\n");
            sb.append("- 고혈당 주의 (High + Very High): ")
                    .append(String.format("%.1f", tir.getHighPercent() + tir.getVeryHighPercent())).append("%\n");
        }

        // 4. 요청 사항
        sb.append("\n=== 요청 사항 ===\n");
        sb.append("위 정보를 바탕으로 다음 3가지 항목으로 구성된 리포트를 작성해주세요.\n");
        sb.append("1. 📊 [전체적인 평가]: 이번 기간 혈당 흐름에 대한 총평\n");
        sb.append("2. ⚠️ [주의할 점]: 스파이크나 저혈당 위험성 등 발견된 문제점\n");
        sb.append("3. 💡 [실천 가이드]: 식사, 운동, 수면 등 구체적으로 실천할 수 있는 1가지 행동 제안\n");

        return sb.toString();
    }
}
