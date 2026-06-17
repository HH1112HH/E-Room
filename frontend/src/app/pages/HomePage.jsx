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
      throw new Error(result.message || 'No matching room found');
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
  { icon: HiMicrophone, title: 'AI Speech Coach', desc: 'Real-time pronunciation and fluency feedback as you speak.', color: '#1e293b' },
  { icon: HiChatBubbleLeftRight, title: 'Structured Conversations', desc: 'Guided rooms with warm-up, discussion, and wrap-up phases.', color: '#475569' },
  { icon: HiGlobeAlt, title: 'Global Community', desc: 'Practice with learners from 120+ countries. Real accents, real growth.', color: '#64748b' },
  { icon: HiArrowTrendingUp, title: 'Track Your Progress', desc: 'Detailed analytics and fluency scores across every session.', color: '#334155' },
  { icon: HiUserGroup, title: 'Small Group Rooms', desc: 'Practice in pairs or small groups for maximum speaking time.', color: '#1e293b' },
  { icon: HiSpeakerWave, title: 'Pronunciation Drills', desc: 'Targeted exercises for tricky sounds and intonation patterns.', color: '#475569' },
];

const STEPS = [
  { num: '01', title: 'Choose your room', desc: 'Browse by topic, level, or goal. From business English to casual conversation.' },
  { num: '02', title: 'Speak naturally', desc: 'Join a video room with guided phases. AI listens and analyzes in real time.' },
  { num: '03', title: 'Get AI feedback', desc: 'Instant analysis on pronunciation, grammar, fluency. Know exactly what to improve.' },
];

const TESTIMONIALS = [
  { quote: 'My speaking confidence has grown more in 3 months than in 3 years of self-study. The AI feedback is incredibly detailed.', name: 'Linh Nguyen', role: 'Intermediate Learner', initial: 'L' },
  { quote: 'I used to freeze when speaking English. Now I lead meetings at work. This completely changed my trajectory.', name: 'Carlos Mendez', role: 'Advanced Learner', initial: 'C' },
  { quote: 'I\'ve tried every app. Nothing comes close to real-time pronunciation feedback during a live conversation.', name: 'Yuki Tanaka', role: 'Beginner Learner', initial: 'Y' },
];

const STATS = [
  { value: '50K+', label: 'Active Learners' },
  { value: '120+', label: 'Countries' },
  { value: '15K+', label: 'Rooms Created' },
  { value: '4.8', label: 'Average Rating' },
];

const FAQS = [
  { q: 'How does the AI feedback work?', a: 'Our AI analyzes your speech in real time — pronunciation, grammar, fluency, and vocabulary. After each session, you get a detailed report with specific areas to improve.' },
  { q: 'Do I need to be fluent to join?', a: 'Not at all. Rooms are organized by level — beginner, intermediate, and advanced. You\'ll be matched with learners at a similar level.' },
  { q: 'How long is each session?', a: 'Most rooms run 20-30 minutes, with structured phases: warm-up, guided discussion, and wrap-up. You can join as many as you like.' },
  { q: 'Is there a free plan?', a: 'Yes, free tier includes 5 sessions per week. Premium gives unlimited access, detailed analytics, and priority matching.' },
];

const ROOM_CATEGORIES = [
  { icon: HiChatBubbleOvalLeft, title: 'Casual Chat', desc: 'Free-flowing conversation on daily topics', color: '#f1f5f9', count: '12 rooms' },
  { icon: HiBriefcase, title: 'Business English', desc: 'Meetings, presentations, negotiations', color: '#f8fafc', count: '8 rooms' },
  { icon: HiSpeakerWave, title: 'Pronunciation', desc: 'Drills and exercises for clear speech', color: '#f1f5f9', count: '6 rooms' },
  { icon: HiBookOpen, title: 'Reading & Discussion', desc: 'Read articles, discuss ideas together', color: '#f8fafc', count: '10 rooms' },
];

