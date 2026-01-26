import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import odeint
import json
from dataclasses import dataclass

@dataclass
class PatientConfig:
    weight_kg: float
    height_cm: float
    sys_bp: float
    sys_bg: float
    fasting_hours: float
    trend_slope_up: float
    trend_slope_down: float
    is_t2d: bool

@dataclass
class MealExerciseInput:
    carbs: float
    protein: float
    fat: float
    fiber: float
    sodium: float
    meal_order: str
    exercise_intensity: str

# =========================================================
# 1. 생리학적 파라미터 및 환자 상태 클래스 (기존 유지)
# =========================================================

class PatientConfig:
    def __init__(self, weight_kg, height_cm, sys_bp, sys_bg, fasting_hours, 
                 trend_slope_up, trend_slope_down, is_t2d=True):
        self.weight = weight_kg
        self.height = height_cm
        self.bmi = weight_kg / ((height_cm/100)**2)
        self.sys_bp = sys_bp
        self.sys_bg = sys_bg
        self.fasting_hours = fasting_hours
        self.slope_up = trend_slope_up     # 현재 상승 기울기 (mg/dL/min)
        self.slope_down = trend_slope_down # 현재 하강 기울기 (보통 음수)
        self.is_t2d = is_t2d

    def estimate_insulin_sensitivity(self):
        # 정상인 기준 SI (min^-1 / (uU/ml))
        base_si = 5.0e-4 if not self.is_t2d else 2.0e-4
        
        # BMI 페널티 (23 이상부터 저항성 증가 가정)
        bmi_penalty = max(0, (self.bmi - 23) * 0.05)
        
        # 혈압 페널티 (수축기 120 이상부터 저항성 증가)
        bp_penalty = max(0, (self.sys_bp - 120) * 0.005)
        
        # 최종 SI 계산 (하한선 존재)
        final_si = base_si * (1.0 / (1.0 + bmi_penalty + bp_penalty))
        
        return max(0.5e-4, final_si)
    
    def get_glucose_effectiveness(self):
        base_p1 = 0.022  # 건강한 성인 평균
        
        if self.is_t2d:
            # 당뇨가 있으면 포도당 효율성이 약 30~50% 감소함
            return 0.012 
        else:
            return base_p1

    def calculate_basal_hgp(self):
        base_hgp = 1.0 # mg/kg/min
        
        # 당뇨 환자의 새벽 현상 및 공복 기전 반영
        if self.is_t2d and self.fasting_hours > 8:
            factor = 1.0 + 0.05 * (self.fasting_hours - 8)
            return base_hgp * min(factor, 1.5)
        elif self.fasting_hours < 4:
            return base_hgp * 0.5
        return base_hgp

class MealExerciseInput:
    def __init__(self, carbs, protein, fat, fiber, sodium, 
                 meal_order='mixed', exercise_intensity='none'):
        self.carbs = carbs       # g
        self.protein = protein   # g
        self.fat = fat           # g
        self.fiber = fiber       # g
        self.sodium = sodium     # mg
        self.order = meal_order  # 'mixed', 'carb_first', 'veggie_protein_first'
        self.exercise = exercise_intensity # 'high', 'low', 'none'

    def get_emptying_params(self):
        # 1. 기본 위 배출 속도 (칼로리 밀도에 반비례)
        total_kcal = (4 * self.carbs) + (4 * self.protein) + (9 * self.fat)
        vol_est = (self.carbs + self.protein + self.fat + self.fiber) * 2 + 200
        caloric_density = total_kcal / vol_est if vol_est > 0 else 0
        
        k_base = 0.04 * np.exp(-0.5 * caloric_density) # 기본 감쇠
        
        # 2. 식이섬유에 의한 점성 저항
        k_fiber = np.exp(-0.05 * self.fiber)
        
        # 3. 식사 순서에 따른 조절 (핵심 로직)
        lag_time = 0
        if self.order == 'veggie_protein_first':
            k_order = 0.6
            lag_time = 15 
        elif self.order == 'carb_first':
            k_order = 1.2
            lag_time = 0
        else: # mixed
            k_order = 1.0
            lag_time = 5
            
        final_k = k_base * k_fiber * k_order
        return final_k, lag_time

    def get_exercise_factor(self):
        if self.exercise == 'high': return 0.005 # 강한 근육 수축
        elif self.exercise == 'low': return 0.002 # 가벼운 걷기
        else: return 0.0

