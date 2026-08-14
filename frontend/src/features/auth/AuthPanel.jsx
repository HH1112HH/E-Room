import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { API_BASE_URL } from '../../api/client';
import '../../styles/DevTools.css';

export function AuthPanel() {
  const [email, setEmail] = useState('demo@eroom.local');
  const [password, setPassword] = useState('password123');
  const [displayName, setDisplayName] = useState('Demo User');
  const [status, setStatus] = useState('Sẵn sàng');

  async function register() {
    setStatus('Đang đăng ký...');
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, first_name: displayName, last_name: displayName }),
    });
    setStatus(response.ok ? 'Đã đăng ký' : 'Đăng ký thất bại');
  }

  async function login() {
    setStatus('Đang đăng nhập...');
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('e-room-access-token', data.access_token);
      localStorage.setItem('e-room-refresh-token', data.refresh_token);
      setStatus('Đã đăng nhập');
      return;
    }
    setStatus(data.detail || 'Đăng nhập thất bại');
  }

  return (
    <Card title="Xác thực" subtitle="Đăng ký hoặc đăng nhập để lấy token">
      <div className="form-stack">
        <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Tên hiển thị" />
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
        <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mật khẩu" type="password" />
      </div>
      <div className="form-row mt-2">
        <button onClick={register}>Đăng ký</button>
        <button onClick={login}>Đăng nhập</button>
      </div>
      <p className="devtools-status">{status}</p>
    </Card>
  );
}
