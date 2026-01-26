package com.djjko.dnc.glucose.scheduler;

import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.auth.repository.UserRepository;
import com.djjko.dnc.glucose.service.CgmPipelineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class CgmScheduler {

    private final CgmPipelineService cgmPipelineService;
    private final UserRepository userRepository;

    //  5분(300,000ms)마다 실행 (덱스콤 새 데이터가 5분마다 나옴)
    @Scheduled(fixedRate = 300000)
    public void autoFetchAndSave() {
        log.info("[실시간] 5분 주기 데이터 수집 시작...");

        // 1. DB에 있는 모든 유저 가져오기
        List<User> users = userRepository.findAll();

        for (User user : users) {
            cgmPipelineService.fetchLatestDataForUser(user);
        }
        log.info("[실시간] 5분 주기 데이터 수집 종료.");
    }
}