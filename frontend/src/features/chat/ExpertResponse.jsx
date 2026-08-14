import { HiSparkles } from 'react-icons/hi2';
import './ExpertResponse.css';

export function ExpertResponse({ response }) {
  if (!response) return null;

  return (
    <div className="expert-response">
      <div className="d-flex align-items-start gap-2">
        <div className="expert-response__avatar">
          <HiSparkles size={14} color="#fff" />
        </div>
        <div className="expert-response__content">
          <div className="expert-response__label">
            🧠 Câu trả lời chuyên gia
          </div>
          <div className="expert-response__text">
            {response.text}
          </div>
          {response.sources && response.sources.length > 0 && (
            <div className="expert-response__sources">
              {response.sources.map((src, i) => (
                <span key={i} className="expert-response__source">
                  🔗 {src.title || src}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
