# 1. 개발자 버전(3.11)과 동일한 slim 이미지
FROM python:3.11-slim

# 2. 작업 디렉토리 설정
WORKDIR /app

# 3. OpenCV 및 이미지 처리를 위한 리눅스 패키지 설치
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 4. 의존성 파일 복사
COPY requirements.txt .

# 5. 파이썬 패키지 설치 (extra-index-url을 사용하여 일반 패키지도 설치 가능하게 함)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

# 6. 소스 코드 복사
COPY . .

# 7. 실행 디렉토리 변경 (main.py가 있는 폴더로 이동)
WORKDIR /app/ai

# 8. 포트 설정 (18000번 사용)
EXPOSE 18000

# 9. 실행 명령
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "18000"]