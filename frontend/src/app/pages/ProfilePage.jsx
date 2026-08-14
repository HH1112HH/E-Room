import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
import Badge from 'react-bootstrap/Badge';
import {
  HiArrowRightOnRectangle,
  HiBell,
  HiBookOpen,
  HiCalendarDays,
  HiCheckCircle,
  HiCog6Tooth,
  HiCreditCard,
  HiDocumentText,
  HiExclamationTriangle,
  HiPencil,
  HiPlusCircle,
  HiShieldCheck,
  HiSparkles,
  HiUserCircle,
  HiBars3,
} from 'react-icons/hi2';
import { useAuth } from '../AuthContext';
import { fetchJson } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { useTheme } from '../../context/ThemeContext';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { CreateRoomModal } from '../../features/rooms/CreateRoomModal';
import '../../styles/ProfilePage.css';

const sections = [
  { key: 'overview', labelKey: 'common.user_info', icon: HiUserCircle },
  { key: 'sessions', labelKey: 'common.session_history', icon: HiBookOpen },
  { key: 'notes', labelKey: 'notes.title', icon: HiDocumentText },
  { key: 'schedule', labelKey: 'common.schedule_rooms', icon: HiCalendarDays },
];

const accountSections = [
  { key: 'subscription', labelKey: 'common.subscription', icon: HiCreditCard },
  { key: 'settings', labelKey: 'nav.settings', icon: HiCog6Tooth },
];

const plans = [
  { key: 'free', name: 'Free', price: '$0', featureKeys: ['subscription.feat_5_rooms_day', 'subscription.feat_basic_ai', 'subscription.feat_standard_matching'] },
  { key: 'pro', name: 'Pro', priceKey: 'subscription.price_pro', featureKeys: ['subscription.feat_unlimited_rooms', 'subscription.feat_advanced_ai', 'subscription.feat_priority_matching', 'subscription.feat_session_notes'], popular: true },
  { key: 'pro_plus', name: 'Pro+', priceKey: 'subscription.price_pro_plus', featureKeys: ['subscription.feat_all_pro', 'subscription.feat_tts_voice', 'subscription.feat_expert_rag', 'subscription.feat_leaderboard'] },
];

function getSessionTitle(session, t) {
  return session.topic || session.room?.topic || session.title || t('sessions.practice_session');
}

function getSessionDate(session, t) {
  const raw = session.created_at || session.started_at || session.updated_at || session.timestamp;
  if (!raw) return t('sessions.no_date');
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(raw));
}

