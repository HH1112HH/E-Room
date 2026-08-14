import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import { fetchJson } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { UpgradePrompt } from '../subscription/UpgradePrompt';
import { useTagStore } from '../../stores/tagStore';
import { TagBadge } from '../../components/tags/TagBadge';
import '../../styles/SeriesPage.css';

export function SeriesPage() {
  const { t } = useTranslation();
  const { tier, features } = useSubscriptionStore();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const { popularTags } = useTagStore();
  const tagMap = Object.fromEntries((popularTags || []).map((t) => [t.id, t.name || t]));
  const { data: series = [], isLoading } = useQuery({
    queryKey: ['series'],
    queryFn: () => fetchJson('/series'),
    enabled: tier === 'pro_plus',
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => fetchJson(`/series/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['series'] }),
  });

  if (!features.series) {
    return (
      <>
        <Container className="series-page py-4 text-center">
          <div className="series-page__upgrade">
            <h3>{t('series.pro_feature_title')}</h3>
            <p>{t('series.pro_feature_desc')}</p>
            <Button variant="primary" onClick={() => setShowUpgrade(true)}>{t('series.upgrade_btn')}</Button>
          </div>
        </Container>
        <UpgradePrompt feature={t('series.upgrade_title')} visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </>
    );
  }

  return (
    <Container className="series-page py-4 fade-in">
      <div className="series-page__top">
        <div>
          <h1>{t('series.title')}</h1>
          <p className="series-page__subtitle">{t('series.subtitle')}</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          {t('series.create')}
        </Button>
      </div>

      {isLoading ? (
        <div className="series-page__loading">
          <Spinner animation="border" variant="primary" />
          <span>{t('series.loading')}</span>
        </div>
      ) : series.length === 0 ? (
        <div className="series-page__empty">
          <h3>{t('series.no_series')}</h3>
          <p>{t('series.no_series_desc')}</p>
          <Button variant="primary" onClick={() => setShowCreate(true)}>{t('series.create')}</Button>
        </div>
      ) : (
        <div className="series-page__list">
          {series.map((s) => {
            const totalSessions = s.total_sessions || 0;
            return (
              <div key={s.id} className="series-page__row">
                <div className="series-page__row-top">
                  <div className="series-page__row-body">
                    <div className="series-page__row-title">{s.title}</div>
                    <div className="series-page__row-meta">
                      {s.tag_id && tagMap[s.tag_id] ? <TagBadge label={tagMap[s.tag_id]} /> : s.tag_id ? <span className="series-page__tag-placeholder">{s.tag_id.slice(0, 8)}</span> : null}
                      <span>{totalSessions} {t('series.sessions_count')}</span>
                    </div>
                  </div>
                  <div className="series-page__row-actions">
                    <span className="series-page__active-label">{t('series.active')}</span>
                    <button onClick={() => deleteMutation.mutate(s.id)} className="series-page__delete-btn">{t('common.delete')}</button>
                  </div>
                </div>
                <div className="series-page__progress">
                  <div className="series-page__progress-track"><div className="series-page__progress-fill" style={{ width: '0%' }} /></div>
                  <span className="series-page__progress-text">0/{totalSessions} {t('series.sessions_count')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateSeriesModal visible={showCreate} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: ['series'] }); }} />
    </Container>
  );
}

function CreateSeriesModal({ visible, onClose, onCreated }) {
  const { t } = useTranslation();
  const { popularTags } = useTagStore();
  const [form, setForm] = useState({ title: '', tag_id: '', total_sessions: 4, schedule_cron: '0 0 * * 1' });

  const createMutation = useMutation({
    mutationFn: (data) => fetchJson('/series', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: onCreated,
  });

  function handleSubmit(e) {
    e.preventDefault();
    createMutation.mutate(form);
  }

  return (
    <Modal show={visible} onHide={onClose} centered>
      <Modal.Body className="series-page__modal-body">
        <h2 className="series-page__modal-title">{t('series.modal_title')}</h2>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="series-page__modal-label">{t('series.form_title')}</Form.Label>
            <Form.Control type="text" placeholder={t('series.form_title_placeholder')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="series-page__modal-label">{t('series.form_topic_tag')}</Form.Label>
            <Form.Select value={form.tag_id} onChange={(e) => setForm({ ...form, tag_id: e.target.value })} required>
              <option value="">{t('series.form_select_tag')}</option>
              {(popularTags || []).map((t) => (
                <option key={t.id || t} value={t.id || t}>{t.name || t}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="series-page__modal-label">{t('series.form_sessions')}</Form.Label>
            <Form.Control type="number" min={1} max={20} value={form.total_sessions} onChange={(e) => setForm({ ...form, total_sessions: parseInt(e.target.value) || 4 })} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="series-page__modal-label">{t('series.form_schedule')}</Form.Label>
            <Form.Select value={form.schedule_cron} onChange={(e) => setForm({ ...form, schedule_cron: e.target.value })}>
              <option value="0 0 * * *">{t('series.form_daily')}</option>
              <option value="0 0 * * 1">{t('series.form_weekly')}</option>
              <option value="0 0 1,15 * *">{t('series.form_biweekly')}</option>
              <option value="0 0 1 * *">{t('series.form_monthly')}</option>
            </Form.Select>
          </Form.Group>
          <div className="series-page__modal-actions">
            <Button variant="outline-secondary" onClick={onClose} className="flex-fill">{t('common.cancel')}</Button>
            <Button type="submit" variant="primary" disabled={createMutation.isPending} className="flex-fill">
              {createMutation.isPending ? t('series.creating') : t('series.create')}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
