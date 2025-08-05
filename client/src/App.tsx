import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import ChatPage from './components/ChatPage';
import { SERVER_URL } from './config';
import './App.css';

interface User {
  username: string;
  id: string;
  joinTime: Date;
}

interface Message {
  id: number;
  username: string;
  message: string;
  timestamp: string;
  type: 'user' | 'system';
}

const App: React.FC = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [username, setUsername] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentVote, setCurrentVote] = useState<any>(null);

  useEffect(() => {
    console.log('WebSocket 연결 시도:', SERVER_URL);
    
    const ws = new WebSocket(SERVER_URL);
    setSocket(ws);

    ws.onopen = () => {
      console.log('WebSocket 연결됨');
    };

    ws.onclose = () => {
      console.log('WebSocket 연결 끊어짐');
      // 자동 재연결 시도
      setTimeout(() => {
        console.log('재연결 시도...');
        const newWs = new WebSocket(SERVER_URL);
        setSocket(newWs);
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket 오류:', error);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch (error) {
        console.error('메시지 파싱 오류:', error);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleMessage = (data: any) => {
    console.log('받은 메시지:', data);
    
    switch (data.type) {
      case 'join_success':
        console.log('입장 성공:', data.username);
        setUsername(data.username);
        setIsLoggedIn(true);
        break;
      case 'join_error':
        console.error('입장 오류:', data.message);
        alert(data.message);
        break;
      case 'users_update':
        setUsers(data.users);
        break;
      case 'receive_message':
        setMessages(prev => [...prev, data.message]);
        break;
      case 'user_joined':
      case 'user_left':
        setMessages(prev => [...prev, data.message]);
        break;
      case 'vote_started':
        setCurrentVote(data);
        break;
      case 'vote_update':
        setCurrentVote(prev => ({ ...prev, ...data }));
        break;
      case 'vote_ended':
        setCurrentVote(null);
        break;
      case 'vote_cancelled':
        setCurrentVote(null);
        alert(data.message);
        break;
      case 'kicked':
        alert(data.message);
        setIsLoggedIn(false);
        setUsername('');
        break;
      case 'vote_error':
        alert(data.message);
        break;
    }
  };

  const handleLogin = (username: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log('입장 시도:', username);
      socket.send(JSON.stringify({
        type: 'join',
        username: username
      }));
    } else {
      console.error('WebSocket이 연결되지 않음. 상태:', socket?.readyState);
      alert('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setUsers([]);
    setMessages([]);
    setCurrentVote(null);
  };

  const sendMessage = (message: string) => {
    if (socket && socket.readyState === WebSocket.OPEN && message.trim()) {
      socket.send(JSON.stringify({
        type: 'send_message',
        message: message
      }));
    }
  };

  const startVote = (targetUsername: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'start_vote',
        targetUsername: targetUsername
      }));
    }
  };

  const vote = (approve: boolean) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'vote',
        approve: approve
      }));
    }
  };

  return (
    <div className="App">
      {!isLoggedIn ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <ChatPage
          username={username}
          users={users}
          messages={messages}
          currentVote={currentVote}
          onLogout={handleLogout}
          onSendMessage={sendMessage}
          onStartVote={startVote}
          onVote={vote}
        />
      )}
    </div>
  );
};

export default App;
