import { HiRocketLaunch, HiBriefcase, HiMicrophone, HiAcademicCap, HiGlobeAlt } from 'react-icons/hi2';
import '../../styles/OnboardingWizard.css';

const GOALS = [
  { key: 'work', label: 'Career', desc: 'Improve English for work and professional growth', icon: HiBriefcase },
  { key: 'interview', label: 'Interview', desc: 'Prepare for job interviews in English', icon: HiMicrophone },
  { key: 'fluency', label: 'Fluency', desc: 'Speak more naturally and confidently', icon: HiRocketLaunch },
  { key: 'business', label: 'Business', desc: 'Master business English and negotiations', icon: HiGlobeAlt },
  { key: 'academic', label: 'Academic', desc: 'Prepare for studies, exams, or research', icon: HiAcademicCap },
];

export function StepLearningGoal({ form, updateField }) {
  return (
    <div>
      <div className="text-center mb-3">
        <HiRocketLaunch size={36} className="onboarding-wizard__step-icon" />
        <h4 className="fw-bold mt-2 mb-1">What's your learning goal?</h4>
        <p className="text-muted small mb-0">Choose your primary reason for practicing English.</p>
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
                <div className="fw-bold onboarding-wizard__goal-label">{goal.label}</div>
                <div className="text-muted onboarding-wizard__goal-desc">{goal.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
