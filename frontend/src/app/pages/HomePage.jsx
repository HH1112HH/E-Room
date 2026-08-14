import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchJson } from '../../lib/api';
import { useAuth } from '../../app/AuthContext';
import { QueueOverlay } from '../../features/chat/QueueOverlay';
import { MatchFoundCard } from '../../features/chat/MatchFoundCard';
import {
  HiSparkles, HiAcademicCap, HiMicrophone, HiChatBubbleLeftRight,
  HiGlobeAlt, HiArrowTrendingUp, HiArrowRight, HiPlay, HiCheck,
  HiStar, HiShieldCheck, HiUserGroup, HiSpeakerWave,
  HiChatBubbleOvalLeft, HiBriefcase, HiLanguage, HiBookOpen,
} from 'react-icons/hi2';
import '../../styles/HomePage.css';

function useMatchMutation() {
  const [showQuickMatch, setShowQuickMatch] = useState(false);
  const [quickJoining, setQuickJoining] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const navigate = useNavigate();

  const matchMutation = useMutation({
    mutationFn: async (tagIds) => {
      const result = await fetchJson('/rooms/match', {
        method: 'POST',
        body: JSON.stringify({ tag_ids: tagIds }),
      });
      if (result.status === 'matched') {
        return await fetchJson(`/rooms/${result.roomId}`);
      }
      throw new Error(result.message || 'Không tìm thấy phòng phù hợp');
    },
    onSuccess: (room) => { setMatchResult(room); setQuickJoining(false); },
    onError: () => { setQuickJoining(false); setMatchResult(null); },
  });

  const handleQuickJoin = useCallback((tags) => {
    setShowQuickMatch(true); setQuickJoining(true); setMatchResult(null);
    matchMutation.mutate(tags);
  }, [matchMutation]);

  const handleCancelMatch = useCallback(() => {
    setShowQuickMatch(false); setQuickJoining(false); setMatchResult(null);
  }, []);

  return {
    handleQuickJoin,
    overlay: <QueueOverlay visible={showQuickMatch && quickJoining} tags={[]} onCancel={handleCancelMatch} />,
    matchCard: matchResult ? (
      <MatchFoundCard room={matchResult} participants={[]}
        onJoin={() => { navigate(`/rooms/${matchResult.id}`); setMatchResult(null); setShowQuickMatch(false); }}
        onDecline={() => setMatchResult(null)} />
    ) : null,
  };
}

const FEATURES = [
  { icon: HiMicrophone, titleKey: 'feat_1_title', descKey: 'feat_1_desc', color: '#33CC99', iconColor: '#ffffff' },
  { icon: HiChatBubbleLeftRight, titleKey: 'feat_2_title', descKey: 'feat_2_desc', color: '#6699FF', iconColor: '#ffffff' },
  { icon: HiGlobeAlt, titleKey: 'feat_3_title', descKey: 'feat_3_desc', color: '#6666FF', iconColor: '#ffffff' },
  { icon: HiArrowTrendingUp, titleKey: 'feat_4_title', descKey: 'feat_4_desc', color: '#FF9966', iconColor: '#ffffff' },
  { icon: HiUserGroup, titleKey: 'feat_5_title', descKey: 'feat_5_desc', color: '#FFCC66', iconColor: '#ffffff' },
  { icon: HiSpeakerWave, titleKey: 'feat_6_title', descKey: 'feat_6_desc', color: '#FF9999', iconColor: '#ffffff' },
];

const STEPS = [
  { num: '01', titleKey: 'step_1_title', descKey: 'step_1_desc' },
  { num: '02', titleKey: 'step_2_title', descKey: 'step_2_desc' },
  { num: '03', titleKey: 'step_3_title', descKey: 'step_3_desc' },
];

const TESTIMONIALS = [
  { quoteKey: 'testi_1_quote', nameKey: 'testi_1_name', roleKey: 'testi_1_role', initial: 'L' },
  { quoteKey: 'testi_2_quote', nameKey: 'testi_2_name', roleKey: 'testi_2_role', initial: 'C' },
  { quoteKey: 'testi_3_quote', nameKey: 'testi_3_name', roleKey: 'testi_3_role', initial: 'Y' },
];

const STATS = [
  { value: '50K+', labelKey: 'stat_1' },
  { value: '120+', labelKey: 'stat_2' },
  { value: '15K+', labelKey: 'stat_3' },
  { value: '4.8', labelKey: 'stat_4' },
];

