import React, { useState, useEffect } from 'react';
import BlogJAX from './BlogJAX';
import BlogSIMD from './BlogSIMD';
import BlogThesis from './BlogThesis';
import { projectsData } from '../data';

type Post = 'jax' | 'simd' | 'thesis';

type FeedItem =
  | { kind: 'blog'; id: Post; kicker: string; title: string; date: string; sortDate: number; desc: string }
  | { kind: 'project'; id: number; title: string; date: string; sortDate: number; description: string; tags: string[]; links: { name: string; url: string }[] };

const blogItems: Extract<FeedItem, { kind: 'blog' }>[] = [
  {
    kind: 'blog',
    id: 'thesis',
    kicker: 'Machine Learning · LLM Reasoning · Distillation',
    title: 'On-policy self-distillation for adaptive compute',
    date: 'February 2026',
    sortDate: 202602,
    desc: 'Reasoning models overthink. I let a model rewrite its own reasoning to the right length, then distill that behavior back in — no reward model, no difficulty labels, just the model itself.',
  },
  {
    kind: 'blog',
    id: 'jax',
    kicker: 'Systems · Machine Learning · JAX',
    title: 'Cost-Aware Predictive Query Prefetching with JAX',
    date: 'February 2026',
    sortDate: 202602,
    desc: 'A prefetch is a bet. This system uses a lightweight JAX predictor to place that bet only when the expected latency savings beat the expected backend cost.',
  },
  {
    kind: 'blog',
    id: 'simd',
    kicker: 'Performance Engineering · JVM × Native',
    title: 'Crossing the JNI boundary for 6.9× faster JSON ingestion',
    date: 'October 2025',
    sortDate: 202510,
    desc: 'Routing the hot path through simdjson using zero-copy DirectByteBuffers pushed sustained throughput past 2.9 GB/s and gave back 61% of parse CPU.',
  },
];

function parseSortDate(date: string): number {
  const lower = date.toLowerCase();
  const yearMatch = lower.match(/\d{4}/);
  const year = yearMatch ? parseInt(yearMatch[0]) : 2025;
  const months: [string, number][] = [
    ['january', 1], ['february', 2], ['march', 3], ['april', 4],
    ['may', 5], ['june', 6], ['july', 7], ['august', 8],
    ['september', 9], ['october', 10], ['november', 11], ['december', 12],
  ];
  for (const [name, num] of months) {
    if (lower.includes(name)) return year * 100 + num;
  }
  return year * 100;
}

const projectItems: Extract<FeedItem, { kind: 'project' }>[] = projectsData.map(p => ({
  kind: 'project' as const,
  id: p.id,
  title: p.title,
  date: p.date,
  sortDate: parseSortDate(p.date),
  description: p.description,
  tags: p.tags,
  links: p.links ?? [],
}));

const feed: FeedItem[] = [...blogItems, ...projectItems].sort((a, b) => b.sortDate - a.sortDate);

const WorkFeed: React.FC<{ onSelect: (p: Post) => void }> = ({ onSelect }) => (
  <section>
    <h2 style={{
      fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: 'var(--color-text-muted)',
      margin: '0 0 1.5rem',
    }}>Work</h2>
    <div style={{ borderTop: '1px solid var(--color-border)' }}>
      {feed.map(item => {
        if (item.kind === 'blog') {
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className="feed-link"
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'none', border: 'none',
                borderBottom: '1px solid var(--color-border)',
                cursor: 'pointer', padding: '1.4rem 0', font: 'inherit',
              }}
            >
              <div className="feed-title" style={{
                fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em',
                color: 'var(--color-text)', lineHeight: 1.2, marginBottom: '0.5rem',
              }}>{item.title}</div>
              <p style={{
                fontSize: '13.5px', color: 'var(--color-text-subtle)', lineHeight: 1.55,
                margin: '0 0 0.6rem',
              }}>{item.desc}</p>
              <div style={{
                fontFamily: 'SF Mono, Menlo, monospace', fontSize: '11.5px',
                color: 'var(--color-text-muted)',
              }}>{item.date}</div>
            </button>
          );
        }

        return (
          <div
            key={item.id}
            style={{ borderBottom: '1px solid var(--color-border)', padding: '1.4rem 0' }}
          >
            <div style={{
              fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em',
              color: 'var(--color-text)', lineHeight: 1.2, marginBottom: '0.5rem',
            }}>{item.title}</div>
            <p
              style={{
                fontSize: '13.5px', color: 'var(--color-text-subtle)', lineHeight: 1.55,
                margin: '0 0 0.6rem',
              }}
              dangerouslySetInnerHTML={{ __html: item.description }}
            />
            <div style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              fontFamily: 'SF Mono, Menlo, monospace', fontSize: '11.5px',
              color: 'var(--color-text-muted)',
            }}>
              <span>{item.date}</span>
              {item.links.map(link => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-text-subtle)', textDecoration: 'none', fontSize: '11.5px' }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {link.name} ↗
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  </section>
);

const Work: React.FC = () => {
  const [selected, setSelected] = useState<Post | null>(() => {
    const match = window.location.hash.match(/^#(?:work|blog)\/(jax|simd|thesis)$/i);
    return match ? (match[1].toLowerCase() as Post) : null;
  });

  const handleSelect = (p: Post) => {
    window.location.hash = 'work/' + p;
    setSelected(p);
  };

  const handleBack = () => {
    window.location.hash = 'work';
    setSelected(null);
  };

  useEffect(() => {
    const onHashChange = () => {
      const match = window.location.hash.match(/^#(?:work|blog)\/(jax|simd|thesis)$/i);
      setSelected(match ? (match[1].toLowerCase() as Post) : null);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (selected === 'thesis') return <BlogThesis onBack={handleBack} />;
  if (selected === 'jax') return <BlogJAX onBack={handleBack} />;
  if (selected === 'simd') return <BlogSIMD onBack={handleBack} />;
  return <WorkFeed onSelect={handleSelect} />;
};

export default Work;
