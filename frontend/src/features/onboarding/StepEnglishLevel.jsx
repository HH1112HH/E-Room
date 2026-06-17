import Form from 'react-bootstrap/Form';
import { HiAcademicCap } from 'react-icons/hi2';
import '../../styles/OnboardingWizard.css';

const LEVELS = [
  { value: 'A1', label: 'A1', desc: 'Beginner', detail: 'Can understand basic phrases' },
  { value: 'A2', label: 'A2', desc: 'Elementary', detail: 'Can communicate simple tasks' },
  { value: 'B1', label: 'B1', desc: 'Intermediate', detail: 'Can handle everyday situations' },
  { value: 'B2', label: 'B2', desc: 'Upper-Intermediate', detail: 'Can discuss complex topics' },
  { value: 'C1', label: 'C1', desc: 'Advanced', detail: 'Can express ideas fluently' },
  { value: 'C2', label: 'C2', desc: 'Proficient', detail: 'Near-native proficiency' },
];

export function StepEnglishLevel({ form, updateField }) {
  return (
    <div>
      <div className="text-center mb-3">
        <HiAcademicCap size={36} className="onboarding-wizard__step-icon" />
        <h4 className="fw-bold mt-2 mb-1">What's your English level?</h4>
        <p className="text-muted small mb-0">This helps us match you with the right partners. You can skip and set it later.</p>
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
