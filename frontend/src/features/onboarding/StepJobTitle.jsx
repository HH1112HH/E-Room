import { useTranslation } from 'react-i18next';
import Form from 'react-bootstrap/Form';
import { HiBriefcase } from 'react-icons/hi2';
import '../../styles/OnboardingWizard.css';

const CAREER_FIELDS = [
  { id: 'Technology', labelKey: 'onboarding.career_tech' },
  { id: 'Business', labelKey: 'onboarding.career_business' },
  { id: 'Health', labelKey: 'onboarding.career_health' },
  { id: 'Education', labelKey: 'onboarding.career_education' },
  { id: 'Finance', labelKey: 'onboarding.career_finance' },
  { id: 'Marketing', labelKey: 'onboarding.career_marketing' },
  { id: 'Engineering', labelKey: 'onboarding.career_engineering' },
  { id: 'Science', labelKey: 'onboarding.career_science' },
  { id: 'Art & Design', labelKey: 'onboarding.career_art' },
  { id: 'Law', labelKey: 'onboarding.career_law' },
  { id: 'Other', labelKey: 'onboarding.career_other' },
];

export function StepJobTitle({ form, updateField }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="text-center mb-3">
        <HiBriefcase size={36} className="onboarding-wizard__step-icon" />
        <h4 className="fw-bold mt-2 mb-1">{t('onboarding.job_title')}</h4>
        <p className="text-muted small mb-0">{t('onboarding.job_sub')}</p>
      </div>

      <div className="onboarding-wizard__step-form">
        <Form.Label className="fw-semibold small text-muted">{t('onboarding.career_field')}</Form.Label>
        <div className="onboarding-wizard__career-list">
          {CAREER_FIELDS.map((field) => {
            const active = form.career_field === field.id;
            return (
              <button
                key={field.id}
                type="button"
                onClick={() => updateField('career_field', active ? '' : field.id)}
                className={`onboarding-wizard__career-pill${active ? ' onboarding-wizard__career-pill--active' : ''}`}
              >
                {t(field.labelKey)}
              </button>
            );
          })}
        </div>

        <Form.Label className="fw-semibold small text-muted">{t('onboarding.job_title_optional')}</Form.Label>
        <Form.Control
          type="text"
          value={form.job_title}
          onChange={(e) => updateField('job_title', e.target.value)}
          placeholder={t('onboarding.job_title_placeholder')}
          className="rounded-3"
        />
      </div>
    </div>
  );
}