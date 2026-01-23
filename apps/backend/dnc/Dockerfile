# [Stage 1: Build] Gradle 빌드 단계
FROM eclipse-temurin:17-jdk-focal AS builder

# 빌드 작업 디렉토리 설정 (이 설정이 있어야 아래 경로들이 일치하게 됩니다)
WORKDIR /app

# 1. 빌드 도구 및 설정 파일 복사
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .

# 2. 의존성 미리 다운로드 (빌드 속도 최적화)
RUN chmod +x gradlew
RUN ./gradlew dependencies --no-daemon

# 3. 소스 코드 복사 및 실제 빌드
COPY src src
RUN ./gradlew bootJar -x test --no-daemon

# [Stage 2: Run] 실제 실행 환경 단계
FROM eclipse-temurin:17-jre-focal
WORKDIR /app

# 4. 타임존 설정 (Ubuntu 기반 focal 이미지용)
RUN apt-get update && \
    apt-get install -y tzdata && \
    ln -sf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 5. 빌드 단계에서 생성된 JAR 파일만 실행 단계로 복사
# builder 단계의 /app/build/libs 경로에서 파일을 가져옵니다.
COPY --from=builder /app/build/libs/*-SNAPSHOT.jar app.jar

# 6. '두쫀코' 서비스 포트 설정
EXPOSE 18080

# 7. 애플리케이션 실행 (타임존 옵션 포함)
ENTRYPOINT ["java", "-Duser.timezone=Asia/Seoul", "-jar", "app.jar"]