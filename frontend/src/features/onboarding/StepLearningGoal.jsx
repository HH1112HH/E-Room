import { useTranslation } from 'react-i18next';
import { HiRocketLaunch, HiBriefcase, HiMicrophone, HiAcademicCap, HiGlobeAlt } from 'react-icons/hi2';
import '../../styles/OnboardingWizard.css';

const GOALS = [
  { key: 'work', labelKey: 'onboarding.goal_work', descKey: 'onboarding.goal_work_desc', icon: HiBriefcase },
  { key: 'interview', labelKey: 'onboarding.goal_interview', descKey: 'onboarding.goal_interview_desc', icon: HiMicrophone },
  { key: 'fluency', labelKey: 'onboarding.goal_fluency', descKey: 'onboarding.goal_fluency_desc', icon: HiRocketLaunch },
  { key: 'business', labelKey: 'onboarding.goal_business', descKey: 'onboarding.goal_business_desc', icon: HiGlobeAlt },
  { key: 'academic', labelKey: 'onboarding.goal_academic', descKey: 'onboarding.goal_academic_desc', icon: HiAcademicCap },
];

export function StepLearningGoal({ form, updateField }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="text-center mb-3">
        <HiRocketLaunch size={36} className="onboarding-wizard__step-icon" />
        <h4 className="fw-bold mt-2 mb-1">{t('onboarding.goal_title')}</h4>
        <p className="text-muted small mb-0">{t('onboarding.goal_sub')}</p>
      </div>

      <div className="onboarding-wizard__goal-list">
        {GOALS.map((goal) => {
          const Icon = goal.icon;
          const active = form.learning_goal === goal.key;
          return (
            <button
              key={goal.key}
              type="button"
              onClick={() => updateField('learning_goal', active ? '' : goal.key)}
              className={`onboarding-wizard__goal-option${active ? ' onboarding-wizard__goal-option--active' : ''}`}
            >
              <div className={`onboarding-wizard__goal-icon${active ? ' onboarding-wizard__goal-icon--active' : ''}`}>
                <Icon size={20} />
              </div>
              <div>
                <div className="fw-bold onboarding-wizard__goal-label">{t(goal.labelKey)}</div>
                <div className="text-muted onboarding-wizard__goal-desc">{t(goal.descKey)}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}