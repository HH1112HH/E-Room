import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { API_BASE_URL } from '../../api/client';
import '../../styles/DevTools.css';

export function AuthPanel() {
  const [email, setEmail] = useState('demo@eroom.local');
  const [password, setPassword] = useState('password123');
  const [displayName, setDisplayName] = useState('Demo User');
  const [status, setStatus] = useState('Idle');

  async function register() {
    setStatus('Registering...');
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, first_name: displayName, last_name: displayName }),
    });
    setStatus(response.ok ? 'Registered' : 'Register failed');
  }

  async function login() {
    setStatus('Logging in...');
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('e-room-access-token', data.access_token);
      localStorage.setItem('e-room-refresh-token', data.refresh_token);
      setStatus('Logged in');
      return;
    }
    setStatus(data.detail || 'Login failed');
  }

  return (
    <Card title="Auth" subtitle="Register or login to get tokens">
      <div className="form-stack">
        <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" />
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
        <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" />
      </div>
      <div className="form-row mt-2">
        <button onClick={register}>Register</button>
        <button onClick={login}>Login</button>
      </div>
      <p className="devtools-status">{status}</p>
    </Card>
  );
}
