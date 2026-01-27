## main.py
### 1. 음식 AI 분석 요청
- /api/v1/ai/food/analyze

### 2. 혈당 예측 생성
- /api/v1/predictions

### 3. 학습 이벤트 (사용자 가중치 업데이트)
- /api/v1/learning/events

## services
### 1. food_detection.py
- 입력: 이미지 파일 (parameter name : "file")

- 음식 예측하여 결과값 반환 (음식 이름, 확신도, 음식의 위치를 선으로 나타내고 싶다면?)

```json
{
    "result": {
    "food_name": "food_name",
    "confidence": 0.42,
    "box": {
        "x_min": 1, 
        "y_min": 1, 
        "x_max": 2, 
        "y_max": 2  
        }
    }
}
```

- 현재는 중량 측정은 아직 보내고 있지 않음

### 2. glucose_prediction.py
- 입력: 환자데이터와 음식 데이터
- 입력할 때 input.json처럼 patient와 meal을 구분하여 json을 넣을 필요 없이 그냥 한번에 넣으면 된다.

```json
{
    "carbs": 70,
    "protein": 30,
    "fat": 15,
    "fiber": 2,
    "sodium": 800,
    "meal_order": "veggie_protein_first",
    "exercise_intensity": "low",
    "weight_kg": 85,
    "height_cm": 170,
    "sys_bg": 130,
    "sys_bp": 145,
    "fasting_hours": 10,
    "trend_slope_up": 1.8,
    "trend_slope_down": 0,
    "is_t2d": true
}
```

- 혈당값 예측하여 결과 25개의 원소를 가진 배열 반환 (0~120min, 5분 간격, 25개 원소)
```json
{
    "result": [0, 1, ...24]
}
```
### 3. update_hyperparameter.py
- 사용자의 혈당 상승 기울기 학습
- 입력: 환자의 event data와 혈당 데이터

```json
{
  // 업데이트가 필요한 기울기의 값
  "rise_slope": 1.5,
  "decay_slope": 0.5,
  
  // 혈당 데이터
  "glucose_logs": [
    { "measured_at": "2026-01-26T00:00:00", "value": 98.0 },
    { "measured_at": "2026-01-26T00:05:00", "value": 97.5 },
    { "measured_at": "2026-01-26T00:10:00", "value": 98.2 },

    // ... (중략) ...

    { "measured_at": "2026-01-26T23:55:00", "value": 102.0 }
  ],
  
  // 이벤트 데이터
  "meal_logs": [
    { "measured_at": "2026-01-26T08:00:00", "event_type": "carbs", "value": 50.0 },
    { "measured_at": "2026-01-26T12:30:00", "event_type": "carbs", "value": 80.0 }
  ]
}
```

- 출력은 다음과 같다.

```json
{ "result": {
    "rise_slope": 0.3,
    "decay_slope": -0.1}
}
```

## models
### 1. best.pt 
- food_detection에 사용하여 예측값을 반환

### 2. prediction_model_ex_insulin 
- glucose_prediction.py에 사용

### 3. update_slope.py 
- update_parameter.py에 사용