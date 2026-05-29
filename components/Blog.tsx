import React, { useState, useEffect } from 'react';
import BlogJAX from './BlogJAX';
import BlogSIMD from './BlogSIMD';

type Post = 'jax' | 'simd';

const posts: { id: Post; kicker: string; title: string; date: string; desc: string }[] = [
  {
    id: 'simd',
    kicker: 'Performance Engineering · JVM × Native',
    title: 'Crossing the JNI boundary for 6.9× faster JSON ingestion',
    date: 'October 2025',
    desc: 'Routing the hot path through simdjson — with zero-copy DirectByteBuffers — pushed sustained throughput past 2.9 GB/s and gave back 61% of parse CPU.',
  },
  {
    id: 'jax',
    kicker: 'Systems · Machine Learning · JAX',
    title: 'Cost-Aware Predictive Query Prefetching with JAX',
    date: 'February 2026',
    desc: 'A prefetch is a bet. This system uses a lightweight JAX predictor to place that bet only when the expected latency savings beat the expected backend cost.',
  },
];

const BlogList: React.FC<{ onSelect: (p: Post) => void }> = ({ onSelect }) => (
  <section className="animate-in">
    <h2 style={{
      fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: 'var(--color-text-muted)',
      margin: '0 0 1.5rem',
    }}>Writing</h2>
    <div style={{ display: 'grid', gap: '1px', background: 'var(--color-border)' }}>
      {posts.map(p => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            background: 'var(--color-bg)', border: 'none', cursor: 'pointer',
            padding: '1.3rem 0', transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-border-light)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-bg)')}
        >
          <div style={{
            fontFamily: 'SF Mono, Menlo, monospace',
            fontSize: '10.5px', letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--color-accent)', marginBottom: '0.4rem',
          }}>{p.kicker}</div>
          <div style={{
            fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em',
            color: 'var(--color-text)', lineHeight: 1.2, marginBottom: '0.5rem',
          }}>{p.title}</div>
          <p style={{
            fontSize: '13.5px', color: 'var(--color-text-subtle)', lineHeight: 1.55,
            margin: '0 0 0.6rem',
          }}>{p.desc}</p>
          <div style={{
            fontFamily: 'SF Mono, Menlo, monospace', fontSize: '11.5px',
            color: 'var(--color-text-muted)',
          }}>
            <span>{p.date}</span>
          </div>
        </button>
      ))}
    </div>
  </section>
);

const Blog: React.FC = () => {
  const [selected, setSelected] = useState<Post | null>(() => {
    const match = window.location.hash.match(/^#blog\/(jax|simd)$/i);
    return match ? (match[1].toLowerCase() as Post) : null;
  });

  const handleSelect = (p: Post) => {
    window.location.hash = 'blog/' + p;
    setSelected(p);
  };

  const handleBack = () => {
    window.location.hash = 'blog';
    setSelected(null);
  };

  useEffect(() => {
    const onHashChange = () => {
      const match = window.location.hash.match(/^#blog\/(jax|simd)$/i);
      setSelected(match ? (match[1].toLowerCase() as Post) : null);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (selected === 'jax') return <BlogJAX onBack={handleBack} />;
  if (selected === 'simd') return <BlogSIMD onBack={handleBack} />;
  return <BlogList onSelect={handleSelect} />;
};

export default Blog;
