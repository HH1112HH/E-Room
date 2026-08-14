import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import { fetchJson } from '../../lib/api';
import { useAuth } from '../../app/AuthContext';
import { StepEnglishLevel } from './StepEnglishLevel';
import { StepTagPicker } from './StepTagPicker';
import { StepJobTitle } from './StepJobTitle';
import { StepLearningGoal } from './StepLearningGoal';
import { StepConfirm } from './StepConfirm';
import '../../styles/OnboardingWizard.css';

const STEPS = [
  { key: 'level', title: 'Trình độ tiếng Anh', component: StepEnglishLevel },
  { key: 'tags', title: 'Sở thích', component: StepTagPicker },
  { key: 'job', title: 'Thông tin công việc', component: StepJobTitle },
  { key: 'goal', title: 'Mục tiêu học tập', component: StepLearningGoal },
  { key: 'confirm', title: 'Xác nhận', component: StepConfirm },
];

const STORAGE_KEY = 'eroom-onboarding-progress';

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveProgress(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState(() => ({
    english_level: user?.english_level || loadProgress().english_level || '',
    tagIds: loadProgress().tagIds || [],
    career_field: loadProgress().career_field || '',
    job_title: loadProgress().job_title || '',
    learning_goal: loadProgress().learning_goal || '',
  }));

  function updateField(field, value) {
    const updated = { ...form, [field]: value };
    setForm(updated);
    saveProgress(updated);
  }

  const canProceed = () => true;

  async function handleFinish() {
    setSaving(true);
    setError('');
    try {
      await fetchJson('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          english_level: form.english_level || null,
          career_field: form.career_field || null,
          job_title: form.job_title || null,
          learning_goal: form.learning_goal || null,
          profile_completed: true,
        }),
      });

      if (form.tagIds.length > 0) {
        await fetchJson('/tags/bulk-add', {
          method: 'POST',
          body: JSON.stringify({ tag_ids: form.tagIds }),
        });
      }

      localStorage.removeItem(STORAGE_KEY);
      setUser({ ...user, profile_completed: true, english_level: form.english_level });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.message || 'Không thể lưu hồ sơ');
    } finally {
      setSaving(false);
    }
  }

  const CurrentStep = STEPS[step].component;
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="onboarding-wizard">
      <div className="onboarding-wizard__progress">
        <div className="onboarding-wizard__progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <Container className="onboarding-wizard__container">
        <div className="onboarding-wizard__logo">E</div>

        <div className="onboarding-wizard__heading">
          <h1>{step === 0 ? 'Chào mừng bạn đến với E-Room!' : STEPS[step].title}</h1>
          <p>Bước {step + 1} trên {STEPS.length}</p>
        </div>

        <CurrentStep form={form} updateField={updateField} error={error} />

        <div className="onboarding-wizard__nav">
          <Button
            variant="outline-secondary"
            className="px-4"
            onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/')}
          >
            {step === 0 ? 'Bỏ qua thiết lập' : 'Quay lại'}
          </Button>

          {isLast ? (
            <Button
              variant="primary"
              className="px-4 fw-semibold onboarding-wizard__btn-continue"
              onClick={handleFinish}
              disabled={saving}
            >
              {saving ? (
                <><Spinner animation="border" size="sm" className="me-2" /> Đang lưu...</>
              ) : 'Hoàn tất thiết lập'}
            </Button>
          ) : (
            <Button
              variant="primary"
              className="px-4 fw-semibold"
              onClick={() => canProceed() && setStep(s => s + 1)}
              disabled={!canProceed()}
            >
              Tiếp tục
            </Button>
          )}
        </div>
      </Container>
    </div>
  );
}