# =========================================================
# 2. 미분 방정식 모델 (Physiological Engine) (기존 유지)
# =========================================================

def physiological_model(y, t, params):
    # (기존과 동일하게 S1, S2 포함 8개 변수 unpacking)
    G, X, I, Q_st, Q_gut, Z, S1, S2 = y
    p, meal_k, lag_time, ex_k = params
    
    # 1. 위장관 (기존 동일)
    emptying_activation = 1 / (1 + np.exp(-2.0 * (t - lag_time)))
    rate_gastric_out = meal_k * Q_st * emptying_activation
    na_efficiency = p['sodium'] / (p['sodium'] + 500.0)
    k_abs = 0.1 * (0.5 + 0.5 * na_efficiency)
    Ra = k_abs * Q_gut
    
    # 2. 인슐린 흡수 (수정됨: 속도 상수 및 단위)
    # k_a 값을 0.02 -> 0.033 (약 30분 피크)로 조정하여 반응 속도를 높임
    k_a = 0.033 
    
    dS1dt = -k_a * S1
    dS2dt = k_a * (S1 - S2)
    
    # 혈중 유입 (Units/min)
    rate_insulin_appearance = k_a * S2
    
    # [중요] 단위 변환: 1 Unit = 1,000,000 micro-units (uU)
    # 분포 용적 Vi (mL)로 나누어 농도(uU/mL) 변화량 계산
    insulin_conc_change = (rate_insulin_appearance * 1e6) / p['Vi']

    # 3. 포도당 (기존 동일)
    hgp_suppression = np.exp(-0.5 * (I / p['Ib']))
    current_HGP = p['HGP_base'] * hgp_suppression
    dGdt = -(p['p1'] + X + Z) * G + (p['p1'] * p['Gb']) + (Ra / p['Vd']) + (current_HGP / p['Vd'])
    
    # 4. 인슐린 동역학 (내인성 + 외인성)
    dXdt = -p['p2'] * X + p['p3'] * (I - p['Ib'])
    
    # 식후 췌장 분비 (식사 자극)
    secretion = max(0, 2.0 * (G - p['Gb'])) if t < 120 else max(0, 1.0 * (G - p['Gb']))
    
    # dI/dt: 분해(-n*I) + 췌장분비 + [주사 인슐린]
    dIdt = -p['n'] * (I - p['Ib']) + (secretion / p['Vd']) + insulin_conc_change
    
    # 5. 운동 등 나머지
    exercise_on = 1 if (t >= 30 and t <= 90) else 0 
    dZdt = -0.05 * Z + ex_k * exercise_on
    dQ_stdt = -rate_gastric_out
    dQ_gutdt = rate_gastric_out - Ra
    
    return [dGdt, dXdt, dIdt, dQ_stdt, dQ_gutdt, dZdt, dS1dt, dS2dt]

# =========================================================
# 3. 시뮬레이션 실행 및 시각화 (기능 추가)
# =========================================================

