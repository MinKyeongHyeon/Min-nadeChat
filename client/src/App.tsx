import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [username, setUsername] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentVote, setCurrentVote] = useState<any>(null);

  useEffect(() => {
    console.log('서버에 연결 시도:', SERVER_URL);
    
    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'], // 카페 와이파이 환경을 위한 fallback
      timeout: 20000,
      forceNew: true
    });
    setSocket(newSocket);

    // 연결 상태 이벤트
    newSocket.on('connect', () => {
      console.log('서버에 연결됨:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      console.log('서버와 연결 끊어짐');
    });

    newSocket.on('connect_error', (error) => {
      console.error('연결 오류:', error);
    });

    // 소켓 이벤트 리스너
    newSocket.on('join_success', (username: string) => {
      console.log('입장 성공:', username);
      setUsername(username);
      setIsLoggedIn(true);
    });

    newSocket.on('join_error', (error: string) => {
      console.error('입장 오류:', error);
      alert(error);
    });

    newSocket.on('users_update', (users: User[]) => {
      setUsers(users);
    });

    newSocket.on('receive_message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('user_joined', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('user_left', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('vote_started', (voteData: any) => {
      setCurrentVote(voteData);
    });

    newSocket.on('vote_update', (voteData: any) => {
      setCurrentVote((prev: any) => ({ ...prev, ...voteData }));
    });

    newSocket.on('vote_ended', (voteData: any) => {
      setCurrentVote(null);
    });

    newSocket.on('vote_cancelled', (message: string) => {
      setCurrentVote(null);
      alert(message);
    });

    newSocket.on('vote_error', (error: string) => {
      alert(error);
    });

    newSocket.on('kicked', (message: string) => {
      alert(message);
      setIsLoggedIn(false);
      setUsername('');
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleLogin = (username: string) => {
    if (socket) {
      console.log('입장 시도:', username, '소켓 연결 상태:', socket.connected);
      if (!socket.connected) {
        console.log('소켓이 연결되지 않음. 재연결 시도...');
        socket.connect();
      }
      socket.emit('join', username);
    } else {
      console.error('소켓이 없습니다.');
      alert('서버 연결에 실패했습니다. 페이지를 새로고침해주세요.');
    }
  };

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
      
      const newSocket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });
      setSocket(newSocket);
    }
    setIsLoggedIn(false);
    setUsername('');
    setUsers([]);
    setMessages([]);
    setCurrentVote(null);
  };

  const sendMessage = (message: string) => {
    if (socket && message.trim()) {
      socket.emit('send_message', { message });
    }
  };

  const startVote = (targetUsername: string) => {
    if (socket) {
      socket.emit('start_vote', targetUsername);
    }
  };

  const vote = (approve: boolean) => {
    if (socket) {
      socket.emit('vote', approve);
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
