import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { HiRocketLaunch, HiXMark } from 'react-icons/hi2';
import '../../styles/UpgradePrompt.css';

export function UpgradePrompt({ feature = 'this feature', visible, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState('pro');

  if (!visible) return null;

  const plans = [
    {
      key: 'free', name: t('subscription.free'), price: '$0', features: [
        t('subscription.free_feat_corrections'),
        t('subscription.free_feat_heartbeats'),
        t('subscription.free_feat_matching'),
        t('subscription.free_feat_max5'),
      ],
      cta: t('subscription.current_plan'),
      disabled: true,
    },
    {
      key: 'pro', name: t('subscription.pro'), price: '$9.99', period: t('subscription.per_month'), features: [
        t('subscription.pro_feat_unlimited'),
        t('subscription.free_feat_heartbeats'),
        t('subscription.pro_feat_web'),
        t('subscription.pro_feat_ai_room'),
        t('subscription.free_feat_max5'),
      ],
      cta: `${t('subscription.upgrading_to')} ${t('subscription.pro')}`,
      highlighted: true,
    },
    {
      key: 'pro_plus', name: t('subscription.pro_plus'), price: '$19.99', period: t('subscription.per_month'), features: [
        t('subscription.pro_plus_feat_everything'),
        t('subscription.pro_plus_feat_heartbeats'),
        t('subscription.pro_plus_feat_rag'),
        t('subscription.tts'),
        t('subscription.pro_plus_feat_notes'),
        t('subscription.pro_plus_feat_series'),
        t('subscription.pro_plus_feat_leaderboard'),
        t('subscription.pro_plus_feat_max15'),
      ],
      cta: `${t('subscription.choose')} ${t('subscription.pro_plus')}`,
    },
  ];

  return (
    <div className="upgrade-prompt">
      <div className="upgrade-prompt__card">
        <button onClick={onClose} className="upgrade-prompt__close">
          <HiXMark size={16} />
        </button>

        <div className="text-center mb-4">
          <HiRocketLaunch size={36} className="upgrade-prompt__icon" />
          <h4 className="fw-extrabold mt-2 mb-1">
            {t('subscription.unlock')} {feature}
          </h4>
          <p className="text-muted small mb-0">
            {t('subscription.you_reached_limit')} {feature}. {t('subscription.upgrade_to_continue')}
          </p>
        </div>

        <div className="upgrade-prompt__plans">
          {plans.map((plan) => {
            const isSelected = selected === plan.key;
            const planClasses = [
              'upgrade-prompt__plan',
              plan.disabled ? 'upgrade-prompt__plan--disabled' : '',
              isSelected ? 'upgrade-prompt__plan--selected' : '',
              plan.highlighted ? 'upgrade-prompt__plan--highlighted' : '',
            ].filter(Boolean).join(' ');
            const ctaClasses = [
              'upgrade-prompt__plan-cta',
              isSelected ? 'upgrade-prompt__plan-cta--selected' : '',
              plan.disabled ? 'upgrade-prompt__plan-cta--disabled' : '',
            ].filter(Boolean).join(' ');
            return (
              <div
                key={plan.key}
                onClick={() => !plan.disabled && setSelected(plan.key)}
                className={planClasses}
              >
                {plan.highlighted && (
                  <div className="upgrade-prompt__plan-badge">
                    {t('subscription.popular')}
                  </div>
                )}
                <div className="fw-bold mb-2 upgrade-prompt__plan-name">{plan.name}</div>
                <div className="upgrade-prompt__plan-price">
                  {plan.price}<span className="upgrade-prompt__plan-period">{plan.period || ''}</span>
                </div>
                <ul className="upgrade-prompt__plan-features">
                  {plan.features.map((f, i) => (
                    <li key={i} className="d-flex align-items-center gap-1">
                      <span className="upgrade-prompt__check">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  disabled={plan.disabled}
                  onClick={() => { if (!plan.disabled) navigate('/payment'); }}
                  className={ctaClasses}
                >
                  {plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-muted text-center mt-3 mb-0 upgrade-prompt__footer">
          {t('subscription.free_trial')} • {t('subscription.cancel_anytime')} • {t('subscription.secure_payment')}
        </p>
      </div>
    </div>
  );
}