const TRUST_LOGOS = [
  'Duolingo', 'Babbel', 'Cambridge', 'IELTS', 'TOEFL', 'British Council',
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
          <span className="hp-badge">Now in Beta</span>
          <h1 className="hp-hero-title">
            Speak English<br />
            <span className="hp-underline">with confidence</span>
          </h1>
          <p className="hp-hero-sub">
            Practice real conversations in AI-guided video rooms. Get instant feedback on your pronunciation, grammar, and fluency.
          </p>
          <div className="hp-hero-actions">
            <button className="hp-btn hp-btn-primary" onClick={() => user ? handleQuickJoin(user.tags?.map(t => t.id) || []) : navigate('/login')}>
              Start speaking free
              <HiArrowRight size={18} />
            </button>
            <button className="hp-btn hp-btn-ghost" onClick={() => document.getElementById('hp-how')?.scrollIntoView({ behavior: 'smooth' })}>
              <HiPlay size={18} />
              See how it works
            </button>
          </div>
          <div className="hp-hero-meta">
            <HiShieldCheck size={14} /> No credit card required &middot; Free forever tier
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
          <span className="hp-trust-label">Trusted by learners preparing for</span>
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
            <span>{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── How It Works ── */}
      <section className="hp-section" id="hp-how">
        <div className="hp-contained">
          <span className="hp-eyebrow">How it works</span>
          <h2 className="hp-section-title">Three steps to fluency</h2>
          <p className="hp-section-sub">No textbooks, no boring drills. Just real conversations that build real skills.</p>
          <div className="hp-steps">
            {STEPS.map((step, i) => (
              <div key={i} className="hp-step">
                <span className="hp-step-num">{step.num}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="hp-section hp-section--alt">
        <div className="hp-contained">
          <span className="hp-eyebrow">Features</span>
          <h2 className="hp-section-title">Everything you need</h2>
          <p className="hp-section-sub">AI-powered tools built to make you a better speaker, faster.</p>
          <div className="hp-features">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div key={i} className="hp-feature">
                  <div className="hp-feature-icon" style={{ background: feat.color }}>
                    <Icon size={20} color="#fff" />
                  </div>
                  <div>
                    <h3>{feat.title}</h3>
                    <p>{feat.desc}</p>
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
          <span className="hp-eyebrow">Rooms</span>
          <h2 className="hp-section-title">Find your room</h2>
          <p className="hp-section-sub">Topics for every goal and interest. New rooms added daily.</p>
          <div className="hp-categories">
            {ROOM_CATEGORIES.map((cat, i) => (
              <div key={i} className="hp-category" style={{ background: cat.color }}>
                <span className="hp-category-icon"><cat.icon size={22} /></span>
                <h3>{cat.title}</h3>
                <p>{cat.desc}</p>
                <span className="hp-category-count">{cat.count}</span>
              </div>
            ))}
          </div>
          {rooms.length > 0 && (
            <div className="hp-rooms-preview">
              {rooms.slice(0, 3).map((room) => (
                <div key={room.id} className="hp-room-card" onClick={() => navigate(`/rooms/${room.id}`)}>
                  <div className="hp-room-card-top">
                    <span className="hp-room-card-topic">{room.topic || 'General'}</span>
                    <span className="hp-room-card-level">{room.level || 'All levels'}</span>
                  </div>
                  <h4>{room.name}</h4>
                  <p>{room.description}</p>
                  <div className="hp-room-card-meta">
                    <span>{room.participant_count || 0} speaking</span>
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
          <span className="hp-eyebrow">Testimonials</span>
          <h2 className="hp-section-title">Real learners, real results</h2>
          <p className="hp-section-sub">Join thousands who transformed their speaking skills.</p>
          <div className="hp-testimonials">
            {TESTIMONIALS.map((item, i) => (
              <div key={i} className="hp-testimonial">
                <div className="hp-testimonial-stars">
                  {[...Array(5)].map((_, j) => <HiStar key={j} size={14} />)}
                </div>
                <p className="hp-testimonial-quote">&ldquo;{item.quote}&rdquo;</p>
                <div className="hp-testimonial-byline">
                  <div className="hp-testimonial-avatar">{item.initial}</div>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.role}</span>
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
          <span className="hp-eyebrow">FAQ</span>
          <h2 className="hp-section-title">Common questions</h2>
          <p className="hp-section-sub">Everything you need to know before getting started.</p>
          <div className="pricing-faq">
            {FAQS.map((faq, i) => (
              <details key={i} className="pricing-faq__item">
                <summary>{faq.q}</summary>
                <p>{faq.a}</p>
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
            <span className="hp-eyebrow hp-cta-eyebrow">Get started</span>
            <h2>Ready to speak<br />with confidence?</h2>
            <p>Join 50,000+ learners building real English conversation skills.</p>
            <button className="hp-btn hp-btn-cta" onClick={() => navigate('/login')}>
              Get started free
              <HiArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
