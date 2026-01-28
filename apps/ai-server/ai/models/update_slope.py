import pandas as pd
import numpy as np
from datetime import timedelta
from settings.schema import GlucoseData, EventData 

class SlopeCalculator:
    def __init__(self, alpha=0.3):
        """
        alpha: 이동 평균 가중치 (0~1). 
               기본값 0.3 (새로운 측정값 30%, 기존값 70% 반영)
        """
        self.alpha = alpha

    def preprocess_from_list(self, glucose_list: list, event_list: list):
        # 1. Pydantic 모델 리스트 -> Pandas DataFrame 변환
        bg_df = pd.DataFrame([data.model_dump() for data in glucose_list])
        events_df = pd.DataFrame([data.model_dump() for data in event_list])

        # 2. 데이터가 비어있는 경우 예외 처리
        if bg_df.empty or events_df.empty:
            return pd.DataFrame(), pd.DataFrame()

        # 3. 시간 형식 변환 및 정렬
        bg_df['measured_at'] = pd.to_datetime(bg_df['measured_at'])
        events_df['measured_at'] = pd.to_datetime(events_df['measured_at'])

        bg_df = bg_df.sort_values('measured_at').reset_index(drop=True)
        events_df = events_df.sort_values('measured_at').reset_index(drop=True)

        return bg_df, events_df

    def calculate_daily_measured_slopes(self, bg_df, events_df):
        # 탄수화물(식사) 이벤트만 필터링 (event_type이 'carbs'인 것)
        # 만약 실제 데이터의 event_type이 다르다면 수정 필요 (예: 'meal', 'food' 등)
        if 'event_type' not in events_df.columns:
             return None, None
             
        meal_events = events_df[events_df['event_type'] == 'carbs']
        
        if meal_events.empty:
            return None, None

        rise_slopes = []
        decay_slopes = []

        for _, event in meal_events.iterrows():
            start_time = event['measured_at']
            # 식사 후 3시간(180분) 동안의 데이터만 확인
            end_window = start_time + timedelta(minutes=180)
            
            # 해당 구간 혈당 데이터 자르기
            mask = (bg_df['measured_at'] >= start_time) & (bg_df['measured_at'] <= end_window)
            window_df = bg_df.loc[mask]

            if window_df.empty or len(window_df) < 5: 
                continue

            # --- [상승 기울기 계산] ---
            # 시작점 ~ 피크(최고점)
            start_bg = window_df.iloc[0]['value']
            peak_idx = window_df['value'].idxmax()
            peak_row = window_df.loc[peak_idx]
            peak_bg = peak_row['value']
            peak_time = peak_row['measured_at']

            time_diff_rise = (peak_time - start_time).total_seconds() / 60.0 # 분 단위

            # 10분 이상 상승했고, 피크가 시작점보다 높을 때만 유효
            if time_diff_rise > 10 and peak_bg > start_bg:
                measured_rise = (peak_bg - start_bg) / time_diff_rise
                rise_slopes.append(measured_rise)

            # --- [하강 기울기 계산] ---
            # 피크 ~ 구간 끝
            if len(window_df.loc[peak_idx:]) > 2:
                decay_window = window_df.loc[peak_idx:]
                end_row = decay_window.iloc[-1]
                end_bg = end_row['value']
                end_time = end_row['measured_at']

                time_diff_decay = (end_time - peak_time).total_seconds() / 60.0

                if time_diff_decay > 20:
                    measured_decay = (peak_bg - end_bg) / time_diff_decay
                    # 하강했으면(양수) 리스트에 추가
                    if measured_decay > 0: 
                        decay_slopes.append(measured_decay)

        # 평균값 계산 (데이터가 없으면 None)
        avg_rise = np.mean(rise_slopes) if rise_slopes else None
        avg_decay = np.mean(decay_slopes) if decay_slopes else None

        return avg_rise, avg_decay

    def apply_moving_average(self, old_val, new_measured_val):
        # 오늘 측정된 데이터가 없으면 기존 값 유지
        if new_measured_val is None:
            return old_val
        
        # 새로운 값 계산
        updated_val = (self.alpha * new_measured_val) + ((1 - self.alpha) * old_val)
        
        return round(updated_val, 4) # 소수점 4자리까지 반환

# 인스턴스 생성 (외부에서 import해서 사용)
slope_calculator = SlopeCalculator(alpha=0.3)


# 디버깅 모드!
if __name__ == "__main__":


    class MockData:
        def __init__(self, **kwargs):
            self.data = kwargs
        def model_dump(self):
            return self.data

    # 12:00 식사 -> 12:30 피크(160) -> 13:00 하강(130) -> 13:30 종료(100)
    
    # 식사 이벤트 (12:00)
    mock_events = [
        MockData(measured_at="2026-01-26 12:00:00", event_type="carbs", value=50)
    ]

    # 혈당 흐름
    mock_glucose = [
        MockData(measured_at="2026-01-26 12:00:00", value=100), # 식사 시작 (Start)
        MockData(measured_at="2026-01-26 12:10:00", value=120),
        MockData(measured_at="2026-01-26 12:20:00", value=140),
        MockData(measured_at="2026-01-26 12:30:00", value=160), # 피크 (Peak)
        MockData(measured_at="2026-01-26 12:40:00", value=150),
        MockData(measured_at="2026-01-26 13:00:00", value=130),
        MockData(measured_at="2026-01-26 13:30:00", value=100), # 하강 끝 (End)
    ]


    calc = SlopeCalculator(alpha=0.5) 

    print("\n[1] 데이터 전처리 (DataFrame 변환)")
    bg_df, events_df = calc.preprocess_from_list(mock_glucose, mock_events)
    print(f"   - 혈당 데이터 개수: {len(bg_df)}")
    print(f"   - 식사 이벤트 개수: {len(events_df)}")

    print("\n[2] 기울기 계산 (Calculate Slopes)")
    rise, decay = calc.calculate_daily_measured_slopes(bg_df, events_df)
    
    # Rise: (160 - 100) / 30분 = 2.0
    # Decay: (160 - 100) / 60분 = 1.0
    print(f"   - 측정된 상승 기울기: {rise} (예상값: 2.0)")
    print(f"   - 측정된 하강 기울기: {decay} (예상값: 1.0)")

    print("\n[3] 이동 평균 업데이트 (Update Params)")
    # 기존 파라미터가 Rise=1.0, Decay=2.0 이었다고 가정
    old_rise_param = 1.0
    old_decay_param = 2.0
    
    new_rise = calc.apply_moving_average(old_rise_param, rise)
    new_decay = calc.apply_moving_average(old_decay_param, decay)

    # 검증:
    # New Rise = (0.5 * 2.0) + (0.5 * 1.0) = 1.5
    # New Decay = (0.5 * 1.0) + (0.5 * 2.0) = 1.5
    print(f"   - 기존 Rise({old_rise_param}) -> 신규 Rise: {new_rise}")
    print(f"   - 기존 Decay({old_decay_param}) -> 신규 Decay: {new_decay}")