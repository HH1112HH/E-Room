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
  { key: 'overview', label: 'Thông tin người dùng', icon: HiUserCircle },
  { key: 'sessions', label: 'Lịch sử buổi học', icon: HiBookOpen },
  { key: 'notes', label: 'Ghi chú', icon: HiDocumentText },
  { key: 'schedule', label: 'Lên lịch phòng', icon: HiCalendarDays },
];

const accountSections = [
  { key: 'subscription', label: 'Gói đăng ký', icon: HiCreditCard },
  { key: 'settings', label: 'Cài đặt', icon: HiCog6Tooth },
];

const plans = [
  { key: 'free', name: 'Free', price: '$0', features: ['5 phòng/ngày', 'Phản hồi AI cơ bản', 'Ghép cặp tiêu chuẩn'] },
  { key: 'pro', name: 'Pro', price: '$9.99/tháng', features: ['Phòng không giới hạn', 'Phản hồi AI nâng cao', 'Ghép cặp ưu tiên', 'Ghi chú buổi học'], popular: true },
  { key: 'pro_plus', name: 'Pro+', price: '$19.99/tháng', features: ['Tất cả tính năng Pro', 'Phản hồi giọng nói TTS', 'Phân tích RAG chuyên sâu', 'Bảng xếp hạng'] },
];

function getSessionTitle(session) {
  return session.topic || session.room?.topic || session.title || 'Buổi luyện nói';
}

function getSessionDate(session) {
  const raw = session.created_at || session.started_at || session.updated_at || session.timestamp;
  if (!raw) return 'Không có ngày';
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
          <strong>{user.display_name || 'Người học E-Room'}</strong>
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
  const sectionTitle = [...sections, ...accountSections].find((section) => section.key === activeSection)?.label || 'Bảng điều khiển';
  return (
    <header className="profile-header">
      <h1>{sectionTitle}</h1>
      <div className="profile-header__stats">
        <span><strong>{sessionsCount}</strong> Buổi học</span>
        <span><strong>{tier === 'pro_plus' ? 'Pro+' : tier === 'pro' ? 'Pro' : 'Free'}</strong> Gói</span>
        <span><strong>{user.display_name ? 'Sẵn sàng' : 'Thiết lập'}</strong> Hồ sơ</span>
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
        <h2>Thông tin cá nhân</h2>
        {!editing && <Button variant="outline-primary" onClick={() => setEditing(true)}><HiPencil size={16} /> Chỉnh sửa</Button>}
      </div>

      <div className="profile-form-grid">
        <Form.Group>
          <Form.Label>Tên hiển thị</Form.Label>
          <Form.Control value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={!editing} />
        </Form.Group>
        <Form.Group>
          <Form.Label>Địa chỉ Email</Form.Label>
          <Form.Control type="email" value={user.email || ''} disabled />
        </Form.Group>
        <Form.Group>
          <Form.Label>Trình độ tiếng Anh</Form.Label>
          <Form.Control value={user.english_level || 'Chưa thiết lập'} disabled />
        </Form.Group>
        <Form.Group>
          <Form.Label>Ngôn ngữ ưa thích</Form.Label>
          <Form.Select disabled={!editing} defaultValue="Vietnamese">
            <option>Vietnamese</option>
            <option>English</option>
          </Form.Select>
        </Form.Group>
      </div>

      {editing && (
        <div className="profile-actions">
          <Button variant="primary" disabled={saveMutation.isPending || !displayName.trim()} onClick={() => saveMutation.mutate({ display_name: displayName.trim() })}>
            {saveMutation.isPending ? <><Spinner animation="border" size="sm" /> Đang lưu...</> : <><HiCheckCircle size={16} /> Lưu thay đổi</>}
          </Button>
          <Button variant="outline-secondary" onClick={cancelEdit}>Hủy</Button>
        </div>
      )}
    </section>
  );
}