const FAQS = [
  { qKey: 'faq_1_q', aKey: 'faq_1_a' },
  { qKey: 'faq_2_q', aKey: 'faq_2_a' },
  { qKey: 'faq_3_q', aKey: 'faq_3_a' },
  { qKey: 'faq_4_q', aKey: 'faq_4_a' },
];

const ROOM_CATEGORIES = [
  { icon: HiChatBubbleOvalLeft, titleKey: 'cat_1_title', descKey: 'cat_1_desc', color: '#f1f5f9', iconColor: '#6699FF', count: '12 phòng' },
  { icon: HiBriefcase, titleKey: 'cat_2_title', descKey: 'cat_2_desc', color: '#f8fafc', iconColor: '#336699', count: '8 phòng' },
  { icon: HiSpeakerWave, titleKey: 'cat_3_title', descKey: 'cat_3_desc', color: '#f1f5f9', iconColor: '#FF9966', count: '6 phòng' },
  { icon: HiBookOpen, titleKey: 'cat_4_title', descKey: 'cat_4_desc', color: '#f8fafc', iconColor: '#33CC99', count: '10 phòng' },
];

const TRUST_LOGOS = [
  'Vstep', 'Cambridge', 'IELTS', 'TOEFL', 'TOEIC', 'APTIS', 'CEFR', 'BEC',
];

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { handleQuickJoin, overlay, matchCard } = useMatchMutation();

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', 'featured'],
    queryFn: () => fetchJson('/rooms?featured=true&limit=6'),
    staleTime: 60_000,
  });

  return (
    <div className="hp">
      {overlay}
      {matchCard}

      {/* ── Hero ── */}
      <section className="hp-hero">
        <div className="hp-ambient" />
        <div className="hp-hero-body">
          <span className="hp-badge">{t('landing.badge')}</span>
          <h1 className="hp-hero-title">
            {t('landing.hero_title')}<br />
            <span className="hp-underline">{t('landing.hero_title_accent')}</span>
          </h1>
          <p className="hp-hero-sub">
            {t('landing.hero_sub')}
          </p>
          <div className="hp-hero-actions">
            <button className="hp-btn hp-btn-primary" onClick={() => user ? handleQuickJoin(user.tags?.map(t => t.id) || []) : navigate('/login')}>
              {t('landing.start_free')}
              <HiArrowRight size={18} />
            </button>
            <button className="hp-btn hp-btn-ghost" onClick={() => document.getElementById('hp-how')?.scrollIntoView({ behavior: 'smooth' })}>
              <HiPlay size={18} />
              {t('landing.see_how')}
            </button>
          </div>
          <div className="hp-hero-meta">
            <HiShieldCheck size={14} /> {t('landing.hero_meta')}
          </div>
        </div>
        <div className="hp-hero-visual">
          <div className="hp-orb hp-orb--1" />
          <div className="hp-orb hp-orb--2" />
          <div className="hp-orb hp-orb--3" />
            <div className="hp-glass">
            <div className="hp-glass-header">
              <div className="hp-glass-dots"><span /><span /><span /></div>
              <span className="hp-glass-header-label">Practice Room</span>
            </div>
            <div className="hp-glass-chat">
              <div className="hp-glass-bubble hp-glass-bubble--in">
                Hi! What brings you here today?
              </div>
              <div className="hp-glass-bubble hp-glass-bubble--out">
                I want to practice for my job interview.
              </div>
              <div className="hp-glass-bubble hp-glass-bubble--in hp-glass-bubble--short">
                Great! Let&rsquo;s start with introductions.
              </div>
              <div className="hp-glass-typing"><span /><span /><span /></div>
            </div>
            <div className="hp-glass-footer">
              <span className="hp-glass-chip">AI Analyzing &mdash; 92% fluency</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Bar ── */}
      <section className="hp-section hp-section--no-pad">
        <div className="hp-trust">
          <span className="hp-trust-label">{t('landing.trust_label')}</span>
          <div className="hp-trust-row">
            {TRUST_LOGOS.map((name, i) => (
              <span key={i} className="hp-trust-item">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="hp-stats">
        {STATS.map((s, i) => (
          <div key={i} className="hp-stat-item">
            <strong>{s.value}</strong>
            <span>{t(`landing.${s.labelKey}`)}</span>
          </div>
        ))}
      </section>

      {/* ── How It Works ── */}
      <section className="hp-section" id="hp-how">
        <div className="hp-contained">
          <span className="hp-eyebrow">{t('landing.how_eyebrow')}</span>
          <h2 className="hp-section-title">{t('landing.how_title')}</h2>
          <p className="hp-section-sub">{t('landing.how_sub')}</p>
          <div className="hp-steps">
            {STEPS.map((step, i) => (
              <div key={i} className="hp-step">
                <span className="hp-step-num">{step.num}</span>
                <h3>{t(`landing.${step.titleKey}`)}</h3>
                <p>{t(`landing.${step.descKey}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="hp-section hp-section--alt">
        <div className="hp-contained">
          <span className="hp-eyebrow">{t('landing.features_eyebrow')}</span>
          <h2 className="hp-section-title">{t('landing.features_title')}</h2>
          <p className="hp-section-sub">{t('landing.features_sub')}</p>
          <div className="hp-features">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div key={i} className="hp-feature">
                  <div className="hp-feature-icon" style={{ background: feat.color }}>
                    <Icon size={20} color={feat.iconColor || '#fff'} />
                  </div>
                  <div>
                    <h3>{t(`landing.${feat.titleKey}`)}</h3>
                    <p>{t(`landing.${feat.descKey}`)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Room Categories ── */}
      <section className="hp-section">
        <div className="hp-contained">
          <span className="hp-eyebrow">{t('landing.rooms_eyebrow')}</span>
          <h2 className="hp-section-title">{t('landing.rooms_title')}</h2>
          <p className="hp-section-sub">{t('landing.rooms_sub')}</p>
          <div className="hp-categories">
            {ROOM_CATEGORIES.map((cat, i) => (
              <div key={i} className="hp-category" style={{ background: cat.color }}>
                <span className="hp-category-icon" style={{ color: cat.iconColor }}><cat.icon size={22} /></span>
                <h3>{t(`landing.${cat.titleKey}`)}</h3>
                <p>{t(`landing.${cat.descKey}`)}</p>
                <span className="hp-category-count">{cat.count}</span>
              </div>
            ))}
          </div>
          {rooms.length > 0 && (
            <div className="hp-rooms-preview">
              {rooms.slice(0, 3).map((room) => (
                <div key={room.id} className="hp-room-card" onClick={() => navigate(`/rooms/${room.id}`)}>
                  <div className="hp-room-card-top">
                    <span className="hp-room-card-topic">{room.topic || 'Chung'}</span>
                    <span className="hp-room-card-level">{room.level || 'Mọi trình độ'}</span>
                  </div>
                  <h4>{room.name}</h4>
                  <p>{room.description}</p>
                  <div className="hp-room-card-meta">
                    <span>{room.participant_count || 0} đang nói</span>
                    <HiArrowRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="hp-section hp-section--alt">
        <div className="hp-contained">
          <span className="hp-eyebrow">{t('landing.testi_eyebrow')}</span>
          <h2 className="hp-section-title">{t('landing.testi_title')}</h2>
          <p className="hp-section-sub">{t('landing.testi_sub')}</p>
          <div className="hp-testimonials">
            {TESTIMONIALS.map((item, i) => (
              <div key={i} className="hp-testimonial">
                <div className="hp-testimonial-stars">
                  {[...Array(5)].map((_, j) => <HiStar key={j} size={14} />)}
                </div>
                <p className="hp-testimonial-quote">&ldquo;{t(`landing.${item.quoteKey}`)}&rdquo;</p>
                <div className="hp-testimonial-byline">
                  <div className="hp-testimonial-avatar">{item.initial}</div>
                  <div>
                    <strong>{t(`landing.${item.nameKey}`)}</strong>
                    <span>{t(`landing.${item.roleKey}`)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="hp-section">
        <div className="hp-contained" style={{ maxWidth: 700 }}>
          <span className="hp-eyebrow">{t('landing.faq_eyebrow')}</span>
          <h2 className="hp-section-title">{t('landing.faq_title')}</h2>
          <p className="hp-section-sub">{t('landing.faq_sub')}</p>
          <div className="pricing-faq">
            {FAQS.map((faq, i) => (
              <details key={i} className="pricing-faq__item">
                <summary>{t(`landing.${faq.qKey}`)}</summary>
                <p>{t(`landing.${faq.aKey}`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="hp-cta">
        <div className="hp-contained">
          <div className="hp-cta-card">
            <div className="hp-cta-orb" />
            <span className="hp-eyebrow hp-cta-eyebrow">{t('landing.cta_eyebrow')}</span>
            <h2>{t('landing.cta_title')}<br />{t('landing.cta_title_accent')}</h2>
            <p>{t('landing.cta_desc')}</p>
            <button className="hp-btn hp-btn-cta" onClick={() => navigate('/login')}>
              {t('landing.cta_btn')}
              <HiArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
