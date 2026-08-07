import '../../styles/Logo.css';

export function Logo({ size = 32, showText = true }) {
  return (
    <span className="d-inline-flex align-items-center gap-2 logo-wrapper">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="logo-icon">
        <rect x="3" y="4" width="26" height="6.5" rx="3.25" fill="#336699" />
        <rect x="3" y="12.75" width="16" height="6.5" rx="3.25" fill="#006699" />
        <rect x="3" y="21.5" width="26" height="6.5" rx="3.25" fill="#336699" />
      </svg>
      {showText && (
        <span className="logo-text">
          E-Room
        </span>
      )}
    </span>
  );
}
