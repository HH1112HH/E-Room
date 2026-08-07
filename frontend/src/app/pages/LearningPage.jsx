import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import Spinner from 'react-bootstrap/Spinner';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import ProgressBar from 'react-bootstrap/ProgressBar';
import {
  HiAcademicCap, HiPlayCircle, HiPlusCircle, HiFunnel, HiUsers,
  HiGlobeAlt, HiClock, HiLanguage, HiUser, HiSparkles,
  HiBolt, HiMagnifyingGlass, HiCheckCircle, HiExclamationTriangle,
  HiArrowRight, HiXMark, HiRocketLaunch, HiStar
} from 'react-icons/hi2';
import { FiSearch, FiRefreshCw, FiZap } from 'react-icons/fi';
import { fetchJson } from '../../lib/api';
import { useAuth } from '../../app/AuthContext';
import { CreateRoomModal } from '../../features/rooms/CreateRoomModal';

import '../../styles/LearningPage.css';
const STATUS_ICON = {
  ACTIVE: { icon: HiPlayCircle, color: 'var(--color-success)', badge: 'success', labelKey: 'learning.live' },
  IDLE: { icon: HiClock, color: 'var(--color-text-muted)', badge: 'info', labelKey: 'learning.waiting' },
};

function RoomCard({ room }) {
  const { t } = useTranslation();
  const status = STATUS_ICON[room.status] || STATUS_ICON.IDLE;
  const StatusIcon = status.icon;
  const level = room.english_level || 'any';
  const tags = room.tags || [];
  const current = room.current_participants || 0;
  const max = room.max_participants || 5;

  return (
    <Card className="h-100 border-0 room-card-v2 fade-in">
      <Card.Body className="d-flex flex-column justify-content-between gap-1 p-4">

        <div className="d-flex justify-content-between align-items-start gap-2">
          <Card.Title className="room-card-v2__title">
            {room.topic || room.name || t('learning.untitled')}
          </Card.Title>
          <Badge bg={status.badge} pill className="text-uppercase fw-semibold flex-shrink-0 badge-pill-sm">
            <span className="badge-inner-flex">
              <StatusIcon size={12} /> {t(status.labelKey)}
            </span>
          </Badge>
        </div>

        <Card.Text className="room-card-v2__desc">
          {room.description || t('learning.join_desc')}
        </Card.Text>

        <span className="room-card-v2__level">
          <HiLanguage size={11} /> {level.toUpperCase()}
        </span>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {tags.slice(0, 3).map(tag => (
            <span key={tag} className="room-card-v2__tag">#{tag}</span>
          ))}
          {tags.length > 3 && (
            <span className="room-card-v2__tag-more">+{tags.length - 3}</span>
          )}
        </div>

        <div className="room-card-v2__footer">
          <span className="room-card-v2__participants">
            <HiUsers size={14} /> {current}/{max}
          </span>
          <Link to={`/rooms/${room.id}`} className="room-card-v2__join-btn">
            {t('learning.join')} <HiArrowRight size={13} />
          </Link>
        </div>
      </Card.Body>
    </Card>
  );
}

function MatchResultCard({ room, onJoin, onRetry, onClose }) {
  const { t } = useTranslation();
  const status = STATUS_ICON[room.status] || STATUS_ICON.IDLE;
  const StatusIcon = status.icon;

  return (
    <div className="scale-in p-4 match-card">
      <div className="text-center mb-3">
        <div className="d-inline-flex align-items-center justify-content-center modal-badge modal-badge--success mb-2">
          <HiCheckCircle size={32} className="icon-success" />
        </div>
        <h5 className="fw-extrabold mb-1">{t('learning.match_found')}</h5>
        <p className="text-muted small mb-0">{t('learning.match_found_sub')}</p>
      </div>

      <div className="match-card__detail mb-3">
        <div className="d-flex align-items-center gap-2 mb-2">
          <StatusIcon size={18} style={{ color: status.color }} />
          <h6 className="fw-bold mb-0">{room.topic || room.name || t('learning.untitled')}</h6>
          <Badge bg={status.badge} pill className="badge-tiny">{t(status.labelKey)}</Badge>
        </div>
        <p className="text-muted small mb-2">{room.description || t('learning.join_desc')}</p>
        <div className="d-flex flex-wrap gap-1 mb-2">
          {room.tags?.slice(0, 4).map(tag => (
            <span key={tag} className="match-card__tag">#{tag}</span>
          ))}
        </div>
        <div className="d-flex gap-3 text-muted small">
          <span className="d-flex align-items-center gap-1"><HiUsers size={14} /> {room.current_participants || 0}/{room.max_participants || 5}</span>
          <span className="d-flex align-items-center gap-1"><HiLanguage size={14} /> {room.english_level || 'any'}</span>
        </div>
      </div>

      <div className="d-flex gap-2">
        <Link to={`/rooms/${room.id}`} className="flex-grow-1" onClick={onJoin}>
          <Button variant="primary" className="w-100 fw-semibold rounded-pill d-flex align-items-center justify-content-center gap-2">
            {t('learning.join_room')} <HiArrowRight size={16} />
          </Button>
        </Link>
        <Button variant="outline-secondary" className="rounded-pill px-3" onClick={onRetry} title={t('learning.try_another_match')}>
          <FiRefreshCw size={16} />
        </Button>
        <Button variant="outline-secondary" className="rounded-pill px-3" onClick={onClose} title={t('learning.close')}>
          <HiXMark size={16} />
        </Button>
      </div>
    </div>
  );
}

