import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// CORS 설정
app.use(
  "*",
  cors({
    origin: [
      "https://mingyeonghyeon.github.io",
      "http://localhost:3000",
      "http://localhost:3002",
    ],
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// 연결된 사용자들을 저장할 객체 (Durable Objects 사용 권장하지만 간단히 메모리 사용)
let connectedUsers = new Map();
let currentVote = null;

// WebSocket 연결을 위한 Durable Object
class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();
    this.connectedUsers = new Map();
    this.currentVote = null;
  }

  async fetch(request) {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.handleSession(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  handleSession(webSocket) {
    webSocket.accept();
    this.sessions.add(webSocket);

    webSocket.addEventListener("message", async (event) => {
      try {
        const data = JSON.parse(event.data);
        await this.handleMessage(webSocket, data);
      } catch (error) {
        console.error("메시지 처리 오류:", error);
      }
    });

    webSocket.addEventListener("close", () => {
      this.sessions.delete(webSocket);
      this.handleDisconnect(webSocket);
    });
  }

  async handleMessage(webSocket, data) {
    switch (data.type) {
      case "join":
        await this.handleJoin(webSocket, data.username);
        break;
      case "send_message":
        await this.handleSendMessage(webSocket, data);
        break;
      case "start_vote":
        await this.handleStartVote(webSocket, data.targetUsername);
        break;
      case "vote":
        await this.handleVote(webSocket, data.approve);
        break;
    }
  }

  async handleJoin(webSocket, username) {
    // 중복 이름 체크
    const existingUser = Array.from(this.connectedUsers.values()).find(
      (user) => user.username === username
    );
    if (existingUser) {
      webSocket.send(
        JSON.stringify({
          type: "join_error",
          message: "이미 사용 중인 이름입니다.",
        })
      );
      return;
    }

    // 최대 10명 제한
    if (this.connectedUsers.size >= 10) {
      webSocket.send(
        JSON.stringify({
          type: "join_error",
          message: "채팅방이 가득 찼습니다. (최대 10명)",
        })
      );
      return;
    }

    // 사용자 정보 저장
    const userId = crypto.randomUUID();
    this.connectedUsers.set(webSocket, {
      username,
      id: userId,
      joinTime: new Date(),
    });

    webSocket.send(
      JSON.stringify({
        type: "join_success",
        username: username,
      })
    );

    // 모든 클라이언트에게 사용자 목록 업데이트 전송
    this.broadcast({
      type: "users_update",
      users: Array.from(this.connectedUsers.values()),
    });

    // 새로운 사용자 입장 메시지
    this.broadcast(
      {
        type: "user_joined",
        message: {
          type: "system",
          message: `${username}님이 입장했습니다.`,
          timestamp: new Date().toISOString(),
        },
      },
      webSocket
    );

    console.log(`${username}님이 입장했습니다.`);
  }

  async handleSendMessage(webSocket, data) {
    const user = this.connectedUsers.get(webSocket);
    if (!user) return;

    const message = {
      id: Date.now(),
      username: user.username,
      message: data.message,
      timestamp: new Date().toISOString(),
      type: "user",
    };

    // 모든 클라이언트에게 메시지 전송
    this.broadcast({
      type: "receive_message",
      message: message,
    });
  }

  handleDisconnect(webSocket) {
    const user = this.connectedUsers.get(webSocket);
    if (user) {
      this.connectedUsers.delete(webSocket);

      // 투표 중인 사용자가 나갔을 때 처리
      if (this.currentVote && this.currentVote.targetId === user.id) {
        this.currentVote = null;
        this.broadcast({
          type: "vote_cancelled",
          message: "투표 대상이 나가서 투표가 취소되었습니다.",
        });
      }

      // 모든 클라이언트에게 사용자 목록 업데이트 전송
      this.broadcast({
        type: "users_update",
        users: Array.from(this.connectedUsers.values()),
      });

      // 사용자 퇴장 메시지
      this.broadcast({
        type: "user_left",
        message: {
          type: "system",
          message: `${user.username}님이 퇴장했습니다.`,
          timestamp: new Date().toISOString(),
        },
      });

      console.log(`${user.username}님이 퇴장했습니다.`);
    }
  }

  broadcast(message, exclude = null) {
    const messageStr = JSON.stringify(message);
    this.sessions.forEach((session) => {
      if (
        session !== exclude &&
        session.readyState === WebSocket.READY_STATE_OPEN
      ) {
        try {
          session.send(messageStr);
        } catch (error) {
          console.error("메시지 전송 오류:", error);
        }
      }
    });
  }
}

// 기본 라우트
app.get("/", (c) => {
  return c.json({
    message: "Min-nade Chat Server is running!",
    status: "healthy",
    connectedUsers: connectedUsers.size,
    maxUsers: 10,
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    uptime: process.uptime(),
    connectedUsers: connectedUsers.size,
    timestamp: new Date().toISOString(),
  });
});

// WebSocket 연결 핸들러
app.get("/websocket", async (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (upgradeHeader !== "websocket") {
    return c.text("Expected Upgrade: websocket", 426);
  }

  const chatRoomId = c.env.CHAT_ROOM.idFromName("main-room");
  const chatRoom = c.env.CHAT_ROOM.get(chatRoomId);
  return chatRoom.fetch(c.req.raw);
});

export default app;
export { ChatRoom };
