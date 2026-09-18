import React, { Suspense, lazy, useState, useEffect } from 'react';
import { POSTS, type PostSlug } from './post/posts';
import { projectsData } from '../data';
import './post/BlogDesign.css';

type FeedItem =
  | { kind: 'post'; id: PostSlug; title: string; date: string; sortDate: number; preview: string; previewKind?: string }
  | { kind: 'project'; id: number; title: string; date: string; sortDate: number; description: string; links: { name: string; url: string }[] };

function parseSortDate(date: string): number {
  const lower = date.toLowerCase();
  const yearMatch = lower.match(/\d{4}/g);
  const year = yearMatch ? parseInt(yearMatch[yearMatch.length - 1]) : 2025;
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ];
  const month = months.findIndex(name => lower.includes(name));
  return year * 100 + (month >= 0 ? month + 1 : 0);
}

const feed: FeedItem[] = [
  ...POSTS.map<FeedItem>(post => ({
    kind: 'post',
    id: post.slug,
    title: post.title,
    date: post.date,
    sortDate: post.sortDate,
    preview: post.preview,
    previewKind: post.previewKind,
  })),
  ...projectsData.map<FeedItem>(project => ({
    kind: 'project',
    id: project.id,
    title: project.title,
    date: project.date,
    sortDate: parseSortDate(project.date),
    description: project.description,
    links: project.links ?? [],
  })),
].sort((a, b) => b.sortDate - a.sortDate);

const BlogPrefetch = lazy(() => import('./BlogPrefetch'));
const BlogSimdjson = lazy(() => import('./BlogSimdjson'));
const BlogThesis = lazy(() => import('./BlogThesis'));
const BlogSecret = lazy(() => import('./BlogSecret'));
const BlogMario = lazy(() => import('./BlogMario'));

const PostFallback: React.FC = () => (
  <div style={{ padding: '3rem 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>Loading…</div>
);

const itemStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--color-border)',
  padding: '1.4rem 0',
};

const titleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  letterSpacing: '-0.02em',
  color: 'var(--color-text)',
  lineHeight: 1.25,
  marginBottom: '0.5rem',
};

const descStyle: React.CSSProperties = {
  fontSize: '13.5px',
  color: 'var(--color-text-subtle)',
  lineHeight: 1.55,
  margin: '0 0 0.6rem',
};

const metaStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  fontFamily: 'var(--font-mono)',
  fontSize: '11.5px',
  color: 'var(--color-text-muted)',
};

const WorkFeed: React.FC<{ onSelect: (slug: PostSlug) => void }> = ({ onSelect }) => (
  <section aria-label="Blog posts and projects">
    <div className="blog-list">
      {feed.map(item =>
        item.kind === 'post' ? (
          <a key={item.id} href={`#work/${item.id}`} className="blog-row"
            onClick={event => {
              if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                event.preventDefault(); onSelect(item.id);
              }
            }}>
            <span className={`blog-thumbnail ${item.previewKind ?? ''}`}>
              <img src={item.preview} alt="" loading="lazy" width={960} height={640} />
            </span>
            <div><h3>{item.title}</h3><span className="blog-date">{item.date}</span></div>
          </a>
        ) : (
          <div key={item.id} style={itemStyle}>
            <div style={titleStyle}>{item.title}</div>
            <p style={descStyle} dangerouslySetInnerHTML={{ __html: item.description }} />
            <div style={metaStyle}>
              <span>{item.date}</span>
              {item.links.map(link => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline"
                  style={{ color: 'var(--color-text-subtle)' }}
                >
                  {link.name} ↗
                </a>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  </section>
);

function slugFromHash(): PostSlug | null {
  const match = window.location.hash.match(/^#(?:work|blog)\/(jax|simd|thesis|secret|blj)$/i);
  return match ? (match[1].toLowerCase() as PostSlug) : null;
}

const Work: React.FC = () => {
  const [selected, setSelected] = useState<PostSlug | null>(slugFromHash);

  const handleSelect = (slug: PostSlug) => {
    window.location.hash = `work/${slug}`;
    setSelected(slug);
  };

  const handleBack = () => {
    window.location.hash = 'work';
    setSelected(null);
  };

  useEffect(() => {
    const onHashChange = () => setSelected(slugFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (selected) window.scrollTo(0, 0);
  }, [selected]);

  if (!selected) return <WorkFeed onSelect={handleSelect} />;

  return (
    <Suspense fallback={<PostFallback />}>
      {selected === 'blj' && <BlogMario onBack={handleBack} />}
      {selected === 'secret' && <BlogSecret onBack={handleBack} />}
      {selected === 'thesis' && <BlogThesis onBack={handleBack} />}
      {selected === 'jax' && <BlogPrefetch onBack={handleBack} />}
      {selected === 'simd' && <BlogSimdjson onBack={handleBack} />}
    </Suspense>
  );
};

export default Work;