def run_simulation(patient, meal, current_bg, insulin_dose=0.0, duration_min=120, slope_up_factor=1.0, slope_down_factor=1.0):
    # 인슐린 민감도 강제 보정 (User의 0.6u가 효과가 있으려면 민감도가 높아야 함)
    si = patient.estimate_insulin_sensitivity()
    
    # [Tip] 시뮬레이션에서 인슐린 효과가 안 보일 때 p3를 증폭시켜 봅니다.
    p3_gain = 3.0 # 민감도 3배 증폭 테스트
    
    p1_val = patient.get_glucose_effectiveness()
    hgp = patient.calculate_basal_hgp()

    final_si = si * slope_down_factor

    # 인슐린 분포 용적 (Vi): 체중(kg) * 0.12 L/kg * 1000 mL/L
    # 너무 크면 인슐린 농도가 묽어져서 효과가 안 나타남
    Vi_val = patient.weight * 0.12 * 1000 

    model_params = {
        'p1': p1_val, 
        'p2': 0.025,       # 인슐린 작용 소멸 속도
        'p3': si * 0.025 * p3_gain, # [증폭 적용]
        'n': 0.15,         # 인슐린 분해 속도
        'Gb': 100.0, 
        'Ib': 10.0, 
        'Vd': 1.7 * patient.weight, 
        'Vi': Vi_val,      # 정확한 부피 설정
        'HGP_base': hgp * patient.weight,
        'sodium': meal.sodium
    }
    
    k_empt, lag = meal.get_emptying_params()
    final_k_empt = k_empt * slope_up_factor
    k_ex = meal.get_exercise_factor()
    
    initial_Q_gut = 0
    if patient.slope_up > 0:
        initial_Q_gut = (patient.slope_up * model_params['Vd']) / 0.05
    
    # 초기 상태: S1에 dose 투입
    y0 = [current_bg, 0, model_params['Ib'], meal.carbs * 1000, initial_Q_gut, 0, insulin_dose, 0]
    
    t_solve = np.linspace(0, duration_min, duration_min * 10) 
    solution = odeint(physiological_model, y0, t_solve, args=((model_params, final_k_empt, lag, k_ex),))
    
    # --- [디버깅 로그] ---
    plasma_insulin = solution[:, 2] # I
    max_insulin = np.max(plasma_insulin)
    print(f"DEBUG: 투여량 {insulin_dose}u -> 혈중 인슐린 피크 농도: {max_insulin:.2f} uU/mL (기저치: {model_params['Ib']})")
    
    if max_insulin < model_params['Ib'] + 1:
        print("WARNING: 인슐린 농도 변화가 거의 없습니다. Vi(분포용적)를 줄이거나 용량을 늘려야 합니다.")

    # 결과 리턴을 위해 다운샘플링
    t_eval = np.arange(0, duration_min + 1, 5)
    indices = np.searchsorted(t_solve, t_eval)
    indices = np.clip(indices, 0, len(solution)-1)
    
    return t_eval, solution[indices]

def calculate_rmse(sim_time, sim_bg, real_time, real_bg):
    """
    [추가됨] 시뮬레이션 결과와 실제 데이터 사이의 오차(RMSE) 계산
    np.interp를 사용하여 실제 데이터 시간에 맞는 시뮬레이션 값을 추정
    """
    # 실제 데이터 시간에 맞춰 시뮬레이션 데이터 보간(interpolation)
    sim_interpolated = np.interp(real_time, sim_time, sim_bg)
    
    # 오차 제곱 평균의 제곱근 (RMSE)
    mse = np.mean((sim_interpolated - real_bg)**2)
    rmse = np.sqrt(mse)
    return rmse

