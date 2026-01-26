import numpy as np
from settings.schema import InfoRequest

# models 폴더에 있는 파일로부터 클래스와 함수를 가져옵니다.
# (파일 이름이나 경로가 프로젝트 구조에 맞는지 확인하세요)
from models.prediction_model_ex_insulin import (
    PatientConfig, 
    MealExerciseInput, 
    run_simulation
)
class GlucosePrediction:
    def __init__(self):
        pass

    def predict(self, data: InfoRequest):
        # 1. API 데이터(DTO)를 시뮬레이션 모델 객체로 변환
        patient_A = PatientConfig(
            weight_kg=data.weight_kg,
            height_cm=data.height_cm,
            sys_bp=data.sys_bp,
            sys_bg=data.sys_bg,
            fasting_hours=data.fasting_hours,
            trend_slope_up=data.trend_slope_up,
            trend_slope_down=data.trend_slope_down,
            is_t2d=data.is_t2d
        )

        meal_A = MealExerciseInput(
            carbs=data.carbs,
            protein=data.protein,
            fat=data.fat,
            fiber=data.fiber,
            sodium=data.sodium,
            meal_order=data.meal_order,
            exercise_intensity=data.exercise_intensity
        )

        # 2. 시뮬레이션 실행
        sim_time, sim_results = run_simulation(
            patient=patient_A, 
            meal=meal_A, 
            current_bg=data.sys_bg,   
            insulin_dose=0.0, 
            slope_up_factor=1.3, 
            slope_down_factor=0.7
        )
    
        # 3. 데이터 가공 (5분 간격 샘플링 & 리스트 변환)
    
        duration_min = 120
        t_eval = np.arange(0, duration_min + 1, 5) # [0, 5, 10, ... 120]
        
        indices = np.searchsorted(sim_time, t_eval)
        indices = np.clip(indices, 0, len(sim_results)-1)
        
        sim_bg = sim_results[indices, 0]
        
        # 혈당 올림하여 반환0
        result_list = [round(val, 1) for val in sim_bg.tolist()]
        return result_list
    
glucose_pred = GlucosePrediction()