import { useTranslation } from 'react-i18next';
import Form from 'react-bootstrap/Form';
import { HiAcademicCap } from 'react-icons/hi2';
import '../../styles/OnboardingWizard.css';

const LEVELS = [
  { value: 'A1', label: 'A1', descKey: 'onboarding.level_a1', detailKey: 'onboarding.level_a1_detail' },
  { value: 'A2', label: 'A2', descKey: 'onboarding.level_a2', detailKey: 'onboarding.level_a2_detail' },
  { value: 'B1', label: 'B1', descKey: 'onboarding.level_b1', detailKey: 'onboarding.level_b1_detail' },
  { value: 'B2', label: 'B2', descKey: 'onboarding.level_b2', detailKey: 'onboarding.level_b2_detail' },
  { value: 'C1', label: 'C1', descKey: 'onboarding.level_c1', detailKey: 'onboarding.level_c1_detail' },
  { value: 'C2', label: 'C2', descKey: 'onboarding.level_c2', detailKey: 'onboarding.level_c2_detail' },
];

export function StepEnglishLevel({ form, updateField }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="text-center mb-3">
        <HiAcademicCap size={36} className="onboarding-wizard__step-icon" />
        <h4 className="fw-bold mt-2 mb-1">{t('onboarding.level_title')}</h4>
        <p className="text-muted small mb-0">{t('onboarding.level_sub')}</p>
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
                <div className="fw-bold onboarding-wizard__goal-label">{t(lvl.descKey)}</div>
                <div className="text-muted onboarding-wizard__goal-desc">{t(lvl.detailKey)}</div>
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