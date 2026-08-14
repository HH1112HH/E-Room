import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import { HiArrowRight, HiMagnifyingGlass, HiCheckCircle } from 'react-icons/hi2';
import { blogPosts } from './blogContent';
import '../../styles/MarketingPages.css';

export function BlogPage() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');

  const posts = blogPosts.map((p) => ({
    ...p,
    category: t(p.categoryKey),
    title: t(p.titleKey),
    excerpt: t(p.excerptKey),
    hero: t(p.heroKey),
    author: t(p.authorKey),
    readTime: t(p.readTimeKey),
    content: t(p.contentKey, { returnObjects: true }),
  }));

  const categories = ['Tất cả', ...new Set(posts.map((p) => p.category))];

  const filtered = posts.filter((post) => {
    const matchCategory = activeCategory === 'Tất cả' || post.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || post.title.toLowerCase().includes(q) || post.excerpt.toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  const [lead, ...rest] = filtered;

  return (
    <main className="marketing-page blog-index fade-in">
      <Container className="marketing-page__container">
        <section className="blog-index__header">
          <h1>{t('marketing.blog_header_title')}</h1>
          <p>{t('marketing.blog_header_sub')}</p>
        </section>

        <div className="blog-controls">
          <div className="blog-filters">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`blog-filter-btn${activeCategory === cat ? ' blog-filter-btn--active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="blog-search">
            <HiMagnifyingGlass size={14} />
            <input
              type="text"
              placeholder={t('marketing.blog_search_ph')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="blog-empty">
            <p>{t('marketing.blog_empty')}</p>
          </div>
        ) : (
          <section className="blog-layout" aria-label="Bài viết mới nhất">
            {lead && (
              <article className="blog-lead">
                <div className="blog-lead__body">
                  <span className="blog-lead__category">{lead.category}</span>
                  <h2><Link to={`/blog/${lead.slug}`}>{lead.title}</Link></h2>
                  <p>{lead.excerpt}</p>
                  <div className="blog-meta">{lead.author} · {lead.date} · {lead.readTime}</div>
                </div>
                <div className="blog-lead__hero">
                  <span className="blog-lead__hero-label">{lead.hero}</span>
                </div>
              </article>
            )}

            <div className="blog-side-list">
              {rest.map((post) => (
                <article className="blog-row" key={post.slug}>
                  <span>{post.category}</span>
                  <h2><Link to={`/blog/${post.slug}`}>{post.title}</Link></h2>
                  <p>{post.excerpt}</p>
                  <div className="blog-row__footer">
                    <span className="blog-meta">{post.author} · {post.date} · {post.readTime}</span>
                    <Link to={`/blog/${post.slug}`} className="blog-read-link">{t('marketing.blog_read_article')} <HiArrowRight size={14} /></Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="blog-newsletter">
          <div className="blog-newsletter__body">
            <HiCheckCircle size={20} />
            <h2>{t('marketing.blog_newsletter_title')}</h2>
            <p>{t('marketing.blog_newsletter_sub')}</p>
            <form className="blog-newsletter__form" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder={t('marketing.blog_newsletter_ph')} required />
              <Button type="submit" variant="primary" size="sm" className="px-3 fw-semibold">{t('marketing.blog_subscribe')}</Button>
            </form>
          </div>
        </section>
      </Container>
    </main>
  );
}
