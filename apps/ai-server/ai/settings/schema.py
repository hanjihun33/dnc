from pydantic import BaseModel, Field
from typing import List
from datetime import datetime

# 혈당 예측 관련 변수 정의
class InfoRequest(BaseModel):
    carbs: float = Field(..., description="탄수화물 (g)")
    protein: float = Field(..., description="단백질 (g)")
    fat: float = Field(..., description="지방 (g)")
    fiber: float = Field(..., description="식이섬유 (g)")
    sodium: float = Field(..., description="나트륨 (mg)")
    meal_order: str = Field(..., description="식사 순서")
    exercise_intensity: str = Field(..., description="운동 강도")

    weight_kg: float = Field(..., description="체중 (kg)")
    height_cm: float = Field(..., description="신장 (cm)")
    sys_bg: float = Field(..., description="혈당 (mg/dL)")
    sys_bp: float = Field(..., description="혈압 (mmHg)")
    fasting_hours: float = Field(..., description="혈당 (mg/dL)")
    trend_slope_up: float = Field(..., description="상승 기울기")
    trend_slope_down: float = Field(..., description="하강 기울기")
    is_t2d: bool = Field(..., description="2형 당뇨병 유병 유무")


# 학습을 위한 혈당 데이터 정의
class GlucoseData(BaseModel):
    measured_at: datetime = Field(..., description="측정 시간")
    value: float = Field(..., description="혈당 수치")

# 이벤트 (식사, 인슐린/포도당 주사 시간)
class EventData(BaseModel):
    measured_at: datetime = Field(..., description="이벤트 시간")
    event_type: str = Field(..., description="이벤트 타입 (carbs 등)")
    value: float = Field(..., description="값 (탄수화물 양 등)")

# 전체 요청
class LearningRequest(BaseModel):
    rise_slope: float = Field(..., description="현재 상승 기울기")
    decay_slope: float = Field(..., description="현재 하강 기울기")
    glucose_logs: List[GlucoseData] = Field(..., description="오늘의 혈당 기록 리스트")
    meal_logs: List[EventData] = Field(..., description="오늘의 식사 기록 리스트")