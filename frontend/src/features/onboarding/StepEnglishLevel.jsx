import Form from 'react-bootstrap/Form';
import { HiAcademicCap } from 'react-icons/hi2';
import '../../styles/OnboardingWizard.css';

const LEVELS = [
  { value: 'A1', label: 'A1', desc: 'Người mới bắt đầu', detail: 'Có thể hiểu các cụm từ cơ bản' },
  { value: 'A2', label: 'A2', desc: 'Sơ cấp', detail: 'Có thể giao tiếp các nhiệm vụ đơn giản' },
  { value: 'B1', label: 'B1', desc: 'Trung cấp', detail: 'Xử lý được các tình huống hằng ngày' },
  { value: 'B2', label: 'B2', desc: 'Trung cấp khá', detail: 'Có thể thảo luận chủ đề phức tạp' },
  { value: 'C1', label: 'C1', desc: 'Nâng cao', detail: 'Diễn đạt ý tưởng trôi chảy' },
  { value: 'C2', label: 'C2', desc: 'Thành thạo', detail: 'Gần như người bản ngữ' },
];

export function StepEnglishLevel({ form, updateField }) {
  return (
    <div>
      <div className="text-center mb-3">
        <HiAcademicCap size={36} className="onboarding-wizard__step-icon" />
        <h4 className="fw-bold mt-2 mb-1">Trình độ tiếng Anh của bạn?</h4>
        <p className="text-muted small mb-0">Điều này giúp chúng tôi ghép bạn với đối tác phù hợp. Bạn có thể bỏ qua và đặt sau.</p>
      </div>

      <div className="onboarding-wizard__level-list">
        {LEVELS.map((lvl) => {
          const active = form.english_level === lvl.value;
          return (
            <button
              key={lvl.value}
              type="button"
              onClick={() => updateField('english_level', active ? '' : lvl.value)}
              className={`onboarding-wizard__level-option${active ? ' onboarding-wizard__level-option--active' : ''}`}
            >
              <div className={`onboarding-wizard__level-badge${active ? ' onboarding-wizard__level-badge--active' : ''}`}>
                {lvl.label}
              </div>
              <div className="onboarding-wizard__level-info">
                <div className="fw-bold onboarding-wizard__goal-label">{lvl.desc}</div>
                <div className="text-muted onboarding-wizard__goal-desc">{lvl.detail}</div>
              </div>
              <input
                type="radio"
                checked={active}
                onChange={() => updateField('english_level', lvl.value)}
                className="onboarding-wizard__level-radio"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
