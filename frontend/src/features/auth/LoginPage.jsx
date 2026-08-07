import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
import ProgressBar from 'react-bootstrap/ProgressBar';
import {
  HiEye, HiEyeSlash, HiCheck, HiExclamationTriangle, HiArrowRight,
  HiUser, HiLockClosed, HiEnvelope,
} from 'react-icons/hi2';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import { useAuth, IS_DEMO_MODE } from '../../app/AuthContext';
import { Logo } from '../../components/ui/Logo';

import '../../styles/LoginPage.css';

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { score: 0, label: '', color: '' },
    { score: 1, label: 'Weak', color: '#ef4444' },
    { score: 2, label: 'Fair', color: '#f59e0b' },
    { score: 3, label: 'Good', color: '#16a34a' },
    { score: 4, label: 'Strong', color: '#16a34a' },
    { score: 5, label: 'Great', color: '#16a34a' },
  ];
  return map[Math.min(score, 5)];
}

export function LoginPage() {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const strength = getPasswordStrength(password);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (isRegister && !agreeTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }
    setBusy(true);
    try {
      if (isRegister) {
        await register(email, password, firstName, lastName);
        await login(email, password);
      } else {
        await login(email, password);
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  function toggleMode() {
    setIsRegister(prev => !prev);
    setError('');
    setAgreeTerms(false);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <div className="login-card__logo"><Logo size={44} /></div>
          <h1 className="login-card__title">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="login-card__desc">
            {isRegister ? 'Start your English speaking journey' : 'Sign in to continue practicing'}
          </p>
        </div>

        <div className="login-social">
          <button type="button" className="login-social-btn"><FcGoogle size={20} /> Google</button>
          <button type="button" className="login-social-btn"><FaGithub size={20} /> GitHub</button>
        </div>

        <div className="login-divider"><span>or email</span></div>
        {IS_DEMO_MODE && (
          <button
            type="button"
            className="login-submit login-submit--demo"
            style={{ background: 'var(--color-accent)', marginBottom: 12 }}
            onClick={() => { setBusy(true); login('demo@e-room.local', 'demo').then(() => navigate('/', { replace: true })).finally(() => setBusy(false)); }}
          >
            Continue as Demo (skip login)
          </button>
        )}
        <Form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="login-name-row">
              <div className="login-field">
                <label className="login-field__label">First Name</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><HiUser size={16} /></span>
                  <Form.Control type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First" required className="login-input" />
                </div>
              </div>
              <div className="login-field">
                <label className="login-field__label">Last Name</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><HiUser size={16} /></span>
                  <Form.Control type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last" required className="login-input" />
                </div>
              </div>
            </div>
          )}

          <div className="login-field">
            <label className="login-field__label">Email Address</label>
            <div className="login-input-wrap">
              <span className="login-input-icon"><HiEnvelope size={16} /></span>
              <Form.Control type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus required className="login-input" />
            </div>
          </div>

          <div className="login-field">
            <label className="login-field__label">Password</label>
            <div className="login-input-wrap">
              <span className="login-input-icon"><HiLockClosed size={16} /></span>
              <Form.Control type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="password" required minLength={8} autoComplete="current-password" className="login-input" />
              <button type="button" className="login-input-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                {showPassword ? <HiEyeSlash size={16} /> : <HiEye size={16} />}
              </button>
            </div>
          </div>

          {isRegister && password && (
            <div style={{ marginBottom: 16 }}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <small className="login-strength-label">Password strength</small>
                <small className="fw-semibold login-strength-label" style={{ color: strength.color }}>{strength.label}</small>
              </div>
              <ProgressBar
                now={strength.score * 20}
                variant={strength.score <= 1 ? 'danger' : strength.score <= 2 ? 'warning' : strength.score <= 3 ? 'info' : 'success'}
                className="login-strength-bar"
              />
              <div className="d-flex flex-wrap gap-2 mt-2">
                {[
                  { ok: password.length >= 8, text: '8+ chars' },
                  { ok: /[A-Z]/.test(password), text: 'Uppercase' },
                  { ok: /[0-9]/.test(password), text: 'Number' },
                  { ok: /[^A-Za-z0-9]/.test(password), text: 'Symbol' },
                ].map((r, i) => (
                  <small key={i} className={`login-check-item${r.ok ? ' login-check-item--ok' : ''}`}>
                    <HiCheck size={12} style={{ opacity: r.ok ? 1 : 0.3 }} /> {r.text}
                  </small>
                ))}
              </div>
            </div>
          )}

          {!isRegister && (
            <div className="login-forgot">
              <button type="button" className="login-link-btn">Forgot password?</button>
            </div>
          )}

          {isRegister && (
            <div className="login-field">
              <Form.Check type="checkbox" id="agree-terms"
                checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)}
                label={<span className="login-terms">I agree to the <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a></span>}
              />
            </div>
          )}

          {error && (
            <Alert variant="danger" className="login-alert">
              <HiExclamationTriangle size={16} className="login-alert-icon" />
              {error}
            </Alert>
          )}

          <button type="submit" className="login-submit" disabled={busy}>
            {busy ? <><Spinner animation="border" size="sm" /> Please wait...</> : <>{isRegister ? 'Create Account' : 'Sign In'} <HiArrowRight size={18} /></>}
          </button>
        </Form>

        <p className="login-footer">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" className="login-link-btn fw-semibold" onClick={toggleMode}>
            {isRegister ? 'Sign in' : 'Create free account'}
          </button>
        </p>
      </div>
    </div>
  );
}
