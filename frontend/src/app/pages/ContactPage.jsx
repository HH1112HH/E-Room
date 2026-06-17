import { useState } from 'react';
import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { HiArrowRight, HiChatBubbleLeftRight, HiCheckCircle, HiEnvelope, HiExclamationTriangle, HiMapPin, HiUserGroup } from 'react-icons/hi2';
import '../../styles/MarketingPages.css';

const channels = [
  { icon: HiChatBubbleLeftRight, title: 'Learner support', text: 'Questions about rooms, notes, feedback, or account access.' },
  { icon: HiUserGroup, title: 'Schools and teams', text: 'Run speaking practice for classes, clubs, onboarding, or interview groups.' },
  { icon: HiEnvelope, title: 'Partnerships', text: 'Discuss integrations, content programs, and long-term learning workflows.' },
];

export function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: 'support', message: '' });
  const [status, setStatus] = useState('idle');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Name is required';
    if (!formData.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Invalid email address';
    if (!formData.message.trim()) errs.message = 'Message is required';
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
          <h1>Get the right support for your speaking program.</h1>
          <p>Tell us whether you are learning alone, hosting rooms, or bringing E-Room to a group. We will route the conversation to the right team.</p>
          <div className="contact-hero__meta">
            <span><HiMapPin size={14} /> Remote-first support</span>
            <span><HiEnvelope size={14} /> Product and learning help</span>
          </div>
        </section>

        <section className="contact-layout">
          <div className="contact-channels">
            {channels.map((channel) => {
              const Icon = channel.icon;
              return (
                <article key={channel.title}>
                  <Icon size={20} />
                  <div><h2>{channel.title}</h2><p>{channel.text}</p></div>
                </article>
              );
            })}
          </div>

          <Form className="contact-form" onSubmit={handleSubmit}>
            <div>
              <h2>Send a message</h2>
              <p>Tell us about your goal, room format, or issue and we will get back to you.</p>
            </div>

            {status === 'success' && (
              <div className="contact-form__alert contact-form__alert--success">
                <HiCheckCircle size={16} />
                <span>Message sent successfully. We will get back to you soon.</span>
              </div>
            )}

            {status === 'error' && (
              <div className="contact-form__alert contact-form__alert--error">
                <HiExclamationTriangle size={16} />
                <span>Something went wrong. Please try again later.</span>
              </div>
            )}

            <Form.Group>
              <Form.Label>Name <span className="contact-form__required">*</span></Form.Label>
              <Form.Control
                placeholder="Your name"
                value={formData.name}
                onChange={handleChange('name')}
                isInvalid={!!errors.name}
              />
              {errors.name && <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>}
            </Form.Group>
            <Form.Group>
              <Form.Label>Email <span className="contact-form__required">*</span></Form.Label>
              <Form.Control
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange('email')}
                isInvalid={!!errors.email}
              />
              {errors.email && <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>}
            </Form.Group>
            <Form.Group>
              <Form.Label>What do you need?</Form.Label>
              <Form.Select value={formData.subject} onChange={handleChange('subject')}>
                <option value="support">Learner support</option>
                <option value="team">School or team plan</option>
                <option value="billing">Billing question</option>
                <option value="partnership">Partnership</option>
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Message <span className="contact-form__required">*</span></Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                placeholder="Describe your goal, question, or feedback."
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
              {status === 'submitting' ? 'Sending...' : 'Send message'} <HiArrowRight size={15} />
            </Button>
          </Form>
        </section>

        <section className="contact-bottom">
          <div><span>Prefer action now?</span><h2>Open a meeting room and continue learning while we help.</h2></div>
          <Button as={Link} to="/learning" variant="outline-primary" className="fw-semibold px-4">Go to meeting</Button>
        </section>
      </Container>
    </main>
  );
}
