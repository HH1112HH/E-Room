import { HiCheckCircle } from 'react-icons/hi2';
import { TagBadge } from '../../components/tags/TagBadge';
import '../../styles/OnboardingWizard.css';

const ENGLISH_LEVELS = {
  A1: 'Người mới bắt đầu', A2: 'Sơ cấp', B1: 'Trung cấp',
  B2: 'Trung cấp khá', C1: 'Nâng cao', C2: 'Thành thạo',
};

const GOAL_LABELS = {
  work: '💼 Sự nghiệp', interview: '🎤 Phỏng vấn', fluency: '🚀 Lưu loát',
  business: '🌍 Kinh doanh', academic: '🎓 Học thuật',
};

export function StepConfirm({ form, updateField, error }) {
  const fields = [
    { label: 'Trình độ tiếng Anh', value: form.english_level ? `${form.english_level} — ${ENGLISH_LEVELS[form.english_level] || form.english_level}` : 'Chưa thiết lập (có thể đặt sau)', key: 'level' },
    { label: 'Lĩnh vực nghề nghiệp', value: form.career_field || 'Chưa thiết lập', key: 'career' },
    { label: 'Chức danh', value: form.job_title || 'Chưa thiết lập', key: 'job' },
    { label: 'Mục tiêu học tập', value: GOAL_LABELS[form.learning_goal] || form.learning_goal || 'Chưa thiết lập', key: 'goal' },
  ];

  return (
    <div>
      <div className="text-center mb-3">
        <HiCheckCircle size={36} className="onboarding-wizard__step-icon--success" />
        <h4 className="fw-bold mt-2 mb-1">Sẵn sàng bắt đầu!</h4>
        <p className="text-muted small mb-0">Xem lại lựa chọn trước khi hoàn tất thiết lập.</p>
      </div>

      {error && (
        <div className="onboarding-wizard__error">
          ⚠️ {error}
        </div>
      )}

      {form.tagIds.length > 0 && (
        <div className="onboarding-wizard__tags-section">
          <div className="fw-bold small text-muted mb-2 onboarding-wizard__tags-header">
            Sở thích của bạn ({form.tagIds.length})
          </div>
          <div className="onboarding-wizard__tags-list">
            {form.tagIds.map((tag) => (
              <TagBadge key={tag} label={tag} />
            ))}
          </div>
        </div>
      )}

      <div className="onboarding-wizard__fields">
        {fields.map((f) => (
          <div key={f.key} className="onboarding-wizard__field">
            <span className="text-muted small fw-semibold">{f.label}</span>
            <span className="fw-semibold onboarding-wizard__field-value">{f.value}</span>
          </div>
        ))}
      </div>

      {form.tagIds.length === 0 && (
        <div className="onboarding-wizard__warning">
          ⚠️ Bạn chưa chọn thẻ nào. Ghép cặp tự động sẽ bị tắt. Bạn có thể thêm thẻ bất cứ lúc nào trong Cài đặt.
        </div>
      )}
    </div>
  );
}
