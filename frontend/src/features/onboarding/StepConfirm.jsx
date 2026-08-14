import { useTranslation } from 'react-i18next';
import { HiCheckCircle } from 'react-icons/hi2';
import { TagBadge } from '../../components/tags/TagBadge';
import '../../styles/OnboardingWizard.css';

const ENGLISH_LEVELS = {
  A1: 'onboarding.level_a1', A2: 'onboarding.level_a2', B1: 'onboarding.level_b1',
  B2: 'onboarding.level_b2', C1: 'onboarding.level_c1', C2: 'onboarding.level_c2',
};

const GOAL_EMOJI = {
  work: '💼', interview: '🎤', fluency: '🚀',
  business: '🌍', academic: '🎓',
};

const CAREER_LABEL_KEYS = {
  Technology: 'onboarding.career_tech', Business: 'onboarding.career_business', Health: 'onboarding.career_health',
  Education: 'onboarding.career_education', Finance: 'onboarding.career_finance', Marketing: 'onboarding.career_marketing',
  Engineering: 'onboarding.career_engineering', Science: 'onboarding.career_science', 'Art & Design': 'onboarding.career_art',
  Law: 'onboarding.career_law', Other: 'onboarding.career_other',
};

export function StepConfirm({ form, updateField, error }) {
  const { t } = useTranslation();
  const fields = [
    {
      label: t('onboarding.step_level'),
      value: form.english_level ? `${form.english_level} — ${ENGLISH_LEVELS[form.english_level] ? t(ENGLISH_LEVELS[form.english_level]) : form.english_level}` : t('onboarding.not_set_later'),
      key: 'level',
    },
    { label: t('onboarding.career_field'), value: form.career_field ? (CAREER_LABEL_KEYS[form.career_field] ? t(CAREER_LABEL_KEYS[form.career_field]) : form.career_field) : t('onboarding.not_set'), key: 'career' },    { label: t('onboarding.job_title_label'), value: form.job_title || t('onboarding.not_set'), key: 'job' },
    {
      label: t('onboarding.step_goal'),
      value: form.learning_goal ? `${GOAL_EMOJI[form.learning_goal] || ''} ${t(`onboarding.goal_${form.learning_goal}`)}` : t('onboarding.not_set'),
      key: 'goal',
    },
  ];

  return (
    <div>
      <div className="text-center mb-3">
        <HiCheckCircle size={36} className="onboarding-wizard__step-icon--success" />
        <h4 className="fw-bold mt-2 mb-1">{t('onboarding.confirm_title')}</h4>
        <p className="text-muted small mb-0">{t('onboarding.confirm_sub')}</p>
      </div>

      {error && (
        <div className="onboarding-wizard__error">
          ⚠️ {error}
        </div>
      )}

      {form.tagIds.length > 0 && (
        <div className="onboarding-wizard__tags-section">
          <div className="fw-bold small text-muted mb-2 onboarding-wizard__tags-header">
            {t('onboarding.your_tags', { count: form.tagIds.length })}
          </div>
          <div className="onboarding-wizard__tags-list">
            {form.tagIds.map((tag) => (
              <TagBadge key={tag} label={typeof tag === 'string' ? t(tag) : tag} />
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
          {t('onboarding.no_tags_warning')}
        </div>
      )}
    </div>
  );
}