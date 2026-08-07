export const blogPosts = [
  {
    slug: '20-minute-speaking-room',
    categoryKey: 'marketing.blog_post_20min_category',
    titleKey: 'marketing.blog_post_20min_title',
    excerptKey: 'marketing.blog_post_20min_excerpt',
    heroKey: 'marketing.blog_post_20min_hero',
    authorKey: 'marketing.blog_post_20min_author',
    date: 'May 20, 2026',
    readTimeKey: 'marketing.blog_post_20min_readtime',
    contentKey: 'marketing.blog_post_20min_content',
  },
  {
    slug: 'use-ai-corrections-after-class',
    categoryKey: 'marketing.blog_post_ai_category',
    titleKey: 'marketing.blog_post_ai_title',
    excerptKey: 'marketing.blog_post_ai_excerpt',
    heroKey: 'marketing.blog_post_ai_hero',
    authorKey: 'marketing.blog_post_ai_author',
    date: 'May 18, 2026',
    readTimeKey: 'marketing.blog_post_ai_readtime',
    contentKey: 'marketing.blog_post_ai_content',
  },
  {
    slug: 'better-room-topics',
    categoryKey: 'marketing.blog_post_topics_category',
    titleKey: 'marketing.blog_post_topics_title',
    excerptKey: 'marketing.blog_post_topics_excerpt',
    heroKey: 'marketing.blog_post_topics_hero',
    authorKey: 'marketing.blog_post_topics_author',
    date: 'May 15, 2026',
    readTimeKey: 'marketing.blog_post_topics_readtime',
    contentKey: 'marketing.blog_post_topics_content',
  },
];

export function getBlogPost(slug) {
  return blogPosts.find((post) => post.slug === slug);
}
