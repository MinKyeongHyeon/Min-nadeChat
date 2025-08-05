const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: ['https://mingyeonghyeon.github.io', 'http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));

app.use(express.json());

// WebSocket 서버 생성
const wss = new WebSocket.Server({ server });

// 연결된 사용자들을 저장할 객체
const connectedUsers = new Map();
let currentVote = null;

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: 'Min-nade Chat Server is running!',
    status: 'healthy',
    connectedUsers: connectedUsers.size,
    maxUsers: 10,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    connectedUsers: connectedUsers.size,
    timestamp: new Date().toISOString(),
  });
});

// WebSocket 연결 처리
wss.on('connection', (ws) => {
  console.log(`새로운 클라이언트 연결`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      handleMessage(ws, data);
    } catch (error) {
      console.error('메시지 파싱 오류:', error);
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket 오류:', error);
  });
});

function handleMessage(ws, data) {
  switch (data.type) {
    case 'join':
      handleJoin(ws, data.username);
      break;
    case 'send_message':
      handleSendMessage(ws, data);
      break;
    case 'start_vote':
      handleStartVote(ws, data.targetUsername);
      break;
    case 'vote':
      handleVote(ws, data.approve);
      break;
  }
}

function handleJoin(ws, username) {
  console.log(`입장 요청: ${username}`);
  
  // 중복 이름 체크
  const existingUser = Array.from(connectedUsers.values()).find(
    user => user.username === username
  );
  if (existingUser) {
    console.log(`중복 이름 거부: ${username}`);
    ws.send(JSON.stringify({
      type: 'join_error',
      message: '이미 사용 중인 이름입니다.'
    }));
    return;
  }

  // 최대 10명 제한
  if (connectedUsers.size >= 10) {
    console.log(`인원 초과로 입장 거부: ${username}`);
    ws.send(JSON.stringify({
      type: 'join_error',
      message: '채팅방이 가득 찼습니다. (최대 10명)'
    }));
    return;
  }

  // 사용자 정보 저장
  connectedUsers.set(ws, {
    username,
    id: generateId(),
    joinTime: new Date(),
  });

  console.log(`입장 성공: ${username}, 현재 사용자 수: ${connectedUsers.size}`);
  
  ws.send(JSON.stringify({
    type: 'join_success',
    username: username
  }));

  // 모든 클라이언트에게 사용자 목록 업데이트 전송
  broadcast({
    type: 'users_update',
    users: Array.from(connectedUsers.values())
  });

  // 새로운 사용자 입장 메시지
  broadcast({
    type: 'user_joined',
    message: {
      type: 'system',
      message: `${username}님이 입장했습니다.`,
      timestamp: new Date().toISOString(),
    }
  }, ws);
}

function handleSendMessage(ws, data) {
  const user = connectedUsers.get(ws);
  if (!user) return;

  const message = {
    id: Date.now(),
    username: user.username,
    message: data.message,
    timestamp: new Date().toISOString(),
    type: 'user',
  };

  // 모든 클라이언트에게 메시지 전송
  broadcast({
    type: 'receive_message',
    message: message
  });
}

function handleStartVote(ws, targetUsername) {
  const user = connectedUsers.get(ws);
  if (!user) return;

  // 현재 진행 중인 투표가 있는지 확인
  if (currentVote) {
    ws.send(JSON.stringify({
      type: 'vote_error',
      message: '이미 진행 중인 투표가 있습니다.'
    }));
    return;
  }

  // 최소 3명 이상이어야 투표 가능
  if (connectedUsers.size < 3) {
    ws.send(JSON.stringify({
      type: 'vote_error',
      message: '투표를 시작하려면 최소 3명 이상이 필요합니다.'
    }));
    return;
  }

  // 대상 사용자 확인
  const targetUser = Array.from(connectedUsers.values()).find(
    u => u.username === targetUsername
  );
  if (!targetUser) {
    ws.send(JSON.stringify({
      type: 'vote_error',
      message: '해당 사용자를 찾을 수 없습니다.'
    }));
    return;
  }

  // 자신을 투표할 수 없음
  if (targetUser.id === user.id) {
    ws.send(JSON.stringify({
      type: 'vote_error',
      message: '자신을 강퇴할 수 없습니다.'
    }));
    return;
  }

  // 투표 시작
  currentVote = {
    target: targetUsername,
    targetId: targetUser.id,
    initiator: user.username,
    votes: new Set(),
    approvals: 0,
    startTime: new Date(),
    duration: 30000, // 30초
  };

  // 모든 클라이언트에게 투표 시작 알림
  broadcast({
    type: 'vote_started',
    target: targetUsername,
    initiator: user.username,
    duration: 30000,
  });

  // 30초 후 투표 종료
  setTimeout(() => {
    if (currentVote && currentVote.target === targetUsername) {
      endVote();
    }
  }, 30000);
}

