import { HiRocketLaunch, HiBriefcase, HiMicrophone, HiAcademicCap, HiGlobeAlt } from 'react-icons/hi2';
import '../../styles/OnboardingWizard.css';

const GOALS = [
  { key: 'work', label: 'Sự nghiệp', desc: 'Cải thiện tiếng Anh cho công việc và phát triển nghề nghiệp', icon: HiBriefcase },
  { key: 'interview', label: 'Phỏng vấn', desc: 'Chuẩn bị phỏng vấn xin việc bằng tiếng Anh', icon: HiMicrophone },
  { key: 'fluency', label: 'Lưu loát', desc: 'Nói tự nhiên và tự tin hơn', icon: HiRocketLaunch },
  { key: 'business', label: 'Kinh doanh', desc: 'Thành thạo tiếng Anh thương mại và đàm phán', icon: HiGlobeAlt },
  { key: 'academic', label: 'Học thuật', desc: 'Chuẩn bị cho việc học, thi cử hoặc nghiên cứu', icon: HiAcademicCap },
];

export function StepLearningGoal({ form, updateField }) {
  return (
    <div>
      <div className="text-center mb-3">
        <HiRocketLaunch size={36} className="onboarding-wizard__step-icon" />
        <h4 className="fw-bold mt-2 mb-1">Mục tiêu học tập của bạn là gì?</h4>
        <p className="text-muted small mb-0">Chọn lý do chính để luyện tiếng Anh.</p>
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
