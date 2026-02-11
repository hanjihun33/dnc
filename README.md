# 🌱 당낭콩
![썸네일](./docs/assets/images/thumbnail.png)

</div>

---

## 💚 프로젝트 소개

### 혈당이 오를 때마다

### 수치를 확인하느라 번거롭지 않나요?

식단 사진 **한 장**으로
👉 음식 분석
👉 혈당 변화 예측까지
한 번에 확인할 수 있다면,
혈당 관리는 훨씬 쉬워집니다.


### 흩어진 기록을 모아

### 패턴을 파악하느라 시간이 부족하지 않나요?

혈당, 식단, 변화를 자동으로 정리해
👉 **하루 · 주간 · 월간 리포트**로 제공하고
👉 중요한 변화만 **알림**으로 알려드립니다.


### 이제 **당낭콩**으로

### 혈당 관리의 부담을 덜어보세요.

당낭콩은
**기록은 자동으로**,
**관리는 직관적으로**,
**일상은 더 안전하고 편리하게** 만들어줍니다.

> 📸 찍고 · 📊 확인하고 · 🔔 놓치지 않는
> **스마트 혈당 관리 서비스, 당낭콩**

---

## 💚 프로젝트 기간
2026.01.12 ~ 2025.02.09 (4주)

---

## 💚 주요 기능
- CGM 혈당 데이터 수집 및 모니터링
- 식단 사진 분석 및 음식명 추정
- 혈당 예측 그래프 생성
- AI 코칭(섭취 가이드) 생성
- 알림/리포트/설정 기능

---

## 💚 기술 스택

### **Backend - Spring Boot**

<img src="https://img.shields.io/badge/Java_17-007396?style=for-the-badge&logo=OpenJDK&logoColor=white"> <img src="https://img.shields.io/badge/SpringBoot_3.5.9-6DB33F?style=for-the-badge&logo=SpringBoot&logoColor=white"> <img src="https://img.shields.io/badge/Spring_Data_JPA-6DB33F?style=for-the-badge&logo=Spring&logoColor=white"> <img src="https://img.shields.io/badge/Spring_Security-6DB33F?style=for-the-badge&logo=SpringSecurity&logoColor=white"> <img src="https://img.shields.io/badge/Spring_Web-6DB33F?style=for-the-badge&logo=Spring&logoColor=white"> <br>
<img src="https://img.shields.io/badge/Spring_Session_Redis-6DB33F?style=for-the-badge&logo=Spring&logoColor=white"> <img src="https://img.shields.io/badge/Springdoc_OpenAPI_2.5.0-85EA2D?style=for-the-badge&logo=Swagger&logoColor=white"> <img src="https://img.shields.io/badge/JWT_0.12.5-000000?style=for-the-badge&logo=JSONWebTokens&logoColor=white"> <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=Redis&logoColor=white"> <img src="https://img.shields.io/badge/MySQL_8-4479A1?style=for-the-badge&logo=MySQL&logoColor=white"> <br>
<img src="https://img.shields.io/badge/AWS_S3-569A31?style=for-the-badge&logo=AmazonS3&logoColor=white"> <img src="https://img.shields.io/badge/Firebase_Admin_9.2.0-FFCA28?style=for-the-badge&logo=Firebase&logoColor=black">

### **AI Server - FastAPI**

<img src="https://img.shields.io/badge/Python_3.10+-3776AB?style=for-the-badge&logo=Python&logoColor=white"> <img src="https://img.shields.io/badge/FastAPI_0.128.0-009688?style=for-the-badge&logo=FastAPI&logoColor=white"> <img src="https://img.shields.io/badge/Uvicorn_0.40.0-000000?style=for-the-badge"> <img src="https://img.shields.io/badge/PyTorch_2.9.1-EE4C2C?style=for-the-badge&logo=PyTorch&logoColor=white"> <br>
<img src="https://img.shields.io/badge/Ultralytics_8.4.6-000000?style=for-the-badge"> <img src="https://img.shields.io/badge/OpenCV_4.13.0-5C3EE8?style=for-the-badge&logo=OpenCV&logoColor=white"> <img src="https://img.shields.io/badge/NumPy_2.4.1-013243?style=for-the-badge&logo=NumPy&logoColor=white"> <img src="https://img.shields.io/badge/Pandas_3.0.0-150458?style=for-the-badge&logo=Pandas&logoColor=white">

### **Mobile - Expo (React Native)**

<img src="https://img.shields.io/badge/Expo_54.0.31-000000?style=for-the-badge&logo=Expo&logoColor=white"> <img src="https://img.shields.io/badge/React_Native_0.81.5-61DAFB?style=for-the-badge&logo=React&logoColor=white"> <img src="https://img.shields.io/badge/React_19.1.0-61DAFB?style=for-the-badge&logo=React&logoColor=white"> <img src="https://img.shields.io/badge/TypeScript_5.9.2-3178C6?style=for-the-badge&logo=TypeScript&logoColor=white"> <br>
<img src="https://img.shields.io/badge/Expo_Router_6.0.21-000000?style=for-the-badge&logo=Expo&logoColor=white"> <img src="https://img.shields.io/badge/React_Navigation_7.1.8-61DAFB?style=for-the-badge&logo=React&logoColor=white"> <img src="https://img.shields.io/badge/Node.js_20+-339933?style=for-the-badge&logo=Node.js&logoColor=white">