function SessionsSection({ sessions, isLoading, isError, onRetry }) {
  return (
    <section className="profile-section">
      <div className="profile-section__head">
        <h2>Lịch sử buổi học</h2>
        <Button as={Link} to="/learning" variant="outline-primary">Tìm phòng luyện tập</Button>
      </div>

      {isLoading && <LoadingRows />}
      {isError && <ErrorState title="Không thể tải lịch sử buổi học" text="Làm mới bảng này để thử lại yêu cầu lịch sử buổi học." onRetry={onRetry} />}
      {!isLoading && !isError && sessions.length === 0 && (
        <EmptyState title="Chưa có buổi học nào hoàn thành" text="Tham gia một phòng luyện tập và lịch sử buổi học sẽ hiển thị tại đây." action={<Button as={Link} to="/learning" variant="primary">Mở phòng</Button>} />
      )}
      {!isLoading && !isError && sessions.length > 0 && (
        <div className="profile-session-list">
          {sessions.map((session) => (
            <article className="profile-session" key={session.id || `${getSessionTitle(session)}-${getSessionDate(session)}`}>
              <div className="profile-session__duration"><strong>{formatDuration(session.duration_seconds)}</strong><span>thời lượng</span></div>
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
        <h2>Ghi chú</h2>
        <Button as={Link} to="/notes" variant="outline-primary">Mở ghi chú</Button>
      </div>
      <EmptyState title="Ghi chú buổi học nằm tại đây" text="Sau khi phòng tạo ghi chú, bảng điều khiển này giúp bạn truy cập nhanh hơn." action={<Button as={Link} to="/notes" variant="primary">Đến Ghi chú</Button>} />
    </section>
  );
}

function ScheduleSection({ onCreateRoom }) {
  return (
    <section className="profile-section">
      <div className="profile-section__head">
        <h2>Lên lịch phòng</h2>
      </div>
      <div className="profile-schedule">
        <h3>Chuẩn bị phòng luyện nói tiếp theo</h3>
        <p>Tạo phòng với chủ đề, trình độ, số người tham gia và thẻ. Lịch hẹn theo lịch chưa được bật ở API hiện tại, nên bảng này giữ luồng tạo phòng tức thì ổn định.</p>
        <Button variant="primary" onClick={onCreateRoom}><HiPlusCircle size={18} /> Tạo phòng</Button>
      </div>
    </section>
  );
}

function SubscriptionSection({ tier }) {
  return (
    <section className="profile-section">
      <div className="profile-section__head">
        <h2>Gói đăng ký</h2>
      </div>
      <div className="profile-plan-grid">
        {plans.map((plan) => {
          const current = plan.key === tier;
          return (
            <article className={`profile-plan${plan.popular ? ' is-popular' : ''}`} key={plan.key}>
              <div className="profile-plan__top">
                <h3>{plan.name}</h3>
                {current && <Badge bg="success">Hiện tại</Badge>}
                {plan.popular && !current && <Badge bg="primary">Phổ biến</Badge>}
              </div>
              <strong className="profile-plan__price">{plan.price}</strong>
              <ul>{plan.features.map((feature) => <li key={feature}><HiCheckCircle size={14} /> {feature}</li>)}</ul>
              {plan.key === 'free' ? (
                <Button variant="outline-secondary" className="w-100" disabled={current}>Gói miễn phí</Button>
              ) : (
                <Button as={Link} to={`/payment?plan=${plan.key}`} variant={plan.popular ? 'primary' : 'outline-primary'} className="w-100">{current ? 'Quản lý gói' : 'Nâng cấp'}</Button>
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
        <h2>Cài đặt</h2>
      </div>
      <div className="profile-settings-list">
        <div className="profile-settings-item">
          <HiBell size={18} />
          <div className="profile-settings-item__body">
            <h3>Thông báo</h3>
            <Form.Check type="switch" id="match-notifications" label="Thông báo phòng ghép cặp" defaultChecked />
            <Form.Check type="switch" id="session-reminders" label="Nhắc nhở buổi học" defaultChecked />
            <Form.Check type="switch" id="email-updates" label="Cập nhật qua Email" />
          </div>
        </div>
        <div className="profile-settings-item">
          <HiShieldCheck size={18} />
          <div className="profile-settings-item__body">
            <h3>Quyền riêng tư</h3>
            <Form.Check type="switch" id="show-profile" label="Hiển thị hồ sơ trong phòng" defaultChecked />
            <Form.Check type="switch" id="show-leaderboard" label="Hiển thị trên bảng xếp hạng" defaultChecked />
          </div>
        </div>
        <div className="profile-settings-item">
          <HiSparkles size={18} />
          <div className="profile-settings-item__body">
            <h3>Giao diện</h3>
            <p>Giao diện hiện tại: {theme}</p>
            <Button variant="outline-primary" onClick={toggleTheme}>Đổi giao diện</Button>
          </div>
        </div>
        <div className="profile-settings-item">
          <HiExclamationTriangle size={18} />
          <div className="profile-settings-item__body">
            <h3>Truy cập tài khoản</h3>
            <p>Đăng xuất khỏi thiết bị này khi hoàn tất luyện tập.</p>
            <Button variant="outline-danger" onClick={() => { logout(); onLogout(); }}><HiArrowRightOnRectangle size={16} /> Đăng xuất</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function LoadingRows() {
  return <div className="profile-loading" aria-busy="true" aria-label="Đang tải lịch sử buổi học">{[0, 1, 2].map((item) => <span key={item} />)}</div>;
}

function ErrorState({ title, text, onRetry }) {
  return <div className="profile-empty"><h3>{title}</h3><p>{text}</p><Button variant="outline-primary" onClick={onRetry}>Thử lại</Button></div>;
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
      setMessage({ type: 'success', text: 'Đã cập nhật hồ sơ thành công.' });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (err) => setMessage({ type: 'danger', text: err?.message || 'Không thể cập nhật hồ sơ.' }),
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
    return <Container className="py-5 text-center"><Spinner animation="border" variant="primary" /><p className="text-muted mt-2">Đang tải hồ sơ...</p></Container>;
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
              <HiBars3 size={18} /> {sidebarOpen ? 'Ẩn menu' : 'Hiện menu'}
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
