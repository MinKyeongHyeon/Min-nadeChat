const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// 연결된 사용자들을 저장할 객체
const connectedUsers = new Map();
// 진행 중인 투표를 저장할 객체
let currentVote = null;

io.on("connection", (socket) => {
  console.log(`새로운 클라이언트 연결: ${socket.id}`);

  // 사용자 로그인
  socket.on("join", (username) => {
    console.log(`입장 요청: ${username} (소켓 ID: ${socket.id})`);
    
    // 중복 이름 체크
    const existingUser = Array.from(connectedUsers.values()).find(
      (user) => user.username === username
    );
    if (existingUser) {
      console.log(`중복 이름 거부: ${username}`);
      socket.emit("join_error", "이미 사용 중인 이름입니다.");
      return;
    }

    // 최대 10명 제한
    if (connectedUsers.size >= 10) {
      console.log(`인원 초과로 입장 거부: ${username}`);
      socket.emit("join_error", "채팅방이 가득 찼습니다. (최대 10명)");
      return;
    }

    // 사용자 정보 저장
    connectedUsers.set(socket.id, {
      username,
      id: socket.id,
      joinTime: new Date(),
    });

    console.log(`입장 성공: ${username}, 현재 사용자 수: ${connectedUsers.size}`);
    socket.emit("join_success", username);

    // 모든 클라이언트에게 사용자 목록 업데이트 전송
    io.emit("users_update", Array.from(connectedUsers.values()));

    // 새로운 사용자 입장 메시지
    socket.broadcast.emit("user_joined", {
      type: "system",
      message: `${username}님이 입장했습니다.`,
      timestamp: new Date().toISOString(),
    });

    console.log(`${username}님이 입장했습니다.`);
  });

  // 메시지 전송
  socket.on("send_message", (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const message = {
      id: Date.now(),
      username: user.username,
      message: data.message,
      timestamp: new Date().toISOString(),
      type: "user",
    };

    // 모든 클라이언트에게 메시지 전송
    io.emit("receive_message", message);
  });

  // 투표 시작
  socket.on("start_vote", (targetUsername) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    // 현재 진행 중인 투표가 있는지 확인
    if (currentVote) {
      socket.emit("vote_error", "이미 진행 중인 투표가 있습니다.");
      return;
    }

    // 최소 3명 이상이어야 투표 가능
    if (connectedUsers.size < 3) {
      socket.emit(
        "vote_error",
        "투표를 시작하려면 최소 3명 이상이 필요합니다."
      );
      return;
    }

    // 대상 사용자 확인
    const targetUser = Array.from(connectedUsers.values()).find(
      (u) => u.username === targetUsername
    );
    if (!targetUser) {
      socket.emit("vote_error", "해당 사용자를 찾을 수 없습니다.");
      return;
    }

    // 자신을 투표할 수 없음
    if (targetUser.id === socket.id) {
      socket.emit("vote_error", "자신을 강퇴할 수 없습니다.");
      return;
    }

    // 투표 시작
    currentVote = {
      target: targetUsername,
      targetId: targetUser.id,
      initiator: user.username,
      votes: new Set(),
      startTime: new Date(),
      duration: 30000, // 30초
    };

    // 모든 클라이언트에게 투표 시작 알림
    io.emit("vote_started", {
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
  });

  // 투표하기
  socket.on("vote", (approve) => {
    const user = connectedUsers.get(socket.id);
    if (!user || !currentVote) return;

    // 이미 투표했는지 확인
    if (currentVote.votes.has(socket.id)) {
      socket.emit("vote_error", "이미 투표하셨습니다.");
      return;
    }

    // 투표 대상은 투표할 수 없음
    if (socket.id === currentVote.targetId) {
      socket.emit("vote_error", "투표 대상은 투표할 수 없습니다.");
      return;
    }

    // 투표 기록
    currentVote.votes.add(socket.id);
    if (approve) {
      currentVote.approvals = (currentVote.approvals || 0) + 1;
    }

    // 투표 상태 업데이트
    const totalVoters = connectedUsers.size - 1; // 투표 대상 제외
    const currentVotes = currentVote.votes.size;
    const approvals = currentVote.approvals || 0;

    io.emit("vote_update", {
      currentVotes,
      totalVoters,
      approvals,
      target: currentVote.target,
    });

    // 모든 투표가 완료되었거나 과반수 달성 시 즉시 종료
    if (currentVotes >= totalVoters || approvals > totalVoters / 2) {
      endVote();
    }
  });

  // 투표 종료 함수
  function endVote() {
    if (!currentVote) return;

    const totalVoters = connectedUsers.size - 1; // 투표 대상 제외
    const approvals = currentVote.approvals || 0;
    const isKicked = approvals > totalVoters / 2;

    if (isKicked) {
      // 강퇴 처리
      const targetSocket = io.sockets.sockets.get(currentVote.targetId);
      if (targetSocket) {
        targetSocket.emit("kicked", "투표에 의해 강퇴되었습니다.");
        targetSocket.disconnect();
      }

      // 강퇴된 사용자 제거
      connectedUsers.delete(currentVote.targetId);

      // 강퇴 완료 메시지
      io.emit("receive_message", {
        type: "system",
        message: `${currentVote.target}님이 투표에 의해 강퇴되었습니다.`,
        timestamp: new Date().toISOString(),
      });
    } else {
      // 강퇴 실패 메시지
      io.emit("receive_message", {
        type: "system",
        message: `${currentVote.target}님에 대한 강퇴 투표가 부결되었습니다.`,
        timestamp: new Date().toISOString(),
      });
    }

    // 투표 종료 알림
    io.emit("vote_ended", {
      target: currentVote.target,
      isKicked,
      approvals,
      totalVoters,
    });

    // 사용자 목록 업데이트
    io.emit("users_update", Array.from(connectedUsers.values()));

    currentVote = null;
  }

  // 연결 해제
  socket.on("disconnect", () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      connectedUsers.delete(socket.id);

      // 투표 중인 사용자가 나갔을 때 처리
      if (currentVote && currentVote.targetId === socket.id) {
        currentVote = null;
        io.emit("vote_cancelled", "투표 대상이 나가서 투표가 취소되었습니다.");
      }

      // 모든 클라이언트에게 사용자 목록 업데이트 전송
      io.emit("users_update", Array.from(connectedUsers.values()));

      // 사용자 퇴장 메시지
      socket.broadcast.emit("user_left", {
        type: "system",
        message: `${user.username}님이 퇴장했습니다.`,
        timestamp: new Date().toISOString(),
      });

      console.log(`${user.username}님이 퇴장했습니다.`);
    }
  });
});

// 기본 라우트 및 헬스체크
app.get("/", (req, res) => {
  res.json({
    message: "Min-nade Chat Server is running!",
    status: "healthy",
    connectedUsers: connectedUsers.size,
    maxUsers: 10,
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    connectedUsers: connectedUsers.size,
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
