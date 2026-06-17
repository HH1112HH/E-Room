import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import { HiCheckCircle } from 'react-icons/hi2';
import '../../styles/MarketingPages.css';

const plans = [
  {
    key: 'free',
    name: 'Starter',
    price: '$0',
    note: 'For getting used to live English rooms.',
    features: ['Join public meeting rooms', 'Basic AI correction cards', 'Standard room discovery', 'Limited daily room creation'],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    note: 'For learners who practice every week.',
    badge: 'Most popular',
    features: ['Unlimited speaking rooms', 'Advanced AI feedback', 'Priority matching', 'Session notes', 'More room heartbeats'],
  },
  {
    key: 'pro_plus',
    name: 'Pro+',
    price: '$19.99',
    period: '/month',
    note: 'For interview prep, cohorts, and serious study.',
    badge: 'Full access',
    features: ['Everything in Pro', 'TTS pronunciation feedback', 'Expert RAG insights', 'Leaderboard access', 'Up to 15 participants'],
  },
];

const faqItems = [
  { q: 'Can I switch plans at any time?', a: 'Yes. You can upgrade or downgrade your plan at any time. If you upgrade, the new features are available immediately. Downgrades take effect at the end of your current billing cycle.' },
  { q: 'Is there a free trial for paid plans?', a: 'We do not offer a free trial for paid plans, but the Starter plan gives you full access to join real speaking rooms with basic AI feedback. You can experience the core product before deciding to upgrade.' },
  { q: 'What happens to my data if I cancel?', a: 'Your session history and AI feedback cards remain available even after cancellation, though access may be limited to features included in the Starter plan. You can re-subscribe anytime to regain full access.' },
  { q: 'How does AI feedback differ between plans?', a: 'Starter includes basic correction cards. Pro unlocks advanced AI feedback with deeper grammar analysis. Pro+ adds TTS pronunciation feedback and expert RAG insights that reference your session history.' },
  { q: 'Can I pay yearly for a discount?', a: 'Yearly billing is available for both Pro and Pro+ plans, offering a 20% discount compared to monthly billing. Contact support to switch to an annual plan.' },
];

export function PricingPage() {
  return (
    <main className="marketing-page fade-in">
      <Container className="marketing-page__container">
        <section className="pricing-hero">
          <h1>Choose the plan that fits your practice rhythm.</h1>
          <p>Start free, upgrade when you need deeper feedback, session notes, and advanced room tools.</p>
        </section>

        <section className="pricing-grid" aria-label="Subscription plans">
          {plans.map((plan) => (
            <article className="pricing-card" key={plan.key}>
              <div className="pricing-card__header">
                <div>
                  <h2>{plan.name}</h2>
                  <p>{plan.note}</p>
                </div>
                {plan.badge && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-accent)', whiteSpace: 'nowrap' }}>{plan.badge}</span>
                )}
              </div>
              <div className="pricing-card__price">
                <strong>{plan.price}</strong>
                {plan.period && <span>{plan.period}</span>}
              </div>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}><HiCheckCircle size={14} />{feature}</li>
                ))}
              </ul>
              {plan.key === 'free' ? (
                <Button as={Link} to="/learning" variant="outline-primary" className="fw-semibold" style={{ alignSelf: 'flex-start' }}>Get started</Button>
              ) : (
                <Button as={Link} to={`/payment?plan=${plan.key}`} variant={plan.badge ? 'primary' : 'outline-primary'} className="fw-semibold" style={{ alignSelf: 'flex-start' }}>
                  Choose {plan.name}
                </Button>
              )}
            </article>
          ))}
        </section>

        <section className="pricing-proof">
          <div><strong>No forced upgrade</strong><span>Free users still join real speaking rooms.</span></div>
          <div><strong>AI depth scales</strong><span>Paid plans unlock stronger feedback and notes.</span></div>
          <div><strong>Built for groups</strong><span>Pro+ supports larger rooms and rankings.</span></div>
        </section>

        <section className="pricing-faq">
          <h2>Frequently asked questions</h2>
          {faqItems.map((item) => (
            <details key={item.q} className="pricing-faq__item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </section>
      </Container>
    </main>
  );
}
