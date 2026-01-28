from settings.schema import LearningRequest
from models.update_slope import slope_calculator

class ParameterUpdateService:
    def __init__(self):
        pass 

    def update_slopes(self, request_data: LearningRequest):
        
        # 0. 기본 반환값
        default_response = {
            "rise_slope": request_data.rise_slope,
            "decay_slope": request_data.decay_slope
        }
        if not request_data.glucose_logs or not request_data.meal_logs:
             return default_response

        # 1. df 변환
        bg_df, events_df = slope_calculator.preprocess_from_list(
            request_data.glucose_logs, 
            request_data.meal_logs
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
        new_rise = slope_calculator.apply_moving_average(request_data.rise_slope, measured_rise)
        new_decay = slope_calculator.apply_moving_average(request_data.decay_slope, measured_decay)

        return {
            "rise_slope": new_rise,
            "decay_slope": new_decay,
        }

parameter_update = ParameterUpdateService()