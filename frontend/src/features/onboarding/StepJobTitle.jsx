import Form from 'react-bootstrap/Form';
import { HiBriefcase } from 'react-icons/hi2';
import '../../styles/OnboardingWizard.css';

const CAREER_FIELDS = [
  'Technology', 'Business', 'Healthcare', 'Education',
  'Finance', 'Marketing', 'Engineering', 'Science',
  'Arts & Design', 'Law', 'Other',
];

export function StepJobTitle({ form, updateField }) {
  return (
    <div>
      <div className="text-center mb-3">
        <HiBriefcase size={36} className="onboarding-wizard__step-icon" />
        <h4 className="fw-bold mt-2 mb-1">Tell us about your work</h4>
        <p className="text-muted small mb-0">Helps us suggest relevant conversation topics. Optional — you can skip.</p>
      </div>

      <div className="onboarding-wizard__step-form">
        <Form.Label className="fw-semibold small text-muted">Career Field</Form.Label>
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

        <Form.Label className="fw-semibold small text-muted">Job Title (optional)</Form.Label>
        <Form.Control
          type="text"
          value={form.job_title}
          onChange={(e) => updateField('job_title', e.target.value)}
          placeholder="e.g. Software Engineer, Teacher..."
          className="rounded-3"
        />
      </div>
    </div>
  );
}
