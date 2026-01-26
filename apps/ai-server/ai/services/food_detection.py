from ultralytics import YOLO
from PIL import Image
import io


class FoodDetection:

    # 모델 초기화
    def __init__ (self):
        self.model = YOLO('../models/best1to40.pt') 

    # 이름, 정확도, 박스 위치를 반환한다.
    def food_detect(self, image_bytes):

        image = Image.open(io.BytesIO(image_bytes))
        results = self.model(image)

        detected_foods = []
    
        for result in results:
            # 감지된 박스들을 하나씩 순회
            for box in result.boxes:
                class_id = int(box.cls[0])
                food_name = result.names[class_id]
                confidence = float(box.conf[0])
                x1, y1, x2, y2 = box.xyxyn[0].tolist() # 1: 왼쪽 위 지점, 2: 오른쪽 아래 지점
                detected_foods.append({
                    "food_name": food_name,
                    "confidence": round(confidence, 2),
                    "box": {
                        "x_min": x1, 
                        "y_min": y1, 
                        "x_max": x2, 
                        "y_max": y2  
                    }
                })
        return detected_foods

food = FoodDetection()

# Test! (main.py가 아니라 food_detection.py를 실행해야 합니다.)
if __name__ == "__main__":
    import os
    TEST_IMAGE_PATH = r"C:\Users\SSAFY\Desktop\GitUpdateFastAPI\01012002.jpg" 
    
    if not os.path.exists(TEST_IMAGE_PATH):
        print(f"❌ 오류: 파일이 존재하지 않습니다.\n경로를 확인해주세요: {TEST_IMAGE_PATH}")
    else:
        with open(TEST_IMAGE_PATH, "rb") as f:
            img_bytes = f.read()

        print("📂 모델 로딩 중...")
        detector = FoodDetection()

        print(f"🔍 이미지 분석 중... ({os.path.basename(TEST_IMAGE_PATH)})")
        results = detector.food_detect(img_bytes)
        
        print("-" * 50)
        if not results:
            print("❌ 감지된 음식이 없습니다.")
        else:
            print(f"✅ 총 {len(results)}개의 음식을 찾았습니다!\n")
            for i, item in enumerate(results):
                name = item['food_name']
                conf = item['confidence']
                box = item['box']
                
                print(f"[{i+1}] 음식명: {name} (확신도: {conf})")
                print(f"    └ 위치(0~1 정규화): x({box['x_min']:.2f}~{box['x_max']:.2f}), y({box['y_min']:.2f}~{box['y_max']:.2f})")
        print("-" * 50)