### **CI/CD & Infra**

<img src="https://img.shields.io/badge/Jenkins-D24939?style=for-the-badge&logo=Jenkins&logoColor=white"> <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=Docker&logoColor=white"> <img src="https://img.shields.io/badge/NGINX-009639?style=for-the-badge&logo=NGINX&logoColor=white">

---

## 💚 프로젝트 폴더 구조

### Back-end (Spring Boot)
<details>
  <summary>펼쳐보기</summary>

```plaintext
apps/backend/dnc
├── Dockerfile
└── src
    └── main
        ├── java
        │   └── com
        │       └── djjko
        │           └── dnc
        │               ├── ai
        │               ├── alert
        │               ├── auth
        │               │   ├── controller
        │               │   ├── dto
        │               │   ├── entity
        │               │   ├── repository
        │               │   ├── security
        │               │   └── service
        │               ├── common
        │               │   ├── config
        │               │   ├── exception
        │               │   ├── response
        │               │   └── util
        │               ├── config
        │               ├── error
        │               ├── glucose
        │               │   ├── client
        │               │   ├── controller
        │               │   ├── dto
        │               │   ├── entity
        │               │   ├── repository
        │               │   ├── scheduler
        │               │   └── service
        │               ├── learning
        │               ├── meal
        │               │   ├── controller
        │               │   ├── domain
        │               │   ├── dto
        │               │   ├── entity
        │               │   ├── repository
        │               │   └── service
        │               ├── model
        │               ├── notification
        │               ├── prediction
        │               ├── push
        │               ├── report
        │               ├── security
        │               ├── sensor
        │               ├── settings
        │               ├── storage
        │               └── user
        └── resources
            ├── db
            │   └── dnc_db.sql
            ├── static
            └── templates
```
</details>

### AI Server (FastAPI)
<details>
  <summary>펼쳐보기</summary>

```plaintext
apps/ai-server
├── Dockerfile
├── README.md
├── requirements.txt
└── ai
    ├── main.py
    ├── models
    ├── services
    └── settings
```
</details>

### Mobile (Expo)
<details>
  <summary>펼쳐보기</summary>

```plaintext
apps/mobile
├── app
│   ├── (auth)
│   ├── (settings)
│   └── (tabs)
├── assets
├── components
├── constants
├── hooks
├── lib
├── scripts
├── types
├── app.json
├── package.json
├── tsconfig.json
├── Dockerfile
└── nginx.conf
```
</details>

---

## 💚 팀원 소개
| ![정관우]() | ![김대원]() | ![남윤서]() | ![차지훈]() | ![박상훈]() | ![손영록]() |
|---------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| 정관우([@JeongGwanWoo](https://github.com/JeongGwanWoo)) | 김대원([@devbigone](https://github.com/devbigone)) | 남윤서([@lazyyuns](https://github.com/lazyyuns)) | 차지훈([@hanjihun33](https://github.com/hanjihun33)) | 박상훈([@monon06629](https://github.com/monon06629)) | 손영록([@](https://github.com/surina125)) |
| Leader / Back-End + Infra | Back-End | Back-End | Full-Stack | AI | AI |

---

## 💚 협업 방식

- Git
  - [브랜치 전략 🔗](https://lilac-hour-2a7.notion.site/Commit-branch-conventions-2edfab98905a80d09439de9813790eab)
  - MR시, 팀원이 코드리뷰를 진행하고 피드백 게시

- JIRA
  - 작업 단위에 따라 `Epic-Story` 분류
  - 매주 목표량을 설정하여 Sprint 진행
  - 업무의 할당량을 정하여 Story Point를 설정하고, In-Progress -> Done 순으로 작업

- 회의
  - 데일리 스크럼 9시 당일 업무 브리핑
  - 문제 상황 지속 시 MatterMost 메신저를 활용한 공유 및 도움 요청

- Notion
  - 회의록 기록하여 보관
  - 컨벤션, 트러블 슈팅, 개발 산출물 관리
  - GANTT CHART 관리


## 💚 프로젝트 산출물

- [요구사항명세서](./docs/요구사항명세서.md)
- [기능명세서](./docs/기능명세서.md)
- [와이어프레임](./docs/와이어프레임.md)
- [API명세서](./docs/API명세서.md)
- [ERD](./docs/ERD.md)
- [아키텍처](./docs/아키텍처.md)

## 💚 프로젝트 결과물

- [포팅메뉴얼](./exec/포팅_메뉴얼.md)
- [중간발표자료](./docs/당낭콩_중간발표.pptx)
- [최종발표자료](./docs/당낭콩_최종발표.pdf)

## 💚 시연 영상

- [당낭콩 시연영상](https://youtu.be/sQhA71Rfi8A?si=BkgEeV3enu9SrsE3)

## 💚 화면 구성

### CGM 연동 및 실시간 혈당 그래프
![CGM연동](./docs/assets/gifs/cgm.gif)

### 음식 AI 분석 및 예측 혈당 분석 그래프 
![음식분석](./docs/assets/gifs/food_prediction.gif)

### 리포트 페이지
![리포트](./docs/assets/gifs/report.gif)
