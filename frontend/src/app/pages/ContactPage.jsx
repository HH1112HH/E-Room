import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { HiArrowRight, HiChatBubbleLeftRight, HiCheckCircle, HiEnvelope, HiExclamationTriangle, HiMapPin, HiUserGroup } from 'react-icons/hi2';
import '../../styles/MarketingPages.css';

const channels = [
  { icon: HiChatBubbleLeftRight, titleKey: 'contact_ch1_title', textKey: 'contact_ch1_text' },
  { icon: HiUserGroup, titleKey: 'contact_ch2_title', textKey: 'contact_ch2_text' },
  { icon: HiEnvelope, titleKey: 'contact_ch3_title', textKey: 'contact_ch3_text' },
];

export function ContactPage() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ name: '', email: '', subject: 'support', message: '' });
  const [status, setStatus] = useState('idle');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = t('marketing.contact_err_name');
    if (!formData.email.trim()) errs.email = t('marketing.contact_err_email');
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = t('marketing.contact_err_email_invalid');
    if (!formData.message.trim()) errs.message = t('marketing.contact_err_message');
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setStatus('submitting');
    setTimeout(() => {
      setStatus('success');
      setFormData({ name: '', email: '', subject: 'support', message: '' });
    }, 1200);
  };

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  return (
    <main className="marketing-page contact-page fade-in">
      <Container className="marketing-page__container contact-page__container">
        <section className="contact-hero">
          <h1>{t('marketing.contact_hero_title')}</h1>
          <p>{t('marketing.contact_hero_sub')}</p>
          <div className="contact-hero__meta">
            <span><HiMapPin size={14} /> {t('marketing.contact_meta_1')}</span>
            <span><HiEnvelope size={14} /> {t('marketing.contact_meta_2')}</span>
          </div>
        </section>

        <section className="contact-layout">
          <div className="contact-channels">
            {channels.map((channel) => {
              const Icon = channel.icon;
              return (
                <article key={channel.titleKey}>
                  <Icon size={20} />
                  <div><h2>{t(`marketing.${channel.titleKey}`)}</h2><p>{t(`marketing.${channel.textKey}`)}</p></div>
                </article>
              );
            })}
          </div>

          <Form className="contact-form" onSubmit={handleSubmit}>
            <div>
              <h2>{t('marketing.contact_form_title')}</h2>
              <p>{t('marketing.contact_form_sub')}</p>
            </div>

            {status === 'success' && (
              <div className="contact-form__alert contact-form__alert--success">
                <HiCheckCircle size={16} />
                <span>{t('marketing.contact_success')}</span>
              </div>
            )}

            {status === 'error' && (
              <div className="contact-form__alert contact-form__alert--error">
                <HiExclamationTriangle size={16} />
                <span>{t('marketing.contact_error')}</span>
              </div>
            )}

            <Form.Group>
              <Form.Label>{t('marketing.contact_name')} <span className="contact-form__required">*</span></Form.Label>
              <Form.Control
                placeholder={t('marketing.contact_name_ph')}
                value={formData.name}
                onChange={handleChange('name')}
                isInvalid={!!errors.name}
              />
              {errors.name && <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>}
            </Form.Group>
            <Form.Group>
              <Form.Label>{t('marketing.contact_email')} <span className="contact-form__required">*</span></Form.Label>
              <Form.Control
                type="email"
                placeholder={t('marketing.contact_email_ph')}
                value={formData.email}
                onChange={handleChange('email')}
                isInvalid={!!errors.email}
              />
              {errors.email && <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>}
            </Form.Group>
            <Form.Group>
              <Form.Label>{t('marketing.contact_subject')}</Form.Label>
              <Form.Select value={formData.subject} onChange={handleChange('subject')}>
                <option value="support">{t('marketing.contact_sub_support')}</option>
                <option value="team">{t('marketing.contact_sub_team')}</option>
                <option value="billing">{t('marketing.contact_sub_billing')}</option>
                <option value="partnership">{t('marketing.contact_sub_partnership')}</option>
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>{t('marketing.contact_message')} <span className="contact-form__required">*</span></Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                placeholder={t('marketing.contact_message_ph')}
                value={formData.message}
                onChange={handleChange('message')}
                isInvalid={!!errors.message}
              />
              {errors.message && <Form.Control.Feedback type="invalid">{errors.message}</Form.Control.Feedback>}
            </Form.Group>
            <Button
              type="submit"
              variant="primary"
              className="fw-semibold px-4"
              style={{ alignSelf: 'flex-start' }}
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? t('marketing.contact_sending') : t('marketing.contact_send')} <HiArrowRight size={15} />
            </Button>
          </Form>
        </section>

        <section className="contact-bottom">
          <div><span>{t('marketing.contact_bottom_label')}</span><h2>{t('marketing.contact_bottom_title')}</h2></div>
          <Button as={Link} to="/learning" variant="outline-primary" className="fw-semibold px-4">{t('marketing.contact_go_meeting')}</Button>
        </section>
      </Container>
    </main>
  );
}
