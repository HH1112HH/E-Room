import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  { key: 'overview', label: 'User info', icon: HiUserCircle },
  { key: 'sessions', label: 'Session history', icon: HiBookOpen },
  { key: 'notes', label: 'Notes', icon: HiDocumentText },
  { key: 'schedule', label: 'Schedule room', icon: HiCalendarDays },
];

const accountSections = [
  { key: 'subscription', label: 'Subscription', icon: HiCreditCard },
  { key: 'settings', label: 'Settings', icon: HiCog6Tooth },
];

const plans = [
  { key: 'free', name: 'Free', price: '$0', features: ['5 rooms/day', 'Basic AI feedback', 'Standard matching'] },
  { key: 'pro', name: 'Pro', price: '$9.99/mo', features: ['Unlimited rooms', 'Advanced AI feedback', 'Priority matching', 'Session notes'], popular: true },
  { key: 'pro_plus', name: 'Pro+', price: '$19.99/mo', features: ['All Pro features', 'TTS voice feedback', 'Expert RAG insights', 'Leaderboard'] },
];

function getSessionTitle(session) {
  return session.topic || session.room?.topic || session.title || 'Speaking session';
}

function getSessionDate(session) {
  const raw = session.created_at || session.started_at || session.updated_at || session.timestamp;
  if (!raw) return 'Date unavailable';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(raw));
}

