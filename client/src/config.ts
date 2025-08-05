// 환경별 서버 URL 설정
const getServerUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // 배포 시 Railway.app 또는 Render.com URL로 변경 예정
    return 'wss://min-nade-chat-production.up.railway.app';
  }
  return 'ws://localhost:4001';
};

export const SERVER_URL = getServerUrl();
