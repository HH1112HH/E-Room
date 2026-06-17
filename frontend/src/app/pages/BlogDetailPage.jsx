import { useState, useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
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
  const { slug } = useParams();
  const post = getBlogPost(slug);
  const [copied, setCopied] = useState(false);
  const readingProgress = useReadingProgress();

  const relatedPosts = blogPosts.filter((p) => p.slug !== slug).slice(0, 3);

  if (!post) return <Navigate to="/blog" replace />;

  const shareUrl = window.location.href;
  const shareText = `${post.title} by E-Room`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="marketing-page blog-detail fade-in">
      <div className="blog-detail__progress" style={{ width: `${readingProgress * 100}%` }} />

      <Container className="blog-detail__container">
        <Link to="/blog" className="blog-detail__back"><HiArrowLeft size={15} /> Back to blog</Link>

        <article>
          <header className="blog-detail__header">
            <span className="blog-detail__category">{post.category}</span>
            <h1>{post.title}</h1>
            <p>{post.excerpt}</p>
            <div className="blog-detail__author-row">
              <div className="blog-detail__author-avatar">{getInitials(post.author)}</div>
              <div className="blog-detail__author-info">
                <span className="blog-detail__author-name">Written by {post.author}</span>
                <span className="blog-detail__author-meta">{post.date} · {post.readTime}</span>
              </div>
            </div>
          </header>

          <div className="blog-detail__share">
            <span>Share</span>
            <button className="blog-detail__share-btn" onClick={handleCopyLink} title="Copy link">
              {copied ? <><HiCheckCircle size={15} /> Copied</> : <><HiLink size={15} /> Copy link</>}
            </button>
            <a
              className="blog-detail__share-btn"
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Share on Twitter/X"
            >
              X
            </a>
            <a
              className="blog-detail__share-btn"
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Share on LinkedIn"
            >
              in
            </a>
          </div>

          <div className="blog-detail__content">
            {post.content.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
          </div>

          {relatedPosts.length > 0 && (
            <section className="blog-detail__related">
              <h2>Related articles</h2>
              <div className="blog-detail__related-list">
                {relatedPosts.map((rp) => (
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
            <h2>Practice this idea in a live room</h2>
            <p>Open a meeting, choose one sentence goal, and let E-Room keep the feedback loop visible.</p>
            <Button as={Link} to="/learning" variant="primary" className="px-4 fw-semibold">Find a meeting</Button>
          </footer>
        </article>
      </Container>
    </main>
  );
}
