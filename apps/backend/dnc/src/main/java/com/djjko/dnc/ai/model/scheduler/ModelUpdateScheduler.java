package com.djjko.dnc.ai.model.scheduler;

import com.djjko.dnc.ai.model.service.ModelUpdateService;
import java.time.LocalDate;
import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ModelUpdateScheduler {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private final ModelUpdateService modelUpdateService;

    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Seoul")
    public void updateDaily() {
        LocalDate today = LocalDate.now(KST);
        log.info("[모델 업데이트] 사용자별 3개월 데이터 전송 시작 (기준일={})", today);
        modelUpdateService.updateAllUsersLastThreeMonths(today);
        log.info("[모델 업데이트] 사용자별 3개월 데이터 전송 종료 (기준일={})", today);
    }
}
