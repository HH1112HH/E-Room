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
            <h3>Chuỗi phòng là tính năng Pro+</h3>
            <p>Tạo lịch phòng định kỳ theo chủ đề, đặt mục tiêu học tập và xây dựng thói quen nói đều đặn.</p>
            <Button variant="primary" onClick={() => setShowUpgrade(true)}>Nâng cấp lên Pro+</Button>
          </div>
        </Container>
        <UpgradePrompt feature="Chuỗi phòng" visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </>
    );
  }

  return (
    <Container className="series-page py-4 fade-in">
      <div className="series-page__top">
        <div>
          <h1>Chuỗi phòng</h1>
          <p className="series-page__subtitle">Lên lịch chuỗi phòng theo chủ đề lặp lại đều đặn để bạn không bỏ lỡ ngày luyện tập.</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          Tạo chuỗi
        </Button>
      </div>

      {isLoading ? (
        <div className="series-page__loading">
          <Spinner animation="border" variant="primary" />
          <span>Đang tải chuỗi phòng...</span>
        </div>
      ) : series.length === 0 ? (
        <div className="series-page__empty">
          <h3>Chưa có chuỗi nào</h3>
          <p>Tạo chuỗi phòng định kỳ đầu tiên và xây dựng thói quen luyện nói đều đặn.</p>
          <Button variant="primary" onClick={() => setShowCreate(true)}>Tạo chuỗi</Button>
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
                      <span>{totalSessions} buổi</span>
                    </div>
                  </div>
                  <div className="series-page__row-actions">
                    <span className="series-page__active-label">Đang hoạt động</span>
                    <button onClick={() => deleteMutation.mutate(s.id)} className="series-page__delete-btn">Xóa</button>
                  </div>
                </div>
                <div className="series-page__progress">
                  <div className="series-page__progress-track"><div className="series-page__progress-fill" style={{ width: '0%' }} /></div>
                  <span className="series-page__progress-text">0/{totalSessions} buổi</span>
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
        <h2 className="series-page__modal-title">Tạo chuỗi phòng</h2>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="series-page__modal-label">Tiêu đề</Form.Label>
            <Form.Control type="text" placeholder="vd. Tiếng Anh thương mại hàng tuần" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="series-page__modal-label">Thẻ chủ đề</Form.Label>
            <Form.Select value={form.tag_id} onChange={(e) => setForm({ ...form, tag_id: e.target.value })} required>
              <option value="">Chọn thẻ</option>
              {(popularTags || []).map((t) => (
                <option key={t.id || t} value={t.id || t}>{t.name || t}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="series-page__modal-label">Tổng số buổi</Form.Label>
            <Form.Control type="number" min={1} max={20} value={form.total_sessions} onChange={(e) => setForm({ ...form, total_sessions: parseInt(e.target.value) || 4 })} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="series-page__modal-label">Lịch trình</Form.Label>
            <Form.Select value={form.schedule_cron} onChange={(e) => setForm({ ...form, schedule_cron: e.target.value })}>
              <option value="0 0 * * *">Hàng ngày</option>
              <option value="0 0 * * 1">Hàng tuần</option>
              <option value="0 0 1,15 * *">Hai tuần một lần</option>
              <option value="0 0 1 * *">Hàng tháng</option>
            </Form.Select>
          </Form.Group>
          <div className="series-page__modal-actions">
            <Button variant="outline-secondary" onClick={onClose} className="flex-fill">Hủy</Button>
            <Button type="submit" variant="primary" disabled={createMutation.isPending} className="flex-fill">
              {createMutation.isPending ? 'Đang tạo...' : 'Tạo chuỗi'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
