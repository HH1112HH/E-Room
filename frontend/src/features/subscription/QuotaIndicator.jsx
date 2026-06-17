import { useSubscriptionStore } from '../../stores/subscriptionStore';
import '../../styles/QuotaIndicator.css';

export function QuotaIndicator({ type = 'corrections', used = 0, total = 3 }) {
  const { tier } = useSubscriptionStore();
  const pct = total === Infinity ? 100 : Math.min(Math.round((used / total) * 100), 100);
  const isUnlimited = total === Infinity;
  const isLow = !isUnlimited && pct >= 80;
  const isExhausted = !isUnlimited && used >= total;

  return (
    <div className="quota-indicator">
      <div className="quota-track">
        <div style={{
          height: '100%', width: isUnlimited ? 100 : `${pct}%`,
          borderRadius: 99,
          background: isExhausted ? 'var(--color-danger)' : isLow ? 'var(--color-warning)' : 'var(--color-accent-gradient)',
          transition: 'width 0.3s ease',
        }} />
      </div>
      <span style={{
        fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap',
        color: isExhausted ? 'var(--color-danger)' : isLow ? 'var(--color-warning)' : 'var(--color-text-muted)',
      }}>
        {isUnlimited ? `${used} ♾️` : `${used}/${total}`}
      </span>
    </div>
  );
}

export function QuotaRow({ label, type, used, total }) {
  return (
    <div className="quota-row">
      <span className="quota-row-label">{label}</span>
      <QuotaIndicator type={type} used={used} total={total} />
    </div>
  );
}