const MATCH_INTERESTS = ['casual', 'business', 'technology', 'travel', 'education', 'ielts', 'daily', 'pronunciation'];
const MATCH_LEVELS = ['beginner', 'intermediate', 'advanced'];

export function LearningPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [matchOpen, setMatchOpen] = useState(false);
  const [matchStep, setMatchStep] = useState(0);
  const [matchResult, setMatchResult] = useState(null);
  const [matchError, setMatchError] = useState(null);
  const [matchConfig, setMatchConfig] = useState({
    level: '',
    interests: [],
  });
  const [showConfig, setShowConfig] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const loadMoreRef = useRef(null);

  async function loadRooms() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson('/rooms');
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRooms(); }, []);

  const startQuickMatch = useCallback(() => {
    setMatchOpen(true);
    setMatchResult(null);
    setMatchError(null);
    setMatchStep(0);

    const config = { ...matchConfig };
    const steps = t('learning.match_steps', { returnObjects: true });
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setMatchStep(currentStep);
      } else {
        clearInterval(interval);

        (async () => {
          try {
            const result = await fetchJson('/rooms/match', {
              method: 'POST',
              body: JSON.stringify({
                tag_ids: config.interests?.length > 0 ? config.interests : undefined,
                english_level: config.level || undefined,
              }),
            });
            if (result.status === 'matched') {
              try {
                const roomDetail = await fetchJson(`/rooms/${result.roomId}`);
                setMatchResult(roomDetail);
              } catch {
                setMatchError(t('learning.match_details_error'));
              }
            } else {
              setMatchError(t('learning.match_no_result'));
            }
          } catch (err) {
            setMatchError(t('learning.match_failed'));
          }
        })();
      }
    }, 700);

    return () => clearInterval(interval);
  }, [matchConfig]);

  function resetMatch() {
    setMatchOpen(false);
    setMatchResult(null);
    setMatchError(null);
    setMatchStep(0);
  }

  const filtered = (rooms || []).filter(r => {
    if (filter !== 'all') {
      const rStatus = (r.status || '').toUpperCase();
      if (filter === 'ACTIVE' && rStatus !== 'ACTIVE') return false;
      if (filter === 'IDLE' && rStatus === 'ACTIVE') return false;
    }
    if (search && !r.topic?.toLowerCase().includes(search.toLowerCase())
      && !r.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const hasMore = visibleCount < filtered.length;
  const visibleRooms = filtered.slice(0, visibleCount);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount(prev => prev + 30); },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

  const filters = [
    { key: 'all', labelKey: 'learning.filter_all', icon: HiGlobeAlt },
    { key: 'ACTIVE', labelKey: 'learning.filter_live', icon: HiPlayCircle },
    { key: 'IDLE', labelKey: 'learning.filter_waiting', icon: HiClock },
  ];

  const stats = [
    { labelKey: 'learning.total_rooms', value: (rooms || []).length, icon: HiGlobeAlt, color: 'var(--color-accent)' },
    { labelKey: 'learning.live_now', value: (rooms || []).filter(r => r.status === 'ACTIVE').length, icon: HiPlayCircle, color: 'var(--color-success)' },
    { labelKey: 'learning.waiting_label', value: (rooms || []).filter(r => r.status === 'IDLE').length, icon: HiClock, color: 'var(--color-text-muted)' },
    { labelKey: 'learning.your_sessions', value: '0', icon: HiAcademicCap, color: 'var(--color-text-muted)' },
  ];

  return (
    <div className="learning-page fade-in">
      <Container className="py-4">

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div className="page-header">
            <h2>
              <HiAcademicCap size={28} className="icon-accent" />
              {t('learning.learning_rooms')}
            </h2>
            <p className="text-muted mb-0">{t('learning.find_room_desc')}</p>
          </div>
          <div className="d-flex gap-2 flex-wrap">

            <Button
              variant="primary"
              size="sm"
              className="rounded-pill d-flex align-items-center gap-1 fw-semibold px-3 pulse-glow"
              onClick={() => {
                if (matchConfig.level || matchConfig.interests?.length > 0) {
                  startQuickMatch();
                } else {
                  setShowConfig(true);
                }
              }}
              disabled={loading}
            >
              <HiBolt size={16} /> {t('learning.quick_match')}
            </Button>
            <Button variant="outline-secondary" size="sm" className="rounded-pill d-flex align-items-center gap-1"
              onClick={loadRooms} disabled={loading}>
              <FiRefreshCw size={14} className={loading ? 'spin' : ''} /> {t('learning.refresh')}
            </Button>
            <Button variant="primary" size="sm" className="rounded-pill d-flex align-items-center gap-1 fw-semibold px-3 accent-gradient-btn"
              onClick={() => setShowCreateRoom(true)}>
              <HiPlusCircle size={16} /> {t('learning.create_room')}
            </Button>
          </div>
        </div>

        <Row className="mb-4 g-2">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Col xs={6} md={3} key={i}>
                <Card className="border-0 shadow-sm h-100 stat-card">
                  <Card.Body className="p-3 d-flex align-items-center gap-3">
                    <div className="stat-card__icon"
                      style={{ background: `${stat.color}18` }}>
                      <Icon size={20} style={{ color: stat.color }} />
                    </div>
                    <div>
                      <div className="stat-card__value">{stat.value}</div>
                      <small className="text-muted">{t(stat.labelKey)}</small>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>

        <div className="d-flex flex-column flex-md-row gap-3 mb-4">
          <div className="d-flex gap-1 flex-wrap">
            {filters.map(f => {
              const Icon = f.icon;
              const active = filter === f.key;
              return (
                <Button key={f.key} variant={active ? 'primary' : 'outline-secondary'} size="sm"
                  className={`rounded-pill px-3 d-flex align-items-center gap-1 ${active ? 'fw-semibold' : ''}`}
                  onClick={() => setFilter(f.key)}
                >
                  <Icon size={14} /> {t(f.labelKey)}
                </Button>
              );
            })}
          </div>
          <div className="flex-grow-1 search-wrapper">
            <div className="position-relative">
              <FiSearch size={16} className="position-absolute top-50 translate-middle-y ms-3 search-icon" />
              <Form.Control type="text" placeholder={t('learning.search')}
                value={search} onChange={e => setSearch(e.target.value)}
                className="rounded-pill ps-5 search-input" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted mt-2">{t('learning.loading_rooms')}</p>
          </div>
        ) : error ? (
          <div className="text-center py-5">
            <HiExclamationTriangle size={64} className="mb-3 icon-warning" />
            <h5 className="fw-bold">{t('learning.could_not_load')}</h5>
            <p className="text-muted mb-3">{error}</p>
            <Button variant="primary" className="rounded-pill px-4" onClick={loadRooms}>{t('learning.try_again')}</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-5">
            <HiAcademicCap size={64} className="mb-3 icon-muted" />
            <h5 className="fw-bold">{search || filter !== 'all' ? t('learning.no_matching_rooms') : t('learning.no_rooms_yet')}</h5>
            <p className="text-muted mb-3">
              {search || filter !== 'all'
                ? t('learning.try_other_search')
                : t('learning.create_first')}
            </p>
            {!search && filter === 'all' && (
              <Button variant="primary" className="rounded-pill px-4 d-flex align-items-center gap-1 mx-auto">
                <HiPlusCircle size={18} /> {t('learning.create_first_room')}
              </Button>
            )}
          </div>
        ) : (
          <>
            <Row>
              {visibleRooms.map((room, idx) => (
                <Col key={room.id || idx} md={6} lg={4} className="mb-3 stagger-1"
                  style={{ animationDelay: `${(idx % 30) * 0.05}s` }}>
                  <RoomCard room={room} />
                </Col>
              ))}
            </Row>
            {hasMore && (
              <div className="text-center py-3">
                <Spinner animation="border" size="sm" variant="primary" />
                <span className="ms-2 text-muted">{t('learning.load_more')}</span>
              </div>
            )}
            <div ref={loadMoreRef} className="sentinel" />
          </>
        )}
      </Container>

      <Modal show={showConfig} onHide={() => setShowConfig(false)} centered contentClassName="bg-transparent border-0">
        <div className="p-4 modal-inner scale-in">
          <div className="text-center mb-4">
              <div className="d-inline-flex align-items-center justify-content-center modal-badge modal-badge--accent mb-2">
              <HiBolt size={28} className="icon-accent" />
            </div>
            <h5 className="fw-extrabold mb-1">{t('learning.match_config_title')}</h5>
            <p className="text-muted small mb-0">{t('learning.match_config_sub')}</p>
          </div>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold small text-secondary">
              {t('learning.level_label')}
            </Form.Label>
            <div className="d-flex gap-2 flex-wrap">
              {MATCH_LEVELS.map(lvl => (
                <Button key={lvl}
                  variant={matchConfig.level === lvl ? 'primary' : 'outline-secondary'}
                  size="sm" className="rounded-pill text-capitalize"
                  onClick={() => setMatchConfig(prev => ({ ...prev, level: prev.level === lvl ? '' : lvl }))}
                >
                  {lvl}
                </Button>
              ))}
            </div>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold small text-secondary">
              {t('learning.topics_label')}
            </Form.Label>
            <div className="d-flex gap-2 flex-wrap">
              {MATCH_INTERESTS.map(interest => (
                <Button key={interest}
                  variant={matchConfig.interests.includes(interest) ? 'primary' : 'outline-secondary'}
                  size="sm" className="rounded-pill text-capitalize"
                  onClick={() => setMatchConfig(prev => ({
                    ...prev,
                    interests: prev.interests.includes(interest)
                      ? prev.interests.filter(i => i !== interest)
                      : [...prev.interests, interest],
                  }))}
                >
                  {interest}
                </Button>
              ))}
            </div>
          </Form.Group>

          <div className="d-flex gap-2">
            <Button variant="primary" className="flex-grow-1 rounded-pill fw-semibold d-flex align-items-center justify-content-center gap-2"
              onClick={() => { setShowConfig(false); startQuickMatch(); }}>
              <HiBolt size={16} /> {t('learning.find_my_room')}
            </Button>
            <Button variant="outline-secondary" className="rounded-pill px-3" onClick={() => setShowConfig(false)}>
              <HiXMark size={16} />
            </Button>
          </div>

          <div className="text-center mt-3">
            <Button variant="link" size="sm" className="text-decoration-none skip-link"
              onClick={() => { setShowConfig(false); startQuickMatch(); }}>
              {t('learning.skip_defaults')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal show={matchOpen && !matchResult && !matchError} onHide={resetMatch} centered
        contentClassName="bg-transparent border-0">
        <div className="p-5 modal-inner text-center match-modal-body">
          <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 pulse-glow searching-circle">
            <HiMagnifyingGlass size={36} className="icon-accent" />
          </div>
          <ProgressBar now={(matchStep + 1) * 25} className="mb-3 match-progress" />
          <p className="fw-semibold mb-0 text-secondary match-step-text">
            {t('learning.match_steps', { returnObjects: true })[matchStep]}
          </p>
          <small className="text-muted">{t('learning.match_loading_sub')}</small>
        </div>
      </Modal>

      <Modal show={matchOpen && (matchResult || matchError)} onHide={resetMatch} centered
        contentClassName="bg-transparent border-0">
        {matchResult ? (
          <MatchResultCard
            room={matchResult}
            onJoin={resetMatch}
            onRetry={() => { setMatchResult(null); setMatchError(null); setMatchStep(0); startQuickMatch(); }}
            onClose={resetMatch}
          />
        ) : matchError ? (
          <div className="p-4 modal-inner scale-in no-match-card">
            <div className="text-center mb-3">
                <div className="d-inline-flex align-items-center justify-content-center modal-badge modal-badge--warning mb-2">
                  <HiExclamationTriangle size={32} className="icon-warning" />
              </div>
              <h5 className="fw-extrabold mb-1">{t('learning.no_match')}</h5>
              <p className="text-muted small mb-0">{matchError}</p>
            </div>
            <div className="d-flex gap-2">
              <Button variant="outline-secondary" className="flex-grow-1 rounded-pill" onClick={resetMatch}>
                {t('learning.browse_manually')}
              </Button>
              <Button variant="primary" className="flex-grow-1 rounded-pill fw-semibold"
                onClick={() => { setMatchResult(null); setMatchError(null); setMatchStep(0); startQuickMatch(); }}>
                {t('learning.try_again')}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {showCreateRoom && (
        <CreateRoomModal
          onClose={() => setShowCreateRoom(false)}
          onRoomCreated={(room) => { setShowCreateRoom(false); loadRooms(); }}
        />
      )}

      
    </div>
  );
}