function handleVote(ws, approve) {
  const user = connectedUsers.get(ws);
  if (!user || !currentVote) return;

  // 이미 투표했는지 확인
  if (currentVote.votes.has(user.id)) {
    ws.send(JSON.stringify({
      type: 'vote_error',
      message: '이미 투표하셨습니다.'
    }));
    return;
  }

  // 투표 대상은 투표할 수 없음
  if (user.id === currentVote.targetId) {
    ws.send(JSON.stringify({
      type: 'vote_error',
      message: '투표 대상은 투표할 수 없습니다.'
    }));
    return;
  }

  // 투표 기록
  currentVote.votes.add(user.id);
  if (approve) {
    currentVote.approvals++;
  }

  // 투표 상태 업데이트
  const totalVoters = connectedUsers.size - 1; // 투표 대상 제외
  const currentVotes = currentVote.votes.size;

  broadcast({
    type: 'vote_update',
    currentVotes,
    totalVoters,
    approvals: currentVote.approvals,
    target: currentVote.target,
  });

  // 모든 투표가 완료되었거나 과반수 달성 시 즉시 종료
  if (currentVotes >= totalVoters || currentVote.approvals > totalVoters / 2) {
    endVote();
  }
}

function endVote() {
  if (!currentVote) return;

  const totalVoters = connectedUsers.size - 1; // 투표 대상 제외
  const isKicked = currentVote.approvals > totalVoters / 2;

  if (isKicked) {
    // 강퇴 처리
    const targetWs = Array.from(connectedUsers.keys()).find(ws => 
      connectedUsers.get(ws)?.id === currentVote.targetId
    );
    
    if (targetWs) {
      targetWs.send(JSON.stringify({
        type: 'kicked',
        message: '투표에 의해 강퇴되었습니다.'
      }));
      targetWs.close();
    }

    // 강퇴 완료 메시지
    broadcast({
      type: 'receive_message',
      message: {
        type: 'system',
        message: `${currentVote.target}님이 투표에 의해 강퇴되었습니다.`,
        timestamp: new Date().toISOString(),
      }
    });
  } else {
    // 강퇴 실패 메시지
    broadcast({
      type: 'receive_message',
      message: {
        type: 'system',
        message: `${currentVote.target}님에 대한 강퇴 투표가 부결되었습니다.`,
        timestamp: new Date().toISOString(),
      }
    });
  }

  // 투표 종료 알림
  broadcast({
    type: 'vote_ended',
    target: currentVote.target,
    isKicked,
    approvals: currentVote.approvals,
    totalVoters,
  });

  currentVote = null;
}

function handleDisconnect(ws) {
  const user = connectedUsers.get(ws);
  if (user) {
    connectedUsers.delete(ws);

    // 투표 중인 사용자가 나갔을 때 처리
    if (currentVote && currentVote.targetId === user.id) {
      currentVote = null;
      broadcast({
        type: 'vote_cancelled',
        message: '투표 대상이 나가서 투표가 취소되었습니다.'
      });
    }

    // 모든 클라이언트에게 사용자 목록 업데이트 전송
    broadcast({
      type: 'users_update',
      users: Array.from(connectedUsers.values())
    });

    // 사용자 퇴장 메시지
    broadcast({
      type: 'user_left',
      message: {
        type: 'system',
        message: `${user.username}님이 퇴장했습니다.`,
        timestamp: new Date().toISOString(),
      }
    });

    console.log(`${user.username}님이 퇴장했습니다.`);
  }
}

function broadcast(message, exclude = null) {
  const messageStr = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageStr);
      } catch (error) {
        console.error('메시지 전송 오류:', error);
      }
    }
  });
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
  console.log(`WebSocket 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
