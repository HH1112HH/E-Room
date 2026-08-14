import { useTranslation } from 'react-i18next';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import {
  HiMicrophone, HiSparkles, HiGlobeAlt, HiArrowRight, HiChatBubbleLeftRight,
  HiAcademicCap, HiShieldCheck, HiVideoCamera, HiCheckCircle, HiClock,
  HiUsers, HiBolt, HiDocumentText, HiSpeakerWave, HiBriefcase,
  HiPresentationChartLine, HiCpuChip, HiQueueList, HiChartBar,
} from 'react-icons/hi2';
import { RobotAvatar } from './icons';

const PREVIEW_PARTICIPANTS = [
  { nameKey: 'common.you', labelKey: 'common.speaking', active: true, color: '#ffffff' },
  { name: 'Mina', labelKey: 'common.b2_product', active: false, color: '#e0e0e0' },
  { name: 'Alex', label: 'C1 · AI/ML', active: false, color: '#f59e0b' },
  { name: 'Linh', labelKey: 'common.b1_design', active: false, color: '#ec4899' },
];

const HERO_TRUST_ITEMS = [
  { icon: HiQueueList, labelKey: 'learning.match_by_tags' },
  { icon: HiUsers, labelKey: 'learning.rooms_3_5' },
  { icon: HiCpuChip, label: 'AI Agent 3-in-1' },
];

