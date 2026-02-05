# Dexcom CGM 데이터 파이프라인 (Redis 버퍼 아키텍처)

## 0. 한 줄 요약
Dexcom EGV 데이터를 5분 주기로 수집하고, 사용자별 Redis 버퍼에 적재한 뒤 MySQL로 순차 저장하며, 중복 제거·센서 이력 관리·(실시간 수집 시) 알림 평가까지 수행한다.

## 1. 목표
- 동시 수집 구간의 DB 쓰기 폭주 완화
- Dexcom API 지연/실패 시 데이터 유실 최소화
- 수집 처리와 저장 처리를 분리해 안정성 확보

## 2. 아키텍처 구성
- Dexcom API Client: EGV 데이터 호출
- Redis Buffer: 사용자별 FIFO 큐
- DB Writer: Redis -> MySQL 동기화
- Sensor Manager: 센서 이력/활성 상태 관리
- Alert Evaluator: 실시간 수집 시 알림 평가

ASCII 흐름도:
[Scheduler] -> [Dexcom API] -> [Redis List per user] -> [MySQL]
                                    |                   |
                                    +-> 중복 제거        +-> 센서 이력
                                                         +-> 알림 평가(실시간만)

## 3. 데이터 흐름 (단계별)
1) 스케줄러가 5분마다 전체 유저를 순회
2) 각 유저에 대해 EGV 데이터를 조회(지연 고려 시간창 적용)
3) 레코드를 Redis List에 rightPush
4) Redis List를 leftPop 하며 DB 저장
5) dexcom_record_id 중복 제거 및 센서 매핑
6) 실시간 수집일 경우 알림 평가 수행

## 4. Redis 설계
- Key: cgm:buffer:{dexcomUserId}
- 자료구조: List
- Push: rightPush
- Pop: leftPop (FIFO)
- Payload: Dexcom record DTO (value, systemTime, trend, trendRate, transmitterId)

Redis 사용 이유:
- API 수집과 DB 저장 사이에 완충층 제공
- DB 쓰기 지연/병목 시에도 수집을 끊기지 않게 유지

## 5. 데이터 정합성 규칙
- 중복 방지: dexcom_record_id 유니크 키로 중복 레코드 skip
- 시간 정규화: systemTime을 KST(Asia/Seoul)로 변환하여 measured_at 저장

## 6. 센서 처리
- transmitterId 기준으로 활성 센서 탐색
- 신규 transmitter 감지 시 기존 활성 센서 비활성화
- 신규/재활성 센서에 10일 활동 기간 부여

## 7. 운영 메모
- Redis 장애 시 버퍼링 불가 (수집 데이터 유실 위험)
- DB 저장은 현재 순차 처리
- 과거 데이터는 30일 단위로 쪼개서 수집

## 8. 개선 우선순위 (Top 4)
1) 재시도/복구 메커니즘
   - DB 저장 실패 시 재처리 큐/DLQ 도입
2) Redis 장애 대응
   - Redis 장애 시 직접 DB 저장 또는 임시 로컬 버퍼링
3) 모니터링/알림
   - Redis 큐 길이, API 실패율, DB 적재 지연 지표 추가
4) 스케줄러 부하 분산
   - 전체 유저 순회를 샤딩/작업 큐 기반으로 분산 처리

## 9. 참고 코드 진입점
- Scheduler: backend/dnc/src/main/java/com/djjko/dnc/glucose/scheduler/CgmScheduler.java
- Pipeline service: backend/dnc/src/main/java/com/djjko/dnc/glucose/service/CgmPipelineService.java
- Dexcom client: backend/dnc/src/main/java/com/djjko/dnc/glucose/client/DexcomApiClient.java
- Dexcom response DTO: backend/dnc/src/main/java/com/djjko/dnc/glucose/dto/DexcomResponse.java
- DB schema: backend/dnc/src/main/resources/db/dnc_db.sql
