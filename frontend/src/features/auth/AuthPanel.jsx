import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';
import { API_BASE_URL } from '../../api/client';
import '../../styles/DevTools.css';

export function AuthPanel() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('demo@eroom.local');
  const [password, setPassword] = useState('password123');
  const [displayName, setDisplayName] = useState('Demo User');
  const [status, setStatus] = useState(t('auth.status_ready'));

  async function register() {
    setStatus(t('auth.creating_account'));
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, first_name: displayName, last_name: displayName }),
    });
    setStatus(response.ok ? t('auth.registered') : t('auth.register_failed'));
  }

  async function login() {
    setStatus(t('auth.signing_in'));
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('e-room-access-token', data.access_token);
      localStorage.setItem('e-room-refresh-token', data.refresh_token);
      setStatus(t('auth.signed_in'));
      return;
    }
    setStatus(data.detail || t('auth.login_failed'));
  }

  return (
    <Card title={t('auth.panel_title')} subtitle={t('auth.panel_subtitle')}>
      <div className="form-stack">
        <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder={t('auth.display_name')} />
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t('auth.email')} />
        <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t('auth.password')} type="password" />
      </div>
      <div className="form-row mt-2">
        <button onClick={register}>{t('auth.register')}</button>
        <button onClick={login}>{t('auth.login')}</button>
      </div>
      <p className="devtools-status">{status}</p>
    </Card>
  );
}