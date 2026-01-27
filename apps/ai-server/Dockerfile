# 1. 베이스 이미지
FROM python:3.11-slim

# 2. 작업 디렉토리 설정 (프로젝트 루트인 ai-server로 고정!)
WORKDIR /app/ai-server

# 3. 필수 리눅스 패키지 설치 (OpenCV 등)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 4. 의존성 설치 (캐시 활용을 위해 requirements 먼저 복사)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

# 5. 소스 코드 전체 복사 (ai 폴더, models 폴더 등이 한꺼번에 들어감)
COPY . .

# 6. 환경 변수 설정 (현재 위치를 파이썬 경로로 추가)
# 기존 PYTHONPATH에 /app/ai-server/ai를 추가합니다.
ENV PYTHONPATH=/app/ai-server:/app/ai-server/ai

# 7. 포트 설정 (인프라 환경에 맞춰 18000번 사용)
EXPOSE 18000

# 8. 실행 명령어
# /app/ai-server 위치에서 ai 폴더 안의 main.py를 실행하도록 수정
CMD ["uvicorn", "ai.main:app", "--host", "0.0.0.0", "--port", "18000"]