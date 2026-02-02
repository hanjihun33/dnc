from settings.schema import ModelUpdateRequest, GlucoseData, EventData
from models.update_slope import slope_calculator

class ParameterUpdateService:
    def __init__(self):
        pass 

    def update_slopes(self, request_data: ModelUpdateRequest):
        
        # 0. 기본 반환값
        default_response = {
            "rise_slope": request_data.rise_slope,
            "decay_slope": request_data.decay_slope
        }

        glucose_logs = [
            GlucoseData(measured_at=data.measured_at, value=data.value)
            for data in request_data.glucose
            if data.measured_at is not None and data.value is not None
        ]
        meal_logs = [
            EventData(
                measured_at=event.feed_measured_at,
                event_type="carbs",
                value=event.feed_value
            )
            for event in request_data.events
            if event.feed_measured_at is not None and event.feed_value is not None
        ]
        if not glucose_logs or not meal_logs:
             return default_response

        # 1. df 변환
        bg_df, events_df = slope_calculator.preprocess_from_list(
            glucose_logs,
            meal_logs
        )
        if bg_df.empty:
             return default_response

        # 2. 오늘 하루치의 실제 기울기 측정
        measured_rise, measured_decay = slope_calculator.calculate_daily_measured_slopes(bg_df, events_df)

        # 임시 로그
        if measured_rise is None:
            print("분석 결과: 유효한 식사 이벤트를 찾지 못해 기울기를 측정하지 못했습니다.")
        else:
            print(f"분석 완료: 측정된 상승({measured_rise:.2f}), 하강({measured_decay:.2f})")

        # 3. 이동 평균법
        if request_data.rise_slope is None or request_data.decay_slope is None:
            return {
                "rise_slope": measured_rise,
                "decay_slope": measured_decay,
            }

        new_rise = slope_calculator.apply_moving_average(request_data.rise_slope, measured_rise)
        new_decay = slope_calculator.apply_moving_average(request_data.decay_slope, measured_decay)

        return {
            "rise_slope": new_rise,
            "decay_slope": new_decay,
        }

parameter_update = ParameterUpdateService()
