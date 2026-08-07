import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import { fetchJson } from '../../lib/api';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { useAuth } from '../../app/AuthContext';
import { UpgradePrompt } from '../subscription/UpgradePrompt';
import { HiUser, HiClock, HiChartBar } from 'react-icons/hi2';
import '../../styles/LeaderboardPage.css';

const TIME_RANGES = ['weekly', 'monthly', 'all'];

export function LeaderboardPage() {
  const { t } = useTranslation();
  const { tier, features } = useSubscriptionStore();
  const { user } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [period, setPeriod] = useState('weekly');

  const { data: leaderboardData = null, isLoading } = useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => fetchJson(`/leaderboard?period=${period}`),
    enabled: tier === 'pro_plus',
  });
  const leaderboard = leaderboardData?.entries || [];
  const userEntry = leaderboard.find((e) => user && String(user.id) === e.user_id);
  const userRank = userEntry ? leaderboard.indexOf(userEntry) + 1 : null;

  if (!features.leaderboard) {
    return (
      <>
        <Container className="leaderboard-page py-4 text-center">
          <div className="leaderboard-page__upgrade">
            <h3>{t('marketing.leaderboard_upgrade_title')}</h3>
            <p>{t('marketing.leaderboard_upgrade_sub')}</p>
            <Button variant="primary" onClick={() => setShowUpgrade(true)}>{t('marketing.leaderboard_upgrade_btn')}</Button>
          </div>
        </Container>
        <UpgradePrompt feature="Leaderboard" visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </>
    );
  }

  return (
    <Container className="leaderboard-page py-4 fade-in">
      <div className="leaderboard-page__top">
        <div>
          <h1>{t('marketing.leaderboard_title')}</h1>
          <p className="leaderboard-page__subtitle">{t('marketing.leaderboard_subtitle')}</p>
        </div>
      </div>

      <div className="leaderboard-page__filters">
        {TIME_RANGES.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`leaderboard-page__filter${period === p ? ' is-active' : ''}`}
          >
            {p === 'weekly' ? t('marketing.leaderboard_this_week') : p === 'monthly' ? t('marketing.leaderboard_this_month') : t('marketing.leaderboard_all_time')}
          </button>
        ))}
      </div>

      {userEntry && userRank && (
        <div className="leaderboard-page__user-row">
          <div className="leaderboard-page__user-row-inner">
            <span className="leaderboard-page__rank">{userRank > 9 ? userRank : `0${userRank}`}</span>
            <div className="leaderboard-page__avatar" style={{ background: `hsl(${userRank * 53}, 65%, 55%)` }}>
              {(userEntry.display_name || '?')[0].toUpperCase()}
            </div>
            <div className="leaderboard-page__info">
              <div className="leaderboard-page__name">{userEntry.display_name || t('marketing.leaderboard_anonymous')} <span className="leaderboard-page__you-tag">{t('marketing.leaderboard_you')}</span></div>
              <div className="leaderboard-page__stats">
                <span className="leaderboard-page__stat-badge"><HiClock size={11} />{Math.round((userEntry.speaking_time_seconds || 0) / 60)}m</span>
                <span className="leaderboard-page__stat-badge"><HiChartBar size={11} />{userEntry.sessions_count || 0} {t('marketing.leaderboard_sessions')}</span>
              </div>
            </div>
            <div className="leaderboard-page__score">
              <span className="leaderboard-page__score-val">{userEntry.avg_score != null ? Math.round(userEntry.avg_score) : 0}</span>
              <span className="leaderboard-page__score-lbl">{t('marketing.leaderboard_pts')}</span>
            </div>
          </div>
        </div>
      )}

      {!userEntry && leaderboard.length > 0 && (
        <div className="leaderboard-page__compete">
          <HiUser size={16} />
          <span><strong>{leaderboard.length}</strong> {t('marketing.leaderboard_participants')}</span>
          <span>{t('marketing.leaderboard_compete_sub')}</span>
        </div>
      )}

      {isLoading ? (
        <div className="leaderboard-page__loading">
          <Spinner animation="border" variant="primary" />
          <span>{t('marketing.leaderboard_loading')}</span>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="leaderboard-page__empty">
          <h3>{t('marketing.leaderboard_empty_title')}</h3>
          <p>{t('marketing.leaderboard_empty_sub')}</p>
        </div>
      ) : (
        <>
          <div className="leaderboard-page__list">
            {leaderboard.map((entry, i) => {
              const rank = i + 1;
              return (
                <div key={entry.user_id || i} className="leaderboard-page__row">
                  <span className="leaderboard-page__rank">{rank > 9 ? rank : `0${rank}`}</span>
                  <div className="leaderboard-page__avatar" style={{ background: `hsl(${rank * 53}, 65%, 55%)` }}>
                    {(entry.display_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="leaderboard-page__info">
                    <div className="leaderboard-page__name">{entry.display_name || t('marketing.leaderboard_anonymous')}</div>
                    <div className="leaderboard-page__stats">
                      <span className="leaderboard-page__stat-badge"><HiClock size={11} />{Math.round((entry.speaking_time_seconds || 0) / 60)}m</span>
                      <span className="leaderboard-page__stat-badge"><HiChartBar size={11} />{entry.sessions_count || 0} {t('marketing.leaderboard_sessions')}</span>
                    </div>
                  </div>
                  <div className="leaderboard-page__score">
                    <span className="leaderboard-page__score-val">{entry.avg_score != null ? Math.round(entry.avg_score) : 0}</span>
                    <span className="leaderboard-page__score-lbl">{t('marketing.leaderboard_pts')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Container>
  );
}
