import Form from 'react-bootstrap/Form';
import { HiBriefcase } from 'react-icons/hi2';
import '../../styles/OnboardingWizard.css';

const CAREER_FIELDS = [
  'Công nghệ', 'Kinh doanh', 'Y tế', 'Giáo dục',
  'Tài chính', 'Marketing', 'Kỹ thuật', 'Khoa học',
  'Nghệ thuật & Thiết kế', 'Luật', 'Khác',
];

export function StepJobTitle({ form, updateField }) {
  return (
    <div>
      <div className="text-center mb-3">
        <HiBriefcase size={36} className="onboarding-wizard__step-icon" />
        <h4 className="fw-bold mt-2 mb-1">Cho chúng tôi biết về công việc của bạn</h4>
        <p className="text-muted small mb-0">Giúp chúng tôi gợi ý chủ đề phù hợp. Không bắt buộc — bạn có thể bỏ qua.</p>
      </div>

      <div className="onboarding-wizard__step-form">
        <Form.Label className="fw-semibold small text-muted">Lĩnh vực nghề nghiệp</Form.Label>
        <div className="onboarding-wizard__career-list">
          {CAREER_FIELDS.map((field) => {
            const active = form.career_field === field;
            return (
              <button
                key={field}
                type="button"
                onClick={() => updateField('career_field', active ? '' : field)}
                className={`onboarding-wizard__career-pill${active ? ' onboarding-wizard__career-pill--active' : ''}`}
              >
                {field}
              </button>
            );
          })}
        </div>

        <Form.Label className="fw-semibold small text-muted">Chức danh (không bắt buộc)</Form.Label>
        <Form.Control
          type="text"
          value={form.job_title}
          onChange={(e) => updateField('job_title', e.target.value)}
          placeholder="vd: Kỹ sư phần mềm, Giáo viên..."
          className="rounded-3"
        />
      </div>
    </div>
  );
}
