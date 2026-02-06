package com.djjko.dnc.glucose.service;

import com.djjko.dnc.auth.dto.response.OAuthTokenResponse;
import com.djjko.dnc.auth.entity.OAuthToken;
import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.auth.repository.UserRepository;
import com.djjko.dnc.auth.service.oauth.OAuthService;
import com.djjko.dnc.auth.service.oauth.OAuthTokenService;
import com.djjko.dnc.alert.service.GlucoseAlertService;
import com.djjko.dnc.glucose.client.DexcomApiClient;
import com.djjko.dnc.glucose.dto.DexcomResponse;
import com.djjko.dnc.glucose.entity.GlucoseData;
import com.djjko.dnc.glucose.entity.Sensor;
import com.djjko.dnc.glucose.repository.SensorRepository;
import com.djjko.dnc.report.repository.GlucoseDataRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CgmPipelineService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final UserRepository userRepository;
    private final SensorRepository sensorRepository;
    private final GlucoseDataRepository glucoseDataRepository;
    private final ObjectMapper objectMapper;
    private final DexcomApiClient dexcomApiClient;
    private final OAuthTokenService oAuthTokenService;
    private final OAuthService oAuthService;
    private final GlucoseAlertService glucoseAlertService;

    // API 호출을 위한 함수형 인터페이스 정의
    @FunctionalInterface
    interface DexcomApiCall<R> {
        R execute(String accessToken) throws HttpClientErrorException;
    }

    /**
     * 토큰 갱신을 포함한 API 호출 래퍼
     * 
     * @param user    API를 호출할 사용자
     * @param apiCall 실행할 API 호출 람다식
     * @return API 호출 결과
     */
    private <T> T executeWithTokenRefresh(User user, DexcomApiCall<T> apiCall) {
        OAuthToken token = oAuthTokenService.getToken(user, "dexcom");
        try {
            // 1. 첫 번째 시도
            return apiCall.execute(token.getAccessToken());
        } catch (HttpClientErrorException.Unauthorized e) {
            log.warn("토큰 만료 (User: {}). 갱신 시도...", user.getNickname());
            try {
                // 2. 토큰 갱신
                OAuthTokenResponse newTokens = oAuthService.refreshToken("dexcom", token.getRefreshToken());
                oAuthTokenService.saveToken(user, "dexcom", newTokens);
                log.info("토큰 갱신 완료. API 호출 재시도...");

                // 3. 갱신된 토큰으로 재시도
                return apiCall.execute(newTokens.getAccessToken());
            } catch (Exception refreshEx) {
                log.error("토큰 갱신 또는 API 재시도 실패 (User: {}): {}", user.getNickname(), refreshEx.getMessage());
                throw new RuntimeException("토큰 갱신 후 API 호출에 실패했습니다.", refreshEx);
            }
        }
    }

    /**
     * 스케줄러가 호출할 실시간 데이터 수집 메서드
     */
    @Transactional
    public void fetchLatestDataForUser(User user) {
        if (user.getDexcomUserId() == null || user.getDexcomUserId().isBlank()) {
            return; // 연동 안 된 유저는 건너뜀
        }

        LocalDateTime now = LocalDateTime.now();
        // [변경] 너무 좁은 윈도우는 데이터를 놓칠 수 있어 3시간~현재로 가동 범위를 설정합니다.
        // 중복 체크 로직이 있으므로 안전하게 최근 데이터를 가져옵니다.
        LocalDateTime startPoint = now.minusHours(3);
        LocalDateTime endPoint = now;

        try {
            DexcomResponse egvResponse = executeWithTokenRefresh(user,
                    (token) -> dexcomApiClient.getEgvs(token, startPoint, endPoint));

            if (egvResponse != null && egvResponse.getRecords() != null && !egvResponse.getRecords().isEmpty()) {
                log.info("   -> [혈당] {}건 수집됨 - Redis 버퍼링 및 DB 동기화 시작 (User: {})", egvResponse.getRecords().size(),
                        user.getNickname());
                this.bufferCgmData(user, egvResponse);
                this.syncBufferToDb(user, true);
            } else {
                log.info("   -> [혈당] 새로운 데이터 없음 (User: {})", user.getNickname());
            }
        } catch (Exception e) {
            log.error("실시간 데이터 수집 중 사용자 {} 처리 실패: {}", user.getUserId(), e.getMessage());
        }
    }

    /**
     * 컨트롤러가 호출할 과거 데이터 수집 메서드
     */
    public String fetchHistoricalData(Long userId, int days) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("에러: 유저 없음 " + userId));

        OAuthToken oauthToken = oAuthTokenService.getToken(user, "dexcom");
        if (oauthToken.getRefreshToken() == null) {
            return "에러: Dexcom 계정이 연동되지 않았습니다.";
        }

        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusDays(days);
        LocalDateTime current = start;
        int totalEgvCount = 0;

        log.info("과거 데이터 수집 시작 (ID: {}): {} ~ {}", userId, start, end);

        while (current.isBefore(end)) {
            LocalDateTime next = current.plusDays(30); // 30일씩 끊어서 요청
            if (next.isAfter(end))
                next = end;

            try {
                log.info("구간 수집 중: {} ~ {}", current, next);
                final LocalDateTime currentRequestStart = current;
                final LocalDateTime currentRequestEnd = next;

                DexcomResponse egvResponse = executeWithTokenRefresh(user,
                        (token) -> dexcomApiClient.getEgvs(token, currentRequestStart, currentRequestEnd));

                if (egvResponse != null && egvResponse.getRecords() != null) {
                    this.bufferCgmData(user, egvResponse);
                    this.syncBufferToDb(user, false);
                    totalEgvCount += egvResponse.getRecords().size();
                }

            } catch (Exception e) {
                log.error("과거 데이터 수집 중 오류 발생 (User: {}, 구간: {}~{}): {}", user.getUserId(), current, next,
                        e.getMessage());
                // 한 구간 실패 시 다음 구간으로 계속 진행
            }

            current = next;
            try {
                Thread.sleep(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } // 대기
        }

        return String.format("완료! 총 %d건의 혈당 데이터가 저장되었습니다.", totalEgvCount);
    }

    /**
     * 1. 덱스콤 API 데이터를 Redis 버퍼에 저장 (User별 격리)
     */
    public void bufferCgmData(User user, DexcomResponse response) {
        String userId = String.valueOf(user.getUserId()); // 내부 UserID 사용 (격리 핵심)
        List<DexcomResponse.Record> records = response.getRecords();

        if (records == null || records.isEmpty())
            return;

        String redisKey = "cgm:buffer:" + userId;

        for (DexcomResponse.Record record : records) {
            redisTemplate.opsForList().rightPush(redisKey, record);
        }
        log.info("Redis 버퍼링 완료: User(ID={}), Count={}건", userId, records.size());
    }

    /**
     * 2. Redis -> MySQL 동기화 실행 (트랜잭션 관리) - User별 큐 처리
     */
    @Transactional
    public void syncBufferToDb(User user, boolean evaluateAlerts) {
        String userId = String.valueOf(user.getUserId());
        String redisKey = "cgm:buffer:" + userId;
        long count = 0;
        long skipped = 0;

        while (true) {
            Object data = redisTemplate.opsForList().leftPop(redisKey);
            if (data == null)
                break;

            DexcomResponse.Record record = objectMapper.convertValue(data, DexcomResponse.Record.class);
            if (saveOneRecordToDb(user, record, evaluateAlerts)) {
                count++;
            } else {
                skipped++;
            }
        }
        log.info("DB 동기화 완료 (User ID={}): 저장 {}건 / 스킵 {}건", user.getUserId(), count, skipped);
    }

    /**
     * 3. 단일 혈당 레코드 저장 (User 격리 저장)
     */
    public boolean saveOneRecordToDb(User user, DexcomResponse.Record record, boolean evaluateAlerts) {
        // 중복 데이터 방지 (User + RecordID 복합 체크)
        if (glucoseDataRepository.existsByUser_UserIdAndDexcomRecordId(user.getUserId(), record.getRecordId())) {
            // log.info("중복 데이터 스킵 (User {}, Record {})", user.getUserId(),
            // record.getRecordId());
            return false;
        }

        // 활성 센서 찾기 또는 교체 로직
        Sensor sensor = getOrRotateSensor(user, record);

        // 엔티티 변환 및 저장
        GlucoseData glucoseData = record.toEntity(user, sensor);
        glucoseDataRepository.save(glucoseData);

        if (evaluateAlerts) {
            try {
                glucoseAlertService.evaluate(user, glucoseData);
            } catch (Exception e) {
                log.warn("혈당 알림 처리 실패 (User: {}): {}", user.getNickname(), e.getMessage());
            }
        }
        return true;
    }

    private Sensor getOrRotateSensor(User user, DexcomResponse.Record record) {
        String incomingDeviceId = record.getTransmitterId();
        LocalDateTime now = LocalDateTime.now();

        // 현재 ACTIVE 상태인 동일 기기 확인 (User 조건 추가)
        return sensorRepository
                .findFirstByUserAndDeviceIdAndStatusOrderByStartedAtDesc(user, incomingDeviceId,
                        Sensor.SensorStatus.ACTIVE)
                .map(activeSensor -> {
                    // [Self-Healing] 혹시라도 ACTIVE 센서가 여러 개라면 정리
                    java.util.List<Sensor> activeSensors = sensorRepository.findAllByUserAndStatus(user,
                            Sensor.SensorStatus.ACTIVE);
                    if (activeSensors.size() > 1) {
                        log.info("중복 ACTIVE 센서 발견 ({}개), 자가 치유 시작: User {}", activeSensors.size(), user.getUserId());
                        activeSensors.stream()
                                .filter(s -> !s.getSensorId().equals(activeSensor.getSensorId()))
                                .forEach(s -> {
                                    s.changeStatus(Sensor.SensorStatus.INACTIVE);
                                    s.updateEndedAt(now);
                                });
                        sensorRepository.saveAll(activeSensors);
                    }

                    if (activeSensor.getStartedAt() == null || activeSensor.getEndedAt() == null) {
                        LocalDateTime start = activeSensor.getStartedAt() != null
                                ? activeSensor.getStartedAt()
                                : now;
                        LocalDateTime end = activeSensor.getEndedAt() != null
                                ? activeSensor.getEndedAt()
                                : start.plusDays(9);
                        activeSensor.updatePeriod(start, end);
                        return sensorRepository.save(activeSensor);
                    }
                    return activeSensor;
                })
                .orElseGet(() -> {
                    // [Added] PENDING 상태 센서가 있다면 활성화
                    java.util.Optional<Sensor> pendingSensor = sensorRepository
                            .findFirstByUserAndStatusOrderByStartedAtDesc(user,
                                    Sensor.SensorStatus.PENDING);
                    if (pendingSensor.isPresent()) {
                        Sensor sensor = pendingSensor.get();
                        log.info("PENDING 센서 활성화: User {}, Device {}", user.getUserId(), incomingDeviceId);
                        sensor.activate(incomingDeviceId);
                        return sensorRepository.save(sensor);
                    }

                    log.info("새로운 센서 연결 또는 재연결 감지: {}", incomingDeviceId);

                    // 기존 활성 센서가 있다면 은퇴 처리 (기기 변경 등의 경우)
                    sensorRepository.findFirstByUserAndStatusOrderByStartedAtDesc(user, Sensor.SensorStatus.ACTIVE)
                            .ifPresent(oldSensor -> {
                                oldSensor.changeStatus(Sensor.SensorStatus.INACTIVE);
                                oldSensor.updateEndedAt(now);
                                sensorRepository.saveAndFlush(oldSensor);
                            });

                    // [변경] 기존 센서를 재활용하지 않고, 항상 새로운 센서 이력을 생성합니다.
                    return createNewSensor(user, record);
                });
    }

    private Sensor createNewSensor(User user, DexcomResponse.Record record) {
        LocalDateTime now = LocalDateTime.now();
        Sensor newSensor = Sensor.builder()
                .user(user)
                .deviceId(record.getTransmitterId())
                .provider("Dexcom")
                .status(Sensor.SensorStatus.ACTIVE)
                .startedAt(now)
                .endedAt(now.plusDays(9))
                .build();
        return sensorRepository.save(newSensor);
    }
}
