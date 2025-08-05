import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (username: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username.trim());
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #60a5fa 0%, #a855f7 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        padding: '2rem',
        width: '100%',
        maxWidth: '384px'
      }}>
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#1f2937',
          marginBottom: '0.5rem'
        }}>
          Min-nade Chat!
        </h1>
        <p style={{
          color: '#6b7280',
          textAlign: 'center',
          marginBottom: '2rem'
        }}>모든 사람이 함께하는 채팅</p>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="username" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              활동할 이름을 입력하세요
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem',
                outline: 'none'
              }}
              placeholder="이름을 입력하세요..."
              maxLength={20}
              required
            />
          </div>
          
          <button
            type="submit"
            style={{
              width: '100%',
              backgroundColor: username.trim() ? '#3b82f6' : '#9ca3af',
              color: 'white',
              fontWeight: '500',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              cursor: username.trim() ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s'
            }}
            disabled={!username.trim()}
          >
            채팅방 입장
          </button>
        </form>
        
        <div style={{
          marginTop: '1.5rem',
          fontSize: '0.75rem',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          <p>• 최대 10명까지 동시 접속 가능</p>
          <p>• 중복된 이름은 사용할 수 없습니다</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
