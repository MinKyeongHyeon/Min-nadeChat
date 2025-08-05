# Min-nade Chat! 🚀

모든 사람이 한 서버에서 채팅하는 실시간 웹 채팅 서비스입니다.

## 📋 주요 기능

- **실시간 채팅**: Socket.IO를 사용한 실시간 메시지 전송
- **사용자 관리**: 최대 10명까지 동시 접속 가능
- **중복 이름 방지**: 동일한 이름의 사용자 접속 차단
- **강퇴 투표**: 3명 이상일 때 과반수 찬성으로 사용자 강퇴 가능
- **현대적 UI**: Tailwind CSS로 구현된 아름답고 반응형 UI

## 🛠 기술 스택

### Frontend

- React 18 (TypeScript)
- Socket.IO Client
- Tailwind CSS

### Backend

- Node.js
- Express.js
- Socket.IO
- CORS

## 🚀 실행 방법

### 1. 의존성 설치

```bash
# 루트 디렉토리에서 실행
npm run install-all
```

### 2. 개발 서버 실행

```bash
# 서버와 클라이언트를 동시에 실행
npm start
```

개별 실행:

```bash
# 서버만 실행 (포트 5000)
npm run server

# 클라이언트만 실행 (포트 3000)
npm run client
```

### 3. 접속

브라우저에서 `http://localhost:3000`으로 접속

## 📁 프로젝트 구조

```
Min-nadeChat/
├── 작업명세서.txt      # 프로젝트 명세서
├── package.json        # 루트 패키지 설정
├── README.md          # 프로젝트 설명서
├── client/            # React 클라이언트
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginPage.tsx   # 로그인 페이지
│   │   │   └── ChatPage.tsx    # 메인 채팅 페이지
│   │   ├── App.tsx            # 메인 앱 컴포넌트
│   │   └── index.tsx          # 앱 진입점
│   ├── package.json
│   └── tailwind.config.js     # Tailwind CSS 설정
└── server/            # Node.js 서버
    ├── server.js      # 메인 서버 파일
    └── package.json
```

## 🎮 사용법

### 로그인

1. 사용할 이름을 입력하고 "채팅방 입장" 버튼 클릭
2. 중복된 이름이나 방이 가득 찬 경우 오류 메시지 표시

### 채팅

1. 하단 입력창에 메시지 작성 후 Enter 또는 "전송" 버튼 클릭
2. 우측 사이드바에서 현재 접속자 확인 가능

### 강퇴 투표

1. 우상단 "강퇴 투표" 버튼 클릭 (3명 이상일 때만 활성화)
2. 강퇴할 사용자 선택 후 "투표 시작" 클릭
3. 30초 내에 과반수 찬성 시 해당 사용자 강퇴

## ⚙️ 환경 설정

### 서버 포트 변경

`server/server.js` 파일의 PORT 환경변수 수정:

```javascript
const PORT = process.env.PORT || 5000;
```

### 클라이언트 서버 주소 변경

`client/src/App.tsx` 파일의 소켓 연결 주소 수정:

```javascript
const newSocket = io("http://localhost:5000");
```

## 📝 라이센스

이 프로젝트는 개인 학습 목적으로 제작되었습니다.

## 🤝 기여

버그 리포트나 기능 제안은 이슈로 등록해주세요!
