import React, { useState, useEffect, useRef } from 'react';

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

interface ChatPageProps {
  username: string;
  users: User[];
  messages: Message[];
  currentVote: any;
  onLogout: () => void;
  onSendMessage: (message: string) => void;
  onStartVote: (targetUsername: string) => void;
  onVote: (approve: boolean) => void;
}

const ChatPage: React.FC<ChatPageProps> = ({
  username,
  users,
  messages,
  currentVote,
  onLogout,
  onSendMessage,
  onStartVote,
  onVote,
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      onSendMessage(inputMessage);
      setInputMessage('');
    }
  };

  const handleStartVote = () => {
    if (selectedUser && selectedUser !== username) {
      onStartVote(selectedUser);
      setShowVoteModal(false);
      setSelectedUser('');
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex' }}>
      {/* 메인 채팅 영역 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 헤더 */}
        <div style={{
          backgroundColor: 'white',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          borderBottom: '1px solid #e5e7eb',
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#1f2937'
          }}>Min-nade Chat!</h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowVoteModal(true)}
              style={{
                backgroundColor: users.length < 3 ? '#9ca3af' : '#ef4444',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: users.length < 3 ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
              disabled={users.length < 3}
            >
              강퇴 투표
            </button>
            <button
              onClick={onLogout}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              채팅 종료
            </button>
          </div>
        </div>

        {/* 투표 진행 중 알림 */}
        {currentVote && (
          <div style={{
            backgroundColor: '#fef3c7',
            borderLeft: '4px solid #f59e0b',
            padding: '1rem',
            margin: '1rem',
            borderRadius: '6px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#92400e' }}>
                  <strong>{currentVote.target}</strong>님에 대한 강퇴 투표가 진행 중입니다.
                </p>
                <p style={{ fontSize: '0.75rem', color: '#a16207', marginTop: '0.25rem' }}>
                  진행률: {currentVote.currentVotes || 0}/{currentVote.totalVoters || 0} | 
                  찬성: {currentVote.approvals || 0}
                </p>
              </div>
              {currentVote.target !== username && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => onVote(true)}
                    style={{
                      backgroundColor: '#ef4444',
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '4px',
                      border: 'none',
                      fontSize: '0.875rem',
                      cursor: 'pointer'
                    }}
                  >
                    찬성
                  </button>
                  <button
                    onClick={() => onVote(false)}
                    style={{
                      backgroundColor: '#6b7280',
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '4px',
                      border: 'none',
                      fontSize: '0.875rem',
                      cursor: 'pointer'
                    }}
                  >
                    반대
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 메시지 영역 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {messages.map((message) => (
              <div
                key={message.id || Date.now()}
                style={{
                  display: 'flex',
                  justifyContent: message.type === 'system' ? 'center' : 
                    message.username === username ? 'flex-end' : 'flex-start'
                }}
              >
                {message.type === 'system' ? (
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    backgroundColor: '#e5e7eb',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px'
                  }}>
                    {message.message}
                  </div>
                ) : (
                  <div
                    style={{
                      maxWidth: '24rem',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      backgroundColor: message.username === username ? '#3b82f6' : 'white',
                      color: message.username === username ? 'white' : 'black',
                      border: message.username === username ? 'none' : '1px solid #e5e7eb'
                    }}
                  >
                    <div style={{
                      fontSize: '0.75rem',
                      color: message.username === username ? 'rgba(255,255,255,0.7)' : '#6b7280',
                      marginBottom: '0.25rem'
                    }}>
                      {message.username} · {formatTime(message.timestamp)}
                    </div>
                    <div style={{ fontSize: '0.875rem' }}>{message.message}</div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 메시지 입력 영역 */}
        <div style={{
          backgroundColor: 'white',
          borderTop: '1px solid #e5e7eb',
          padding: '1rem'
        }}>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="메시지를 입력하세요..."
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                outline: 'none',
                fontSize: '1rem'
              }}
              maxLength={500}
            />
            <button
              type="submit"
              style={{
                backgroundColor: inputMessage.trim() ? '#3b82f6' : '#9ca3af',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                fontWeight: '500',
                cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s'
              }}
              disabled={!inputMessage.trim()}
            >
              전송
            </button>
          </form>
        </div>
      </div>

      {/* 사이드바 - 접속자 목록 */}
      <div style={{
        width: '16rem',
        backgroundColor: 'white',
        borderLeft: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            접속자 ({users.length}/10)
          </h2>
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {users.map((user) => (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  backgroundColor: user.username === username ? '#dbeafe' : 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    backgroundColor: '#10b981',
                    borderRadius: '50%',
                    marginRight: '0.5rem'
                  }}></div>
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    {user.username}
                    {user.username === username && ' (나)'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 강퇴 투표 모달 */}
      {showVoteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            width: '24rem'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              marginBottom: '1rem'
            }}>강퇴 투표 시작</h3>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '1rem'
            }}>
              강퇴할 사용자를 선택하세요. (최소 3명 이상일 때 가능)
            </p>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                marginBottom: '1rem',
                fontSize: '1rem'
              }}
            >
              <option value="">사용자 선택...</option>
              {users
                .filter(user => user.username !== username)
                .map(user => (
                  <option key={user.id} value={user.username}>
                    {user.username}
                  </option>
                ))}
            </select>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowVoteModal(false);
                  setSelectedUser('');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleStartVote}
                disabled={!selectedUser}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: selectedUser ? '#ef4444' : '#9ca3af',
                  color: 'white',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: selectedUser ? 'pointer' : 'not-allowed'
                }}
              >
                투표 시작
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
