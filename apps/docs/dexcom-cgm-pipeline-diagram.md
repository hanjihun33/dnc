# Dexcom CGM 파이프라인 다이어그램 (Mermaid)

```mermaid
flowchart LR
  SCHED[스케줄러\n5분 주기] --> API[Dexcom API\nEGV 수집]
  API --> BUF[Redis List\n키: cgm:buffer:{dexcomUserId}]
  BUF --> WRITER[DB Writer\nFIFO 처리]
  WRITER --> DEDUP[중복 제거\n기준: dexcom_record_id]
  DEDUP --> SENSOR[센서 회전\n기준: transmitterId]
  SENSOR --> DB[(MySQL\nGlucoseData)]
  DB --> ALERT[알림 평가\n(실시간 수집만)]

  API -.->|401| REFRESH[토큰 갱신]
  REFRESH --> API

  subgraph 이력 수집
    HAPI[Dexcom API\n30일 단위] --> BUF
  end

  subgraph 운영 지표 (권장)
    M1[Redis 큐 길이]
    M2[API 실패율]
    M3[DB 적재 지연]
  end

  BUF -.-> M1
  API -.-> M2
  WRITER -.-> M3
```
