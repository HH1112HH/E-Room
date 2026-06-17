import { useState } from 'react';
import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import { HiArrowRight, HiMagnifyingGlass, HiCheckCircle } from 'react-icons/hi2';
import { blogPosts } from './blogContent';
import '../../styles/MarketingPages.css';

export function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', ...new Set(blogPosts.map((p) => p.category))];

  const filtered = blogPosts.filter((post) => {
    const matchCategory = activeCategory === 'All' || post.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || post.title.toLowerCase().includes(q) || post.excerpt.toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  const [lead, ...rest] = filtered;

  return (
    <main className="marketing-page blog-index fade-in">
      <Container className="marketing-page__container">
        <section className="blog-index__header">
          <h1>Practical writing for people learning English by speaking.</h1>
          <p>Room routines, feedback habits, and host guides written for learners who want visible progress after every conversation.</p>
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
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="blog-empty">
            <p>No articles match your search. Try different keywords.</p>
          </div>
        ) : (
          <section className="blog-layout" aria-label="Latest blog posts">
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
                    <Link to={`/blog/${post.slug}`} className="blog-read-link">Read article <HiArrowRight size={14} /></Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="blog-newsletter">
          <div className="blog-newsletter__body">
            <HiCheckCircle size={20} />
            <h2>Get weekly speaking tips delivered to your inbox</h2>
            <p>Short, practical advice from experienced English hosts — no spam, just signal.</p>
            <form className="blog-newsletter__form" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="your@email.com" required />
              <Button type="submit" variant="primary" size="sm" className="px-3 fw-semibold">Subscribe</Button>
            </form>
          </div>
        </section>
      </Container>
    </main>
  );
}