function ProductPreview() {
  const { t } = useTranslation();
  return (
    <div className="home-preview" aria-label={t('home.preview_aria')}>
      <div className="home-preview__glow" />
      <div className="home-preview__browserbar">
        <div><i /><i /><i /></div>
        <span>eroom.app/rooms/vibe-coding</span>
        <strong>Pro Agent</strong>
      </div>
      <div className="home-preview__screen">
        <div className="home-preview__topbar">
          <div>
            <span className="home-preview__live">● {t('home.live')} · VIBE CODING</span>
            <h3>{t('home.preview_room_title')}</h3>
          </div>
          <div className="home-preview__meta">
            <span><HiClock size={13} /> 12:48</span>
            <span><HiUsers size={13} /> 4/5</span>
          </div>
        </div>

        <div className="home-preview__body">
          <div className="home-preview__stage">
            <div className="home-preview__video-grid">
              {PREVIEW_PARTICIPANTS.map((person) => (
                <div className={`home-preview__tile ${person.active ? 'is-speaking' : ''}`} key={person.name || person.nameKey}>
                  <div className="home-preview__avatar" style={{ background: person.color }}>{(person.name || t(person.nameKey))[0]}</div>
                  <div>
                    <strong>{person.name || t(person.nameKey)}</strong>
                    <span>{person.label || t(person.labelKey)}</span>
                  </div>
                  {person.active && <div className="home-preview__wave"><i /><i /><i /><i /></div>}
                </div>
              ))}
            </div>
            <div className="home-preview__timeline">
              <div><span>00:00</span><strong /><span>15:00</span></div>
              <p>{t('home.preview_timeline')}</p>
            </div>
            <div className="home-preview__controls">
              <span><HiMicrophone size={16} /></span>
              <span><HiVideoCamera size={16} /></span>
              <span><HiChatBubbleLeftRight size={16} /></span>
              <span className="is-hot"><HiBolt size={16} /></span>
            </div>
          </div>

          <aside className="home-preview__coach">
            <div className="home-preview__coach-head">
              <RobotAvatar />
              <div>
                <strong>AI Agent 3-in-1</strong>
                <span>{t('sessions.corrections')} · {t('subscription.expert')} · {t('subscription.heartbeats')}</span>
              </div>
            </div>
            <div className="home-preview__transcript">
              <span>{t('home.live_transcript')}</span>
              <p>{t('home.preview_quote')}</p>
            </div>
            <div className="home-preview__correction">
              <HiCheckCircle size={16} />
              <div>
                <span>{t('sessions.corrections')}</span>
                <strong>{t('home.preview_quote')}</strong>
              </div>
            </div>
            <div className="home-preview__transcript">
              <span>{t('subscription.heartbeats')}</span>
              <p>{t('home.preview_hint')}</p>
            </div>
            <div className="home-preview__score">
              <span>{t('home.preview_score')}</span>
              <strong>8.6</strong>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function HeroSection({ user, onQuickJoin, quickJoining }) {
  const { t } = useTranslation();
  return (
    <section className="home-hero position-relative overflow-hidden">
      <div className="home-hero__backdrop" />
      <div className="home-hero__inner">
        <div className="home-hero__copy fade-in-up">
          <div className="home-hero__eyebrow">
            <RobotAvatar />
            <span>{t('home.rooms_match_tags')} · AI Agent 3-in-1</span>
          </div>
          <h1 className="home-hero__title">
            {t('home.hero_headline')}
          </h1>
          <p className="home-hero__subtitle">
            {t('home.hero_headline_sub')}
          </p>
          <div className="home-hero__actions">
            {user ? (
              <Button variant="primary" size="lg" className="rounded-pill fw-semibold px-5"
                onClick={onQuickJoin} disabled={quickJoining}
              >
                {quickJoining ? t('learning.searching_room') : t('home.quick_join')}
              </Button>
            ) : (
              <Button variant="primary" size="lg" className="rounded-pill fw-semibold px-5" href="/login">
                {t('home.get_started')}
              </Button>
            )}
            <Button variant="outline-secondary" size="lg" className="rounded-pill fw-semibold px-4" href="/learning">
              {t('home.active_rooms')} <HiArrowRight size={16} />
            </Button>
          </div>
          <div className="home-hero__trust">
            {HERO_TRUST_ITEMS.map(item => (
              <span key={item.label || item.labelKey}><item.icon size={15} />{item.label || t(item.labelKey)}</span>
            ))}
          </div>
        </div>
        <ProductPreview />
      </div>
    </section>
  );
}

export function ProblemSection() {
  const { t } = useTranslation();
  const items = [
    [t('home.problem_1_title'), t('home.problem_1_desc')],
    [t('home.problem_2_title'), t('home.problem_2_desc')],
    [t('home.problem_3_title'), t('home.problem_3_desc')],
  ];

  return (
    <section className="home-problem-section">
      <div className="home-section-heading">
        <span>{t('home.problem_eyebrow')}</span>
        <h2>{t('home.problem_title')}</h2>
      </div>
      <div className="home-problem-grid">
        {items.map(([title, desc], index) => (
          <article className="home-problem-card" key={title}>
            <strong>{String(index + 1).padStart(2, '0')}</strong>
            <h3>{title}</h3>
            <p>{desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PremiumFlowSection() {
  const { t } = useTranslation();
  const steps = [
    { icon: HiQueueList, label: '01', title: t('home.flow_1_title'), desc: t('home.flow_1_desc') },
    { icon: HiUsers, label: '02', title: t('home.flow_2_title'), desc: t('home.flow_2_desc') },
    { icon: HiMicrophone, label: '03', title: t('home.flow_3_title'), desc: t('home.flow_3_desc') },
    { icon: HiSparkles, label: '04', title: t('home.flow_4_title'), desc: t('home.flow_4_desc') },
  ];

  return (
    <section className="home-flow-section">
      <div className="home-section-heading home-section-heading--left">
        <span>{t('home.solution_eyebrow')}</span>
        <h2>{t('home.solution_title')}</h2>
        <p>{t('home.solution_desc')}</p>
      </div>
      <div className="home-flow-grid">
        {steps.map((step) => (
          <article className="home-flow-card" key={step.title}>
            <div><step.icon size={22} /><span>{step.label}</span></div>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AgentSection() {
  const { t } = useTranslation();
  const roles = [
    { label: t('sessions.corrections'), metric: t('home.agent_1_metric'), desc: t('home.agent_1_desc') },
    { label: t('subscription.expert'), metric: t('home.agent_2_metric'), desc: t('home.agent_2_desc') },
    { label: t('subscription.heartbeats'), metric: t('home.agent_3_metric'), desc: t('home.agent_3_desc') },
  ];

  return (
    <section className="home-agent-section">
      <div className="home-agent-panel">
        <div className="home-agent-copy">
          <span>{t('home.agent_eyebrow')}</span>
          <h2>{t('home.agent_title')}</h2>
          <p>{t('home.agent_desc')}</p>
        </div>
        <div className="home-agent-console">
          <div className="home-agent-console__top">
            <span>{t('home.agent_session_intel')}</span>
            <strong>{t('home.agent_live')}</strong>
          </div>
          {roles.map(role => (
            <article key={role.label}>
              <div>
                <strong>{role.label}</strong>
                <span>{role.metric}</span>
              </div>
              <p>{role.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AudienceSection() {
  const { t } = useTranslation();
  const audiences = [
    { icon: HiBriefcase, title: t('home.aud_1_title'), desc: t('home.aud_1_desc') },
    { icon: HiPresentationChartLine, title: t('home.aud_2_title'), desc: t('home.aud_2_desc') },
    { icon: HiAcademicCap, title: t('home.aud_3_title'), desc: t('home.aud_3_desc') },
    { icon: HiGlobeAlt, title: t('home.aud_4_title'), desc: t('home.aud_4_desc') },
  ];

  return (
    <section className="home-audience-section">
      <div className="home-section-heading">
        <span>{t('home.aud_eyebrow')}</span>
        <h2>{t('home.aud_title')}</h2>
      </div>
      <div className="home-audience-grid">
        {audiences.map((item) => (
          <article className="home-audience-card" key={item.title}>
            <div className="home-audience-card__icon"><item.icon size={22} /></div>
            <div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function RoomsSection({ rooms = [], roomsLoading, navigate }) {
  const { t } = useTranslation();
  return (
    <section className="home-rooms-section">
      <div className="home-section-heading">
        <span>{t('home.live_rooms_eyebrow')}</span>
        <h2>{t('home.live_rooms_title')}</h2>
      </div>
      {roomsLoading ? (
        <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
      ) : rooms.length === 0 ? (
        <p className="text-muted text-center py-4 small">{t('home.no_rooms_now')}</p>
      ) : (
        <div className="home-room-grid">
          {rooms.slice(0, 6).map((room) => (
            <button key={room.id} className="home-room-card" onClick={() => navigate(`/rooms/${room.id}`)}>
              <span>{room.status === 'ACTIVE' ? t('home.live') : t('learning.waiting')}</span>
              <h3>{room.topic || room.name}</h3>
              <p>{room.current_participants || 0}/{room.max_participants || 5} {t('learning.participants')}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function StatsSection() {
  const { t } = useTranslation();
  const stats = [
    { value: '3-5', label: t('home.stat_learners_room') },
    { value: '15m', label: t('home.stat_focused_sessions') },
    { value: '3-in-1', label: t('home.stat_agent_roles') },
    { value: '50+', label: t('home.stat_tag_groups') },
  ];

  return (
    <section className="home-stats-section">
      {stats.map((s) => (
        <div key={s.label}>
          <strong>{s.value}</strong>
          <span>{s.label}</span>
        </div>
      ))}
    </section>
  );
}

export function FinalShowcaseSection({ user, navigate }) {
  const { t } = useTranslation();
  const quotes = [
    { quote: t('home.quote_1'), name: 'Minh Anh', role: t('home.role_1') },
    { quote: t('home.quote_2'), name: 'Hoang Tran', role: t('home.role_2') },
    { quote: t('home.quote_3'), name: 'Linh Pham', role: t('home.role_3') },
  ];

  return (
    <section className="home-final-section">
      <div className="home-final-header">
        <span><HiChartBar size={16} /> {t('home.testi_eyebrow')}</span>
        <h2>{t('home.testi_title')}</h2>
        <Button variant="primary" size="lg" className="rounded-pill fw-semibold px-5"
          onClick={() => navigate(user ? '/learning' : '/login')}
        >
          {user ? t('home.cta_find_room') : t('home.get_started')} <HiArrowRight size={16} />
        </Button>
      </div>
      <div className="home-testimonial-row">
        {quotes.map((item) => (
          <article key={item.name}>
            <p>“{item.quote}”</p>
            <strong>{item.name}</strong>
            <span>{item.role}</span>
          </article>
        ))}
      </div>
    </section>
  );
}