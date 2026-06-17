import '../../styles/Card.css';

export function Card({ title, subtitle, children, action, className = '' }) {
  return (
    <div className={`card shadow-sm border-0 card-custom ${className}`}>
      {(title || subtitle) && (
        <div className="card-custom-header">
          <div>
            {title && <h5 className="card-custom-title">{title}</h5>}
            {subtitle && <p className="card-custom-subtitle">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="card-custom-body">
        {children}
      </div>
    </div>
  );
}
