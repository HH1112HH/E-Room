import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';

export function AIAssistantScaffold() {
  const { t } = useTranslation();
  return (
    <Card title={t('room.ai_module')} subtitle={t('room.ai_module_sub')}>
      <div className="ai-grid-scaffold">
        <div className="ai-box-scaffold">
          <strong>{t('subscription.heartbeats')}</strong>
          <p>{t('room.ai_heartbeat_desc')}</p>
        </div>
        <div className="ai-box-scaffold">
          <strong>{t('subscription.expert')}</strong>
          <p>{t('room.ai_expert_desc')}</p>
        </div>
        <div className="ai-box-scaffold">
          <strong>{t('subscription.corrections')}</strong>
          <p>{t('room.ai_correction_desc')}</p>
        </div>
      </div>
    </Card>
  );
}
