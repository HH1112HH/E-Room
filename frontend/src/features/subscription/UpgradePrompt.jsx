import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { HiRocketLaunch, HiXMark } from 'react-icons/hi2';
import '../../styles/UpgradePrompt.css';

export function UpgradePrompt({ feature = 'this feature', visible, onClose }) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState('pro');

  if (!visible) return null;

  const plans = [
    {
      key: 'free', name: 'Free', price: '$0', features: [
        '3 lần sửa lỗi AI mỗi buổi',
        '1 Heartbeat mỗi phòng',
        'Ghép cặp cơ bản',
        'Tối đa 5 người tham gia',
      ],
      cta: 'Gói hiện tại',
      disabled: true,
    },
    {
      key: 'pro', name: 'Pro', price: '$9.99', period: '/tháng', features: [
        'Sửa lỗi không giới hạn',
        '3 Heartbeat mỗi phòng',
        'Web Search Expert',
        'Luyện tập phòng AI',
        'Tối đa 5 người tham gia',
      ],
      cta: 'Nâng cấp lên Pro',
      highlighted: true,
    },
    {
      key: 'pro_plus', name: 'Pro+', price: '$19.99', period: '/tháng', features: [
        'Mọi tính năng của Pro',
        '5 Heartbeat mỗi phòng',
        'Đầy đủ RAG + Web Expert',
        'Phát âm TTS',
        'Ghi chú buổi học tự động',
        'Chuỗi phòng',
        'Bảng xếp hạng',
        'Tối đa 15 người tham gia',
      ],
      cta: 'Chọn Pro+',
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
            Mở khóa {feature}
          </h4>
          <p className="text-muted small mb-0">
            Bạn đã đạt giới hạn cho {feature}. Nâng cấp để tiếp tục.
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
                    PHỔ BIẾN
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
          7 ngày dùng thử miễn phí • Hủy bất cứ lúc nào • Thanh toán an toàn
        </p>
      </div>
    </div>
  );
}
