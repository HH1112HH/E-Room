import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import { HiCheckCircle } from 'react-icons/hi2';
import '../../styles/MarketingPages.css';

const plans = [
  {
    key: 'free',
    nameKey: 'pricing_plan_free',
    price: '$0',
    noteKey: 'pricing_plan_free_note',
    featuresKey: 'pricing_feat_free',
  },
  {
    key: 'pro',
    nameKey: 'pricing_plan_pro',
    price: '$9.99',
    periodKey: 'pricing_period_month',
    noteKey: 'pricing_plan_pro_note',
    badgeKey: 'pricing_badge_popular',
    featuresKey: 'pricing_feat_pro',
  },
  {
    key: 'pro_plus',
    nameKey: 'pricing_plan_proplus',
    price: '$19.99',
    periodKey: 'pricing_period_month',
    noteKey: 'pricing_plan_proplus_note',
    badgeKey: 'pricing_badge_full',
    featuresKey: 'pricing_feat_proplus',
  },
];

const faqItems = [
  { qKey: 'pricing_faq_1_q', aKey: 'pricing_faq_1_a' },
  { qKey: 'pricing_faq_2_q', aKey: 'pricing_faq_2_a' },
  { qKey: 'pricing_faq_3_q', aKey: 'pricing_faq_3_a' },
  { qKey: 'pricing_faq_4_q', aKey: 'pricing_faq_4_a' },
  { qKey: 'pricing_faq_5_q', aKey: 'pricing_faq_5_a' },
];

export function PricingPage() {
  const { t } = useTranslation();
  return (
    <main className="marketing-page fade-in">
      <Container className="marketing-page__container">
        <section className="pricing-hero">
          <h1>{t('marketing.pricing_hero_title')}</h1>
          <p>{t('marketing.pricing_hero_sub')}</p>
        </section>

        <section className="pricing-grid" aria-label="Các gói đăng ký">
          {plans.map((plan) => (
            <article className="pricing-card" key={plan.key}>
              <div className="pricing-card__header">
                <div>
                  <h2>{t(`marketing.${plan.nameKey}`)}</h2>
                  <p>{t(`marketing.${plan.noteKey}`)}</p>
                </div>
                {plan.badgeKey && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-accent)', whiteSpace: 'nowrap' }}>{t(`marketing.${plan.badgeKey}`)}</span>
                )}
              </div>
              <div className="pricing-card__price">
                <strong>{plan.price}</strong>
                {plan.periodKey && <span>{t(`marketing.${plan.periodKey}`)}</span>}
              </div>
              <ul>
                {t(`marketing.${plan.featuresKey}`, { returnObjects: true }).map((feature) => (
                  <li key={feature}><HiCheckCircle size={14} />{feature}</li>
                ))}
              </ul>
              {plan.key === 'free' ? (
                <Button as={Link} to="/learning" variant="outline-primary" className="fw-semibold" style={{ alignSelf: 'flex-start' }}>{t('marketing.pricing_get_started')}</Button>
              ) : (
                <Button as={Link} to={`/payment?plan=${plan.key}`} variant={plan.badgeKey ? 'primary' : 'outline-primary'} className="fw-semibold" style={{ alignSelf: 'flex-start' }}>
                  {t('marketing.pricing_choose')} {t(`marketing.${plan.nameKey}`)}
                </Button>
              )}
            </article>
          ))}
        </section>

        <section className="pricing-proof">
          <div><strong>{t('marketing.pricing_proof_1_t')}</strong><span>{t('marketing.pricing_proof_1_d')}</span></div>
          <div><strong>{t('marketing.pricing_proof_2_t')}</strong><span>{t('marketing.pricing_proof_2_d')}</span></div>
          <div><strong>{t('marketing.pricing_proof_3_t')}</strong><span>{t('marketing.pricing_proof_3_d')}</span></div>
        </section>

        <section className="pricing-faq">
          <h2>{t('marketing.pricing_faq_title')}</h2>
          {faqItems.map((item) => (
            <details key={item.qKey} className="pricing-faq__item">
              <summary>{t(`marketing.${item.qKey}`)}</summary>
              <p>{t(`marketing.${item.aKey}`)}</p>
            </details>
          ))}
        </section>
      </Container>
    </main>
  );
}