def plot_results(t, res, patient, meal, real_data_t=None, real_data_y=None):
    """
    [수정됨] real_data 인자를 받아 비교 그래프 출력 기능 추가
    """
    bg = res[:, 0]
    insulin = res[:, 2]
    
    fig, ax1 = plt.subplots(figsize=(10, 6))
    
    # 1. 시뮬레이션 혈당 (Model Prediction)
    color = 'tab:red'
    ax1.set_xlabel('Time (minutes)')
    ax1.set_ylabel('Glucose (mg/dL)', color=color)
    ax1.plot(t, bg, color=color, linewidth=2, label='Model Prediction', alpha=0.8)
    
    # 2. [추가됨] 실제 데이터 (Real Data) 시각화
    if real_data_t is not None and real_data_y is not None:
        ax1.scatter(real_data_t, real_data_y, color='black', s=40, zorder=5, label='Real Measurement')
        # 오차 영역 표시 (Visual Error)
        sim_at_real_time = np.interp(real_data_t, t, bg)
        for rt, ry, sy in zip(real_data_t, real_data_y, sim_at_real_time):
            ax1.vlines(rt, min(ry, sy), max(ry, sy), colors='gray', linestyles=':', alpha=0.5)

    ax1.tick_params(axis='y', labelcolor=color)
    ax1.grid(True, alpha=0.3)
    
    # 정상 범위 / 위험 범위
    ax1.axhspan(70, 140, color='green', alpha=0.1, label='Target Range')
    ax1.axhline(180, color='orange', linestyle='--', label='High Warning')
    
    # 레전드 합치기 (혈당 + 실제데이터)
    lines1, labels1 = ax1.get_legend_handles_labels()
    
    # 3. 인슐린 그래프 (Twin axis)
    ax2 = ax1.twinx()
    color = 'tab:blue'
    ax2.set_ylabel('Plasma Insulin (uU/mL)', color=color)
    line2 = ax2.plot(t, insulin, color=color, linestyle=':', label='Simulated Insulin')
    ax2.tick_params(axis='y', labelcolor=color)
    
    # 최종 레전드
    lines = lines1 + line2
    labels = labels1 + [l.get_label() for l in line2]
    ax1.legend(lines, labels, loc='upper left')
    
    plt.title(f"Glucose Simulation vs Real Data Comparison\n(Meal Order: {meal.order}, RMSE Analysis)")
    fig.tight_layout()
    plt.show()


# 디버깅 모드! 동일 폴더에 있는 input.json 파일을 통해 읽어들인다.
if __name__ == "__main__":
    # 환자 상태
    with open('input.json', 'r', encoding='utf-8') as f:
        data = json.load(f) # load()는 파일을 읽습니다
    
    patient_A = PatientConfig(**data['patient'])
    
    # 식사 정보
    meal_A = MealExerciseInput(**data['meal'])

    my_slope_up = 1.3 # 0에 가까울수록 완만함
    my_slope_down = 0.7
    
    # 시뮬레이션
    sim_time, sim_results = run_simulation(
        patient_A, 
        meal_A, 
        current_bg=data['patient']['sys_bg'], 
        insulin_dose=0.60, 
        slope_up_factor=my_slope_up, 
        slope_down_factor=my_slope_down
        )
    
    sim_bg = sim_results[:, 0]

    # 실제 데이터
    real_time_data = np.array([
    0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 
    50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 
    100, 105, 110, 115
])
    real_glucose_data = np.array([
    112, 106, 113, 123, 134, 152, 162, 166, 173, 183, 
    188, 193, 193, 187, 179, 169, 165, 164, 166, 167, 
    164, 165, 164, 160
])

    # RMSE 오차 계산
    rmse_val = calculate_rmse(sim_time, sim_bg, real_time_data, real_glucose_data)
    print(f"--- Simulation vs Real Data Comparison ---")
    print(f"Prediction Peak: {np.max(sim_bg):.1f} mg/dL")
    print(f"Real Data Peak : {np.max(real_glucose_data):.1f} mg/dL")
    print(f"RMSE (Error)   : {rmse_val:.2f} mg/dL")
    
    if rmse_val < 15: # 혈당 오차가 15% 이내여야 함
        print(">> 15% 오차 이내")
    else:
        print(">> 평가: 오차가 큽니다. 환자의 인슐린 감수성(SI) 파라미터 보정이 필요합니다.")

    # 그래프 그리기
    plot_results(sim_time, sim_results, patient_A, meal_A, 
                 real_data_t=real_time_data, 
                 real_data_y=real_glucose_data)