import React, { Suspense, lazy, useEffect } from 'react';
import { POST_BY_SLUG, type PostSlug } from './post/posts';
import './post/BlogDesign.css';

const BlogSimdjson = lazy(() => import('./BlogSimdjson'));
const BlogThesis = lazy(() => import('./BlogThesis'));
const BlogMario = lazy(() => import('./BlogMario'));
const BlogFerret = lazy(() => import('./BlogFerret'));

const PostFallback: React.FC = () => (
  <div style={{ padding: '3rem 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>Loading…</div>
);

const Post: React.FC<{ slug: PostSlug; onBack: () => void }> = ({ slug, onBack }) => {
  const href = POST_BY_SLUG[slug].href;

  useEffect(() => {
    if (href) window.location.replace(href);
    else window.scrollTo(0, 0);
  }, [slug, href]);

  if (href) return <a href={href}>Open {POST_BY_SLUG[slug].title}</a>;

  return (
    <Suspense fallback={<PostFallback />}>
      {slug === 'ferret' && <BlogFerret onBack={onBack} />}
      {slug === 'blj' && <BlogMario onBack={onBack} />}
      {slug === 'thesis' && <BlogThesis onBack={onBack} />}
      {slug === 'simd' && <BlogSimdjson onBack={onBack} />}
    </Suspense>
  );
};

export default Post;
