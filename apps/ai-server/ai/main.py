from fastapi import FastAPI, File, UploadFile
from settings.schema import InfoRequest, LearningRequest
from services.food_detection import food
from services.glucose_prediction import glucose_pred
from services.update_parameter import parameter_update

app = FastAPI()

# 0. 서버 살아있는지 확인
@app.get("/")
def read_root():
    return {"안녕": "FastAPI"}

# 1. 음식 탐지
@app.post("/api/v1/ai/food/analyze")
async def analyze(file: UploadFile = File(...)) -> dict:
    image_bytes = await file.read()
    result = food.food_detect(image_bytes)
    return {"result": result}

# 2. 혈당 예측
@app.post("/api/v1/predictions")
def predictions(data: InfoRequest) -> dict:
    result = glucose_pred.predict(data)
    return {"result": result} 

# 3. 개인의 가중치 업데이트
@app.post("/api/v1/learning/events")
def learning(data: LearningRequest) -> dict:
    result = parameter_update.update(data)
    return {"result": result}