function formatDuration(seconds) {
  if (!seconds) return '--';
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes}m`;
}

function ProfileSidebar({ activeSection, onSelect, user, sessionsCount, tier }) {
  const initials = (user.display_name || user.email || 'U').slice(0, 1).toUpperCase();

  return (
    <aside className="profile-sidebar">
      <div className="profile-sidebar__identity">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-sidebar__identity-text">
          <strong>{user.display_name || 'E-Room learner'}</strong>
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
  const Icon = section.icon;
  return (
    <button type="button" className={`profile-sidebar__btn${active ? ' is-active' : ''}`} onClick={() => onSelect(section.key)} aria-current={active ? 'page' : undefined}>
      <Icon size={18} />
      <span>{section.label}</span>
    </button>
  );
}

function ProfileHeader({ user, sessionsCount, tier, activeSection }) {
  const sectionTitle = [...sections, ...accountSections].find((section) => section.key === activeSection)?.label || 'Dashboard';
  return (
    <header className="profile-header">
      <h1>{sectionTitle}</h1>
      <div className="profile-header__stats">
        <span><strong>{sessionsCount}</strong> Sessions</span>
        <span><strong>{tier === 'pro_plus' ? 'Pro+' : tier === 'pro' ? 'Pro' : 'Free'}</strong> Plan</span>
        <span><strong>{user.display_name ? 'Ready' : 'Setup'}</strong> Profile</span>
      </div>
    </header>
  );
}

function UserInfoSection({ user, displayName, setDisplayName, editing, setEditing, saveMutation }) {
  function cancelEdit() {
    setDisplayName(user.display_name || '');
    setEditing(false);
  }

  return (
    <section className="profile-section">
      <div className="profile-section__head">
        <h2>Personal information</h2>
        {!editing && <Button variant="outline-primary" onClick={() => setEditing(true)}><HiPencil size={16} /> Edit</Button>}
      </div>

      <div className="profile-form-grid">
        <Form.Group>
          <Form.Label>Display name</Form.Label>
          <Form.Control value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={!editing} />
        </Form.Group>
        <Form.Group>
          <Form.Label>Email address</Form.Label>
          <Form.Control type="email" value={user.email || ''} disabled />
        </Form.Group>
        <Form.Group>
          <Form.Label>English level</Form.Label>
          <Form.Control value={user.english_level || 'Not set yet'} disabled />
        </Form.Group>
        <Form.Group>
          <Form.Label>Language preference</Form.Label>
          <Form.Select disabled={!editing} defaultValue="Vietnamese">
            <option>Vietnamese</option>
            <option>English</option>
          </Form.Select>
        </Form.Group>
      </div>

      {editing && (
        <div className="profile-actions">
          <Button variant="primary" disabled={saveMutation.isPending || !displayName.trim()} onClick={() => saveMutation.mutate({ display_name: displayName.trim() })}>
            {saveMutation.isPending ? <><Spinner animation="border" size="sm" /> Saving</> : <><HiCheckCircle size={16} /> Save changes</>}
          </Button>
          <Button variant="outline-secondary" onClick={cancelEdit}>Cancel</Button>
        </div>
      )}
    </section>
  );
}

function SessionsSection({ sessions, isLoading, isError, onRetry }) {
  return (
    <section className="profile-section">
      <div className="profile-section__head">
        <h2>Session history</h2>
        <Button as={Link} to="/learning" variant="outline-primary">Find a meeting</Button>
      </div>

      {isLoading && <LoadingRows />}
      {isError && <ErrorState title="Could not load sessions" text="Refresh this panel to retry your session history request." onRetry={onRetry} />}
      {!isLoading && !isError && sessions.length === 0 && (
        <EmptyState title="No completed sessions yet" text="Join a meeting room and your session history will appear here." action={<Button as={Link} to="/learning" variant="primary">Open Meeting</Button>} />
      )}
      {!isLoading && !isError && sessions.length > 0 && (
        <div className="profile-session-list">
          {sessions.map((session) => (
            <article className="profile-session" key={session.id || `${getSessionTitle(session)}-${getSessionDate(session)}`}>
              <div className="profile-session__duration"><strong>{formatDuration(session.duration_seconds)}</strong><span>duration</span></div>
              <div>
                <h3>{getSessionTitle(session)}</h3>
                <p>{getSessionDate(session)}</p>
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
  return (
    <section className="profile-section">
      <div className="profile-section__head">
        <h2>Notes</h2>
        <Button as={Link} to="/notes" variant="outline-primary">Open notes</Button>
      </div>
      <EmptyState title="Session notes live here" text="After a room produces notes, this dashboard gives you a faster path back to them." action={<Button as={Link} to="/notes" variant="primary">Go to Notes</Button>} />
    </section>
  );
}

function ScheduleSection({ onCreateRoom }) {
  return (
    <section className="profile-section">
      <div className="profile-section__head">
        <h2>Schedule room</h2>
      </div>
      <div className="profile-schedule">
        <h3>Prepare your next speaking room</h3>
        <p>Create a room with topic, level, participants, and tags. Calendar-based scheduling is not enabled by the current room API, so this dashboard keeps the instant creation flow reliable.</p>
        <Button variant="primary" onClick={onCreateRoom}><HiPlusCircle size={18} /> Create room</Button>
      </div>
    </section>
  );
}

function SubscriptionSection({ tier }) {
  return (
    <section className="profile-section">
      <div className="profile-section__head">
        <h2>Subscription</h2>
      </div>
      <div className="profile-plan-grid">
        {plans.map((plan) => {
          const current = plan.key === tier;
          return (
            <article className={`profile-plan${plan.popular ? ' is-popular' : ''}`} key={plan.key}>
              <div className="profile-plan__top">
                <h3>{plan.name}</h3>
                {current && <Badge bg="success">Current</Badge>}
                {plan.popular && !current && <Badge bg="primary">Popular</Badge>}
              </div>
              <strong className="profile-plan__price">{plan.price}</strong>
              <ul>{plan.features.map((feature) => <li key={feature}><HiCheckCircle size={14} /> {feature}</li>)}</ul>
              {plan.key === 'free' ? (
                <Button variant="outline-secondary" className="w-100" disabled={current}>Free plan</Button>
              ) : (
                <Button as={Link} to={`/payment?plan=${plan.key}`} variant={plan.popular ? 'primary' : 'outline-primary'} className="w-100">{current ? 'Manage plan' : 'Upgrade'}</Button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SettingsSection({ logout, onLogout }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <section className="profile-section">
      <div className="profile-section__head">
        <h2>Settings</h2>
      </div>
      <div className="profile-settings-list">
        <div className="profile-settings-item">
          <HiBell size={18} />
          <div className="profile-settings-item__body">
            <h3>Notifications</h3>
            <Form.Check type="switch" id="match-notifications" label="Room match notifications" defaultChecked />
            <Form.Check type="switch" id="session-reminders" label="Session reminders" defaultChecked />
            <Form.Check type="switch" id="email-updates" label="Email updates" />
          </div>
        </div>
        <div className="profile-settings-item">
          <HiShieldCheck size={18} />
          <div className="profile-settings-item__body">
            <h3>Privacy</h3>
            <Form.Check type="switch" id="show-profile" label="Show profile in rooms" defaultChecked />
            <Form.Check type="switch" id="show-leaderboard" label="Show on leaderboard" defaultChecked />
          </div>
        </div>
        <div className="profile-settings-item">
          <HiSparkles size={18} />
          <div className="profile-settings-item__body">
            <h3>Appearance</h3>
            <p>Current theme: {theme}</p>
            <Button variant="outline-primary" onClick={toggleTheme}>Toggle theme</Button>
          </div>
        </div>
        <div className="profile-settings-item">
          <HiExclamationTriangle size={18} />
          <div className="profile-settings-item__body">
            <h3>Account access</h3>
            <p>Sign out of this device when you finish practicing.</p>
            <Button variant="outline-danger" onClick={() => { logout(); onLogout(); }}><HiArrowRightOnRectangle size={16} /> Sign out</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function LoadingRows() {
  return <div className="profile-loading" aria-busy="true" aria-label="Loading sessions">{[0, 1, 2].map((item) => <span key={item} />)}</div>;
}

function ErrorState({ title, text, onRetry }) {
  return <div className="profile-empty"><h3>{title}</h3><p>{text}</p><Button variant="outline-primary" onClick={onRetry}>Try again</Button></div>;
}

function EmptyState({ title, text, action }) {
  return <div className="profile-empty"><h3>{title}</h3><p>{text}</p>{action}</div>;
}

export function ProfilePage() {
  const { user, logout } = useAuth();
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
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (err) => setMessage({ type: 'danger', text: err?.message || 'Failed to update profile.' }),
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
    return <Container className="py-5 text-center"><Spinner animation="border" variant="primary" /><p className="text-muted mt-2">Loading profile...</p></Container>;
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
              <HiBars3 size={18} /> {sidebarOpen ? 'Hide menu' : 'Show menu'}
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
