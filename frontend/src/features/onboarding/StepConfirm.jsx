import { HiCheckCircle } from 'react-icons/hi2';
import { TagBadge } from '../../components/tags/TagBadge';
import '../../styles/OnboardingWizard.css';

const ENGLISH_LEVELS = {
  A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate',
  B2: 'Upper-Intermediate', C1: 'Advanced', C2: 'Proficient',
};

const GOAL_LABELS = {
  work: '💼 Career', interview: '🎤 Interview', fluency: '🚀 Fluency',
  business: '🌍 Business', academic: '🎓 Academic',
};

export function StepConfirm({ form, updateField, error }) {
  const fields = [
    { label: 'English Level', value: form.english_level ? `${form.english_level} — ${ENGLISH_LEVELS[form.english_level] || form.english_level}` : 'Not set (can be set later)', key: 'level' },
    { label: 'Career Field', value: form.career_field || 'Not set', key: 'career' },
    { label: 'Job Title', value: form.job_title || 'Not set', key: 'job' },
    { label: 'Learning Goal', value: GOAL_LABELS[form.learning_goal] || form.learning_goal || 'Not set', key: 'goal' },
  ];

  return (
    <div>
      <div className="text-center mb-3">
        <HiCheckCircle size={36} className="onboarding-wizard__step-icon--success" />
        <h4 className="fw-bold mt-2 mb-1">Ready to start!</h4>
        <p className="text-muted small mb-0">Review your selections before we finish setting up.</p>
      </div>

      {error && (
        <div className="onboarding-wizard__error">
          ⚠️ {error}
        </div>
      )}

      {form.tagIds.length > 0 && (
        <div className="onboarding-wizard__tags-section">
          <div className="fw-bold small text-muted mb-2 onboarding-wizard__tags-header">
            Your Interests ({form.tagIds.length})
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
          ⚠️ You haven't selected any tags. Auto-matching will be disabled. You can always add tags later in Settings.
        </div>
      )}
    </div>
  );
}
