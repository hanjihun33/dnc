import torch
import torch.nn as nn
from torchvision import transforms, models
from ultralytics import YOLO
from PIL import Image
import io
import os

# ======================================================
# 인프라 경로로 수정, 기본값: 기존 로컬 경로
#
# [설정] ResNet 가중치 파일 경로 (본인 경로로 수정 필수!)
# ======================================================
# RESNET_MODEL_PATH = r"C:\Users\SSAFY\Desktop\S14P11C105\ai\models\new_opencv_ckpt_b84_e200.pth"

# ==============================================================================
_HERE = os.path.dirname(__file__)
_AI_DIR = os.path.abspath(os.path.join(_HERE, ".."))
_MODELS_DIR = os.path.join(_AI_DIR, "models")

DEFAULT_YOLO_PATH = os.path.join(_MODELS_DIR, "best1to40.pt")
DEFAULT_RESNET_PATH = os.path.join(_MODELS_DIR, "new_opencv_ckpt_b84_e200.pth")


class FoodDetection:

    # 모델 초기화
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"🚀 사용 장치: {self.device}")

        # ======================================================
        # 인프라 경로로 수정, 기본값: 기존 로컬 경로
        # ======================================================
        # # 1. YOLO 모델 로드
        # self.yolo_model = YOLO(r'C:\Users\SSAFY\Desktop\S14P11C105\ai\models\best1to40.pt')

        # # 2. ResNet 모델 로드 (양 추정용)
        # self.resnet_model = self._load_resnet_model(RESNET_MODEL_PATH)
        # ======================================================
        
        # 1. YOLO 모델 로드 로직
        # os.getenv('키', '기본값') -> 키가 없으면 기본값을 씁니다.
        yolo_path = os.getenv('YOLO_MODEL_PATH', DEFAULT_YOLO_PATH)
        # print(f"📦 YOLO 모델 경로: {yolo_path}")
        self.yolo_model = YOLO(yolo_path)

        # 2. ResNet 모델 로드 로직
        resnet_path = os.getenv('RESNET_MODEL_PATH', DEFAULT_RESNET_PATH)
        # print(f"📦 ResNet 모델 경로: {resnet_path}")
        self.resnet_model = self._load_resnet_model(resnet_path)

        # 3. ResNet용 이미지 전처리기 (224x224 리사이즈 등)
        self.transforms = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])

    # 내부 함수: ResNet 모델 불러오기
    def _load_resnet_model(self, path):
        try:
            model = models.resnet18(weights=None)
            model.fc = nn.Linear(model.fc.in_features, 5) # Q1 ~ Q5
            
            # 가중치 파일 로드 (CPU/GPU 자동 매핑)
            checkpoint = torch.load(path, map_location=self.device, weights_only=False)
            
            # 딕셔너리 구조에 따라 유연하게 로드
            state_dict = None
            if isinstance(checkpoint, dict):
                if 'model_ft' in checkpoint:
                    state_dict = checkpoint['model_ft'].state_dict() if isinstance(checkpoint['model_ft'], nn.Module) else checkpoint['model_ft']
                elif 'state_dict' in checkpoint:
                    state_dict = checkpoint['state_dict']
                else:
                    state_dict = checkpoint
            elif isinstance(checkpoint, nn.Module):
                state_dict = checkpoint.state_dict()
            
            if state_dict:
                model.load_state_dict(state_dict, strict=False)
            else:
                print("⚠️ ResNet 가중치를 제대로 불러오지 못했습니다. (빈 모델 사용)")

            model.to(self.device).eval()
            return model
        except Exception as e:
            print(f"❌ ResNet 로드 실패: {e}")
            return None

    # 이름, 정확도, 박스 위치, **양(Quantity)**을 반환한다.
    def food_detect(self, image_bytes):
        image = Image.open(io.BytesIO(image_bytes))
        
        # YOLO 추론
        results = self.yolo_model(image, verbose=False) # verbose=False로 로그 줄임

        detected_foods = []
    
        for result in results:
            # 감지된 박스들을 하나씩 순회
            for box in result.boxes:
                # ---------------- [기존 YOLO 로직] ----------------
                class_id = int(box.cls[0])
                food_name = result.names[class_id]
                confidence = float(box.conf[0])
                x1_n, y1_n, x2_n, y2_n = box.xyxyn[0].tolist() # 정규화된 좌표 (리턴용)
                
                # ---------------- [추가된 ResNet 로직] ----------------
                quantity_label = "Unknown"
                if self.resnet_model:
                    # 1. 크롭을 위해 절대 좌표(픽셀) 가져오기
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                    
                    # 2. 이미지 자르기 (Crop)
                    cropped_img = image.crop((x1, y1, x2, y2))
                    
                    # 3. 전처리 및 추론
                    input_tensor = self.transforms(cropped_img).unsqueeze(0).to(self.device)
                    with torch.no_grad():
                        outputs = self.resnet_model(input_tensor)
                        _, preds = torch.max(outputs, 1)
                        quantity_label = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'][preds.item()]

                # ---------------- [결과 저장] ----------------
                detected_foods.append({
                    "food_name": food_name,
                    "confidence": round(confidence, 2),
                    "quantity": quantity_label,  # <--- 여기가 추가됨!
                    "box": {
                        "x_min": x1_n, 
                        "y_min": y1_n, 
                        "x_max": x2_n, 
                        "y_max": y2_n  
                    }
                })
        return detected_foods

food = FoodDetection()
# ======================================================
# 테스트 실행 코드 (메인)
# ======================================================
if __name__ == "__main__":
    # 테스트할 이미지 경로
    TEST_IMAGE_PATH = r"C:\Users\SSAFY\Desktop\test_images4.jpg" 
    
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
                qty = item['quantity'] # 양 정보
                box = item['box']
                
                print(f"[{i+1}] {name} (확신도: {conf})")
                print(f"    └ 🍱 양 추정: {qty}")
                print(f"    └ 📍 위치: x({box['x_min']:.2f}~{box['x_max']:.2f}), y({box['y_min']:.2f}~{box['y_max']:.2f})")
        print("-" * 50)
