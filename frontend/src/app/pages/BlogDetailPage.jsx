import { useState, useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import { HiArrowLeft, HiLink, HiCheckCircle } from 'react-icons/hi2';
import { getBlogPost, blogPosts } from './blogContent';
import '../../styles/MarketingPages.css';

function useReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return progress;
}

function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
}

export function BlogDetailPage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const post = getBlogPost(slug);
  const [copied, setCopied] = useState(false);
  const readingProgress = useReadingProgress();

  const relatedPosts = blogPosts.filter((p) => p.slug !== slug).slice(0, 3);

  if (!post) return <Navigate to="/blog" replace />;

  const resolvedPost = {
    ...post,
    category: t(post.categoryKey),
    title: t(post.titleKey),
    excerpt: t(post.excerptKey),
    author: t(post.authorKey),
    readTime: t(post.readTimeKey),
    content: t(post.contentKey, { returnObjects: true }),
  };
  const relatedResolved = relatedPosts.map((p) => ({
    ...p,
    category: t(p.categoryKey),
    title: t(p.titleKey),
    excerpt: t(p.excerptKey),
    date: p.date,
    readTime: t(p.readTimeKey),
  }));

  const shareUrl = window.location.href;
  const shareText = `${resolvedPost.title} by E-Room`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="marketing-page blog-detail fade-in">
      <div className="blog-detail__progress" style={{ width: `${readingProgress * 100}%` }} />

      <Container className="blog-detail__container">
        <Link to="/blog" className="blog-detail__back"><HiArrowLeft size={15} /> {t('marketing.blog_back')}</Link>

        <article>
          <header className="blog-detail__header">
            <span className="blog-detail__category">{resolvedPost.category}</span>
            <h1>{resolvedPost.title}</h1>
            <p>{resolvedPost.excerpt}</p>
            <div className="blog-detail__author-row">
              <div className="blog-detail__author-avatar">{getInitials(resolvedPost.author)}</div>
              <div className="blog-detail__author-info">
                <span className="blog-detail__author-name">{t('marketing.blog_written_by')} {resolvedPost.author}</span>
                <span className="blog-detail__author-meta">{resolvedPost.date} · {resolvedPost.readTime}</span>
              </div>
            </div>
          </header>

          <div className="blog-detail__share">
            <span>{t('marketing.blog_share')}</span>
            <button className="blog-detail__share-btn" onClick={handleCopyLink} title="Sao chép liên kết">
              {copied ? <><HiCheckCircle size={15} /> {t('marketing.blog_copied')}</> : <><HiLink size={15} /> {t('marketing.blog_copy_link')}</>}
            </button>
            <a
              className="blog-detail__share-btn"
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Chia sẻ lên Twitter/X"
            >
              X
            </a>
            <a
              className="blog-detail__share-btn"
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Chia sẻ lên LinkedIn"
            >
              in
            </a>
          </div>

          <div className="blog-detail__content">
            {resolvedPost.content.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
          </div>

          {relatedResolved.length > 0 && (
            <section className="blog-detail__related">
              <h2>{t('marketing.blog_related')}</h2>
              <div className="blog-detail__related-list">
                {relatedResolved.map((rp) => (
                  <article key={rp.slug} className="blog-detail__related-item">
                    <span className="blog-detail__related-category">{rp.category}</span>
                    <h3><Link to={`/blog/${rp.slug}`}>{rp.title}</Link></h3>
                    <p>{rp.excerpt}</p>
                    <div className="blog-meta">{rp.date} · {rp.readTime}</div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <footer className="blog-detail__footer">
            <h2>{t('marketing.blog_footer_title')}</h2>
            <p>{t('marketing.blog_footer_sub')}</p>
            <Button as={Link} to="/learning" variant="primary" className="px-4 fw-semibold">{t('marketing.blog_find_meeting')}</Button>
          </footer>
        </article>
      </Container>
    </main>
  );
}