function formatDuration(seconds) {
  if (!seconds) return '--';
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes}m`;
}

function ProfileSidebar({ activeSection, onSelect, user, sessionsCount, tier }) {
  const { t } = useTranslation();
  const initials = (user.display_name || user.email || 'U').slice(0, 1).toUpperCase();

  return (
    <aside className="profile-sidebar">
      <div className="profile-sidebar__identity">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-sidebar__identity-text">
          <strong>{user.display_name || t('common.eroom_learner')}</strong>
          <span>{user.email}</span>
        </div>
      </div>

      <nav className="profile-sidebar__nav">
        {sections.map((section) => <SidebarButton key={section.key} section={section} active={activeSection === section.key} onSelect={onSelect} />)}
      </nav>

      <nav className="profile-sidebar__nav profile-sidebar__nav--account">
        {accountSections.map((section) => <SidebarButton key={section.key} section={section} active={activeSection === section.key} onSelect={onSelect} />)}
      </nav>
    </aside>
  );
}

function SidebarButton({ section, active, onSelect }) {
  const { t } = useTranslation();
  const Icon = section.icon;
  return (
    <button type="button" className={`profile-sidebar__btn${active ? ' is-active' : ''}`} onClick={() => onSelect(section.key)} aria-current={active ? 'page' : undefined}>
      <Icon size={18} />
      <span>{t(section.labelKey)}</span>
    </button>
  );
}

function ProfileHeader({ user, sessionsCount, tier, activeSection }) {
  const { t } = useTranslation();
  const sectionTitle = [...sections, ...accountSections].find((section) => section.key === activeSection)?.labelKey || 'common.dashboard';
  return (
    <header className="profile-header">
      <h1>{t(sectionTitle)}</h1>
      <div className="profile-header__stats">
        <span><strong>{sessionsCount}</strong> {t('common.sessions_count')}</span>
        <span><strong>{tier === 'pro_plus' ? 'Pro+' : tier === 'pro' ? 'Pro' : 'Free'}</strong> {t('common.plan')}</span>
        <span><strong>{user.display_name ? t('common.ready') : t('common.setup')}</strong> {t('nav.profile')}</span>
      </div>
    </header>
  );
}

function UserInfoSection({ user, displayName, setDisplayName, editing, setEditing, saveMutation }) {
  const { t } = useTranslation();

  function cancelEdit() {
    setDisplayName(user.display_name || '');
    setEditing(false);
  }

  return (
    <section className="profile-section">
      <div className="profile-section__head">
        <h2>{t('common.personal_info')}</h2>
        {!editing && <Button variant="outline-primary" onClick={() => setEditing(true)}><HiPencil size={16} /> {t('common.edit')}</Button>}
      </div>

      <div className="profile-form-grid">
        <Form.Group>
          <Form.Label>{t('auth.display_name')}</Form.Label>
          <Form.Control value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={!editing} />
        </Form.Group>
        <Form.Group>
          <Form.Label>{t('auth.email_label')}</Form.Label>
          <Form.Control type="email" value={user.email || ''} disabled />
        </Form.Group>
        <Form.Group>
          <Form.Label>{t('learning.level_label')}</Form.Label>
          <Form.Control value={user.english_level || t('common.not_set_up')} disabled />
        </Form.Group>
        <Form.Group>
          <Form.Label>{t('common.preferred_language')}</Form.Label>
          <Form.Select disabled={!editing} defaultValue="Vietnamese">
            <option>Vietnamese</option>
            <option>English</option>
          </Form.Select>
        </Form.Group>
      </div>

      {editing && (
        <div className="profile-actions">
          <Button variant="primary" disabled={saveMutation.isPending || !displayName.trim()} onClick={() => saveMutation.mutate({ display_name: displayName.trim() })}>
            {saveMutation.isPending ? <><Spinner animation="border" size="sm" /> {t('onboarding.saving')}</> : <><HiCheckCircle size={16} /> {t('common.save_changes')}</>}
          </Button>
          <Button variant="outline-secondary" onClick={cancelEdit}>{t('common.cancel')}</Button>
        </div>
      )}
    </section>
  );
}

function SessionsSection({ sessions, isLoading, isError, onRetry }) {
  const { t } = useTranslation();
  return (
    <section className="profile-section">
      <div className="profile-section__head">
        <h2>{t('common.session_history')}</h2>
        <Button as={Link} to="/learning" variant="outline-primary">{t('sessions.find_room')}</Button>
      </div>

      {isLoading && <LoadingRows />}
      {isError && <ErrorState title={t('sessions.load_failed')} text={t('sessions.load_failed_desc')} onRetry={onRetry} />}
      {!isLoading && !isError && sessions.length === 0 && (
        <EmptyState title={t('sessions.none_completed')} text={t('sessions.none_completed_desc')} action={<Button as={Link} to="/learning" variant="primary">{t('common.open_room')}</Button>} />
      )}
      {!isLoading && !isError && sessions.length > 0 && (
        <div className="profile-session-list">
          {sessions.map((session) => (
            <article className="profile-session" key={session.id || `${getSessionTitle(session, t)}-${getSessionDate(session, t)}`}>
              <div className="profile-session__duration"><strong>{formatDuration(session.duration_seconds)}</strong><span>{t('sessions.duration')}</span></div>
              <div>
                <h3>{getSessionTitle(session, t)}</h3>
                <p>{getSessionDate(session, t)}</p>
                <div className="profile-session__tags">
                  {(session.tags || session.room?.tags || []).slice(0, 3).map((tag) => <span key={tag}>#{typeof tag === 'string' ? tag : tag.name}</span>)}
                </div>
              </div>
              {session.overall_score != null && <Badge bg={session.overall_score > 7 ? 'success' : session.overall_score > 4 ? 'warning' : 'secondary'} className="profile-session__score">{session.overall_score}/10</Badge>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function NotesSection() {
  const { t } = useTranslation();
  return (
    <section className="profile-section">
      <div className="profile-section__head">
        <h2>{t('notes.title')}</h2>
        <Button as={Link} to="/notes" variant="outline-primary">{t('common.open_notes')}</Button>
      </div>
      <EmptyState title={t('notes.here_title')} text={t('notes.here_desc')} action={<Button as={Link} to="/notes" variant="primary">{t('notes.go_to_notes')}</Button>} />
    </section>
  );
}

function ScheduleSection({ onCreateRoom }) {
  const { t } = useTranslation();
  return (
    <section className="profile-section">
      <div className="profile-section__head">
        <h2>{t('common.schedule_rooms')}</h2>
      </div>
      <div className="profile-schedule">
        <h3>{t('common.prepare_next_room')}</h3>
        <p>{t('common.schedule_desc')}</p>
        <Button variant="primary" onClick={onCreateRoom}><HiPlusCircle size={18} /> {t('learning.create_room')}</Button>
      </div>
    </section>
  );
}

function SubscriptionSection({ tier }) {
  const { t } = useTranslation();
  return (
    <section className="profile-section">
      <div className="profile-section__head">
        <h2>{t('common.subscription')}</h2>
      </div>
      <div className="profile-plan-grid">
        {plans.map((plan) => {
          const current = plan.key === tier;
          return (
            <article className={`profile-plan${plan.popular ? ' is-popular' : ''}`} key={plan.key}>
              <div className="profile-plan__top">
                <h3>{plan.name}</h3>
                {current && <Badge bg="success">{t('common.current')}</Badge>}
                {plan.popular && !current && <Badge bg="primary">{t('subscription.popular')}</Badge>}
              </div>
              <strong className="profile-plan__price">{plan.priceKey ? t(plan.priceKey) : plan.price}</strong>
              <ul>{plan.featureKeys.map((featureKey) => <li key={featureKey}><HiCheckCircle size={14} /> {t(featureKey)}</li>)}</ul>
              {plan.key === 'free' ? (
                <Button variant="outline-secondary" className="w-100" disabled={current}>{t('subscription.free_plan')}</Button>
              ) : (
                <Button as={Link} to={`/payment?plan=${plan.key}`} variant={plan.popular ? 'primary' : 'outline-primary'} className="w-100">{current ? t('subscription.manage_subscription') : t('subscription.upgrade')}</Button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SettingsSection({ logout, onLogout }) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  return (
    <section className="profile-section">
      <div className="profile-section__head">
        <h2>{t('nav.settings')}</h2>
      </div>
      <div className="profile-settings-list">
        <div className="profile-settings-item">
          <HiBell size={18} />
          <div className="profile-settings-item__body">
            <h3>{t('common.notifications')}</h3>
            <Form.Check type="switch" id="match-notifications" label={t('common.notif_match')} defaultChecked />
            <Form.Check type="switch" id="session-reminders" label={t('common.notif_session')} defaultChecked />
            <Form.Check type="switch" id="email-updates" label={t('common.notif_email')} />
          </div>
        </div>
        <div className="profile-settings-item">
          <HiShieldCheck size={18} />
          <div className="profile-settings-item__body">
            <h3>{t('common.privacy')}</h3>
            <Form.Check type="switch" id="show-profile" label={t('common.privacy_show_profile')} defaultChecked />
            <Form.Check type="switch" id="show-leaderboard" label={t('common.privacy_show_leaderboard')} defaultChecked />
          </div>
        </div>
        <div className="profile-settings-item">
          <HiSparkles size={18} />
          <div className="profile-settings-item__body">
            <h3>{t('common.appearance')}</h3>
            <p>{t('common.current_theme', { theme })}</p>
            <Button variant="outline-primary" onClick={toggleTheme}>{t('common.change_theme')}</Button>
          </div>
        </div>
        <div className="profile-settings-item">
          <HiExclamationTriangle size={18} />
          <div className="profile-settings-item__body">
            <h3>{t('common.account_access')}</h3>
            <p>{t('common.logout_desc')}</p>
            <Button variant="outline-danger" onClick={() => { logout(); onLogout(); }}><HiArrowRightOnRectangle size={16} /> {t('nav.logout')}</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function LoadingRows() {
  const { t } = useTranslation();
  return <div className="profile-loading" aria-busy="true" aria-label={t('sessions.loading_history')}>{[0, 1, 2].map((item) => <span key={item} />)}</div>;
}

function ErrorState({ title, text, onRetry }) {
  const { t } = useTranslation();
  return <div className="profile-empty"><h3>{title}</h3><p>{text}</p><Button variant="outline-primary" onClick={onRetry}>{t('common.retry')}</Button></div>;
}

function EmptyState({ title, text, action }) {
  return <div className="profile-empty"><h3>{title}</h3><p>{text}</p>{action}</div>;
}

export function ProfilePage() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const tier = useSubscriptionStore((state) => state.tier);

  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: () => fetchJson('/sessions'),
    enabled: Boolean(user),
  });

  const sessions = Array.isArray(sessionsQuery.data) ? sessionsQuery.data : [];
  const sessionsCount = sessions.length;

  const saveMutation = useMutation({
    mutationFn: (data) => fetchJson('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setEditing(false);
      setMessage({ type: 'success', text: t('common.profile_updated') });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (err) => setMessage({ type: 'danger', text: err?.message || t('common.profile_update_failed') }),
  });

  const content = useMemo(() => {
    if (!user) return null;
    if (activeSection === 'overview') return <UserInfoSection user={user} displayName={displayName} setDisplayName={setDisplayName} editing={editing} setEditing={setEditing} saveMutation={saveMutation} />;
    if (activeSection === 'sessions') return <SessionsSection sessions={sessions} isLoading={sessionsQuery.isLoading} isError={sessionsQuery.isError} onRetry={sessionsQuery.refetch} />;
    if (activeSection === 'notes') return <NotesSection />;
    if (activeSection === 'schedule') return <ScheduleSection onCreateRoom={() => setShowCreateRoom(true)} />;
    if (activeSection === 'subscription') return <SubscriptionSection tier={tier} />;
    if (activeSection === 'settings') return <SettingsSection logout={logout} onLogout={() => navigate('/login')} />;
    return null;
  }, [activeSection, displayName, editing, logout, navigate, saveMutation, sessions, sessionsQuery.isError, sessionsQuery.isLoading, sessionsQuery.refetch, tier, user]);

  if (!user) {
    return <Container className="py-5 text-center"><Spinner animation="border" variant="primary" /><p className="text-muted mt-2">{t('common.loading_profile')}</p></Container>;
  }

  function handleRoomCreated(room) {
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
    setShowCreateRoom(false);
    if (room?.id) navigate(`/rooms/${room.id}`);
  }

  return (
    <main className="profile-dashboard fade-in">
      <Container className="profile-dashboard__container">
        <ProfileHeader user={user} sessionsCount={sessionsCount} tier={tier} activeSection={activeSection} />
        {message && <Alert variant={message.type} dismissible onClose={() => setMessage(null)} className="profile-alert">{message.type === 'success' && <HiCheckCircle size={16} />} {message.text}</Alert>}
        <div className={`profile-dashboard__layout${sidebarOpen ? '' : ' is-collapsed'}`}>
          <div className="profile-dashboard__sidebar-wrap">
            <button type="button" className="profile-toggle" onClick={() => setSidebarOpen(prev => !prev)} aria-expanded={sidebarOpen}>
              <HiBars3 size={18} /> {sidebarOpen ? t('common.hide_menu') : t('common.show_menu')}
            </button>
            {sidebarOpen && <ProfileSidebar activeSection={activeSection} onSelect={setActiveSection} user={user} sessionsCount={sessionsCount} tier={tier} />}
          </div>
          <div className="profile-dashboard__content">{content}</div>
        </div>
      </Container>
      {showCreateRoom && <CreateRoomModal onClose={() => setShowCreateRoom(false)} onRoomCreated={handleRoomCreated} />}
    </main>
  );
}
