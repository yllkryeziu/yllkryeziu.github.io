import React, { useEffect, useRef } from 'react';

// Scroll-animate hook
function useScrollAnimate(cb: (el: Element) => void, threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { cb(el); io.disconnect(); } },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cb, threshold]);
  return ref;
}

// ---- sub-components ----

function StatStrip() {
  return (
    <div style={{
      marginTop: '2.5rem',
      borderTop: '1px solid var(--color-text)',
      borderBottom: '1px solid var(--color-border)',
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
    }}>
      {[
        { eyebrow: 'p95 latency ↓', num: '28%', sub: '412 ms → 296 ms vs. no prefetch' },
        { eyebrow: 'extra backend load', num: '8%', sub: 'under the 10% budget target' },
        { eyebrow: 'wasted prefetch ↓', num: '63%', sub: 'vs. naive top-2 prefetching' },
      ].map((s, i) => (
        <div key={i} style={{
          padding: '1.4rem 1rem 1.3rem',
          borderRight: i < 2 ? '1px solid var(--color-border)' : 'none',
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: 'SF Mono, Menlo, monospace',
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
          }}>{s.eyebrow}</div>
          <div style={{
            fontSize: '42px',
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            color: 'var(--color-text)',
            margin: '0.6rem 0 0.5rem',
          }}>{s.num}</div>
          <div style={{ fontSize: '12.5px', color: 'var(--color-text-subtle)', lineHeight: 1.45 }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

function ArchDiagram() {
  return (
    <div style={{
      background: 'var(--color-border-light)',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      padding: '2rem 1.8rem 2.2rem',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
        <ArchNode title="Synthetic Session Generator" sub="transition matrix · noise" />
        <ArrowDown />
        <ArchNode title="JAX Training Pipeline" sub="jit · vmap · grad" />
        <ArrowDown />
        <ArchNode title="JAX Predictor Artifact" sub="P(next | prefix, ctx)" accent />
        <ArrowDown />
        <ArchNode title="API Gateway / Query Router" sub="FastAPI · policy + predictor" />
        {/* fan lines */}
        <div style={{ position: 'relative', height: 30, width: '100%' }}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }} viewBox="0 0 300 30" preserveAspectRatio="none">
            <path d="M150 0 L50 30" stroke="var(--color-border)" strokeWidth="1" fill="none" />
            <path d="M150 0 L150 30" stroke="var(--color-border)" strokeWidth="1" fill="none" />
            <path d="M150 0 L250 30" stroke="var(--color-border)" strokeWidth="1" fill="none" />
          </svg>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontFamily: 'SF Mono, Menlo, monospace', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.5rem', whiteSpace: 'nowrap' }}>decide</div>
            <ArchNode title="Cost-Aware Prefetch Policy" accent small full />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontFamily: 'SF Mono, Menlo, monospace', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.5rem', whiteSpace: 'nowrap' }}>store</div>
            <ArchNode title="Redis Cache" sub="ttl · prefetched flag" small full />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontFamily: 'SF Mono, Menlo, monospace', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.5rem', whiteSpace: 'nowrap' }}>backends</div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {['search', 'product', 'reviews', 'recommendations', 'cart pricing'].map(s => (
                <div key={s} style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  fontFamily: 'SF Mono, Menlo, monospace',
                  fontSize: '10.5px',
                  color: 'var(--color-text-subtle)',
                  padding: '0.28rem 0.4rem',
                  textAlign: 'center',
                }}>{s}</div>
              ))}
            </div>
          </div>
        </div>
        <ArrowDown />
        <ArchNode title="Benchmark + Observability" sub="k6 · Prometheus · Grafana · OTel" />
      </div>
    </div>
  );
}

function ArchNode({ title, sub, accent = false, small = false, full = false }: { title: string; sub?: string; accent?: boolean; small?: boolean; full?: boolean }) {
  return (
    <div style={{
      background: accent ? 'rgba(201,104,74,0.07)' : 'var(--color-bg)',
      border: `1px solid ${accent ? 'var(--color-accent)' : 'var(--color-border)'}`,
      borderRadius: 10,
      padding: small ? '0.55rem 0.9rem' : '0.65rem 1.1rem',
      textAlign: 'center',
      width: full ? '100%' : undefined,
    }}>
      <div style={{
        fontWeight: 600,
        fontSize: small ? '13px' : '14px',
        color: accent ? 'var(--color-accent)' : 'var(--color-text)',
        lineHeight: 1.3,
      }}>{title}</div>
      {sub && <div style={{
        fontFamily: 'SF Mono, Menlo, monospace',
        fontSize: '10.5px',
        color: 'var(--color-text-muted)',
        marginTop: '0.2rem',
        lineHeight: 1.3,
      }}>{sub}</div>}
    </div>
  );
}

function ArrowDown() {
  return (
    <div style={{ position: 'relative', width: 1, height: 26, background: 'var(--color-border)' }}>
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        borderLeft: '4px solid transparent', borderRight: '4px solid transparent',
        borderTop: '5px solid var(--color-border)',
      }} />
    </div>
  );
}

function CodeBlock({ filename, children }: { filename: string; children: React.ReactNode }) {
  return (
    <div style={{
      margin: '1.4rem 0',
      borderRadius: 8,
      overflow: 'hidden',
      border: '1px solid #2b2a38',
    }}>
      <div style={{
        background: '#16151f',
        color: '#6b6880',
        fontFamily: '"IBM Plex Mono", SF Mono, Menlo, monospace',
        fontSize: '12px',
        padding: '0.55rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        borderBottom: '1px solid #2b2a38',
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#3a3848' }} />)}
        </div>
        <span style={{ marginLeft: '0.3rem' }}>{filename}</span>
      </div>
      <pre style={{
        margin: 0,
        background: '#1c1b26',
        color: '#e8e6f0',
        fontFamily: '"IBM Plex Mono", SF Mono, Menlo, monospace',
        fontSize: '13px',
        lineHeight: 1.65,
        padding: '1.1rem 1.2rem',
        overflowX: 'auto',
      }}>{children}</pre>
    </div>
  );
}

function Eq({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--color-border-light)',
      border: '1px solid var(--color-border)',
      borderLeft: '3px solid var(--color-accent)',
      borderRadius: '0 10px 10px 0',
      padding: '1rem 1.2rem',
      margin: '1.3rem 0',
      fontFamily: '"IBM Plex Mono", SF Mono, Menlo, monospace',
      fontSize: '13.5px',
      lineHeight: 1.85,
      color: 'var(--color-text)',
    }}>{children}</div>
  );
}

function Figcaption({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-sans)',
      fontSize: '13px',
      color: 'var(--color-text-subtle)',
      marginTop: '0.8rem',
      lineHeight: 1.5,
      paddingLeft: '0.9rem',
      borderLeft: '2px solid var(--color-border)',
    }}>{children}</div>
  );
}

function BarChart({ title, sub, rows, note }: {
  title: string;
  sub: string;
  rows: { label: string; pct: number; val: string; hi?: boolean }[];
  note?: string;
}) {
  const ref = useScrollAnimate((el) => {
    el.querySelectorAll<HTMLElement>('[data-pct]').forEach(f => {
      f.style.width = f.dataset.pct + '%';
    });
  });

  return (
    <div ref={ref} style={{
      background: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      padding: '1.6rem 1.6rem 1.3rem',
    }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.01em', color: 'var(--color-text)' }}>{title}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-text-subtle)', marginTop: '0.15rem' }}>{sub}</div>
      <div style={{ marginTop: '1.5rem', display: 'grid', gap: '0.8rem' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '116px 1fr 72px', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              fontSize: '13px',
              color: r.hi ? 'var(--color-text)' : 'var(--color-text-subtle)',
              fontWeight: r.hi ? 600 : 400,
              textAlign: 'right',
              lineHeight: 1.25,
            }}>{r.label}</div>
            <div style={{ position: 'relative', height: 22 }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: '0 5px 5px 0',
                  background: r.hi ? 'var(--color-accent)' : 'var(--color-border)',
                  width: `${r.pct}%`,
                }}
              />
            </div>
            <div style={{
              fontFamily: '"IBM Plex Mono", SF Mono, Menlo, monospace',
              fontSize: '12.5px',
              color: r.hi ? 'var(--color-text)' : 'var(--color-text-subtle)',
              fontWeight: r.hi ? 600 : 400,
              whiteSpace: 'nowrap',
            }}>{r.val}</div>
          </div>
        ))}
      </div>
      {note && <div style={{ marginTop: '1rem', fontSize: '11.5px', color: 'var(--color-text-muted)', fontFamily: '"IBM Plex Mono", SF Mono, Menlo, monospace' }}>{note}</div>}
    </div>
  );
}

function AccuracyChart() {
  const ref = useScrollAnimate((el) => {
    el.querySelectorAll<HTMLElement>('[data-h]').forEach(bar => {
      const col = bar.querySelector<HTMLElement>('.acc-col');
      const pct = bar.querySelector<HTMLElement>('.acc-pct');
      if (col) col.style.height = bar.dataset.h + '%';
      if (pct) pct.style.opacity = '1';
    });
  });

  return (
    <div ref={ref} style={{
      background: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      padding: '1.6rem 1.6rem 1.3rem',
    }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.01em', color: 'var(--color-text)' }}>Model quality</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-text-subtle)', marginTop: '0.15rem' }}>Held-out test set · 10,000 sessions</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.4rem', marginTop: '1.5rem' }}>
        {[
          { label: 'Top-1 accuracy', h: 61, pct: '61%' },
          { label: 'Top-3 accuracy', h: 88, pct: '88%' },
        ].map((b, i) => (
          <div key={i}>
            <div
              data-h={b.h}
              style={{
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                height: 180, borderBottom: '1px solid var(--color-border)', position: 'relative',
              }}
            >
              <div className="acc-pct" style={{
                position: 'absolute', top: '0.2rem', left: '50%', transform: 'translateX(-50%)',
                fontFamily: '"IBM Plex Mono", SF Mono, Menlo, monospace',
                fontSize: '24px', fontWeight: 600, letterSpacing: '-0.03em',
                color: 'var(--color-text)', opacity: 1, whiteSpace: 'nowrap',
              }}>{b.pct}</div>
              <div className="acc-col" style={{
                width: 60, margin: '0 auto',
                background: 'var(--color-accent)',
                borderRadius: '6px 6px 0 0', height: `${b.h}%`,
              }} />
            </div>
            <div style={{ textAlign: 'center', marginTop: '0.6rem', fontSize: '13px', color: 'var(--color-text-subtle)' }}>{b.label}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '1rem', fontSize: '11.5px', color: 'var(--color-text-muted)', fontFamily: '"IBM Plex Mono", SF Mono, Menlo, monospace', display: 'flex', justifyContent: 'space-between' }}>
        <span>cross-entropy: 1.04 nats</span><span>ECE 0.03</span>
      </div>
    </div>
  );
}

function SessionWalk() {
  const ref = useScrollAnimate((el) => {
    el.querySelectorAll<HTMLElement>('[data-w]').forEach(p => {
      const bar = p.querySelector<HTMLElement>('.pred-fill');
      if (bar) bar.style.width = p.dataset.w + '%';
    });
  });

  const preds = [
    { ep: '/product/reviews', w: 74, go: true, verdict: 'PREFETCH · p .74' },
    { ep: '/product/recommendations', w: 58, go: true, verdict: 'PREFETCH · p .58' },
    { ep: '/cart', w: 22, go: false, verdict: 'SKIP · p .22 < floor' },
    { ep: '/checkout/start', w: 9, go: false, verdict: 'SKIP · unsafe (write)' },
  ];

  return (
    <div ref={ref} style={{
      background: 'var(--color-border-light)',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      padding: '1.8rem 1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { ep: '/home', dim: true }, { ep: '/search', dim: true }, { ep: '/product', dim: false, current: true },
        ].map((e, i, arr) => (
          <React.Fragment key={e.ep}>
            <span style={{
              fontFamily: '"IBM Plex Mono", SF Mono, Menlo, monospace',
              fontSize: '12.5px',
              background: 'var(--color-bg)',
              border: `1px solid ${e.current ? 'var(--color-text)' : 'var(--color-border)'}`,
              borderRadius: 7,
              padding: '0.3rem 0.55rem',
              color: 'var(--color-text)',
              opacity: e.dim ? 0.5 : 1,
              fontWeight: e.current ? 600 : 400,
            }}>{e.ep}</span>
            {i < arr.length - 1 && <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>→</span>}
          </React.Fragment>
        ))}
        <span style={{ color: 'var(--color-text-muted)', fontSize: '12.5px', marginLeft: '0.3rem' }}>← current</span>
      </div>
      <div style={{ marginTop: '1.3rem', display: 'grid', gap: '0.5rem' }}>
        {preds.map((p, i) => (
          <div key={i} data-w={p.w} style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', alignItems: 'center', gap: '0.8rem' }}>
            <span style={{ fontFamily: '"IBM Plex Mono", SF Mono, Menlo, monospace', fontSize: '12px', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.ep}</span>
            <div style={{ height: 9, borderRadius: 5, background: 'var(--color-border)', overflow: 'hidden' }}>
              <div className="pred-fill" style={{
                display: 'block', height: '100%', borderRadius: 5,
                background: p.go ? 'var(--color-accent)' : 'var(--color-border)',
                width: `${p.w}%`,
              }} />
            </div>
            <span style={{
              fontFamily: '"IBM Plex Mono", SF Mono, Menlo, monospace',
              fontSize: '11px',
              letterSpacing: '0.03em',
              padding: '0.14rem 0.45rem',
              borderRadius: 20,
              whiteSpace: 'nowrap',
              background: p.go ? 'rgba(201,104,74,0.1)' : 'var(--color-border-light)',
              color: p.go ? 'var(--color-accent)' : 'var(--color-text-muted)',
              border: `1px solid ${p.go ? 'rgba(201,104,74,0.2)' : 'var(--color-border)'}`,
            }}>{p.verdict}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart() {
  const ref = useScrollAnimate((el) => {
    el.querySelectorAll<SVGPathElement>('.lc-path').forEach(p => { p.style.strokeDashoffset = '0'; });
    el.querySelectorAll<SVGElement>('.lc-dot').forEach(d => { d.style.opacity = '1'; });
  });

  return (
    <div ref={ref} style={{
      background: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      padding: '1.6rem',
    }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.01em', color: 'var(--color-text)' }}>p95 latency under concurrency</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-text-subtle)', marginTop: '0.15rem' }}>Lower and flatter is better</div>
      <div style={{ display: 'flex', gap: '1.2rem', marginTop: '0.7rem', fontSize: '13px', color: 'var(--color-text-subtle)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <i style={{ width: 12, height: 12, borderRadius: 3, display: 'inline-block', background: 'var(--color-border)' }} />
          No prefetch
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <i style={{ width: 12, height: 12, borderRadius: 3, display: 'inline-block', background: 'var(--color-accent)' }} />
          JAX cost-aware
        </span>
      </div>
      <svg viewBox="0 0 640 300" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', marginTop: '0.5rem' }}>
        <g stroke="var(--color-border)" strokeWidth="1">
          <line x1="70" y1="40" x2="620" y2="40" /><line x1="70" y1="110" x2="620" y2="110" />
          <line x1="70" y1="180" x2="620" y2="180" /><line x1="70" y1="250" x2="620" y2="250" />
        </g>
        <g fontFamily="SF Mono, Menlo, monospace" fontSize="11" fill="var(--color-text-muted)" textAnchor="end">
          <text x="58" y="44">700</text><text x="58" y="114">500</text>
          <text x="58" y="184">300</text><text x="58" y="254">100</text>
        </g>
        <g fontFamily="SF Mono, Menlo, monospace" fontSize="11" fill="var(--color-text-muted)" textAnchor="middle">
          <text x="120" y="278">100 users</text>
          <text x="345" y="278">500 users</text>
          <text x="570" y="278">1000 users</text>
        </g>
        <path className="lc-path" stroke="var(--color-border)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
          d="M120 134.5 L345 103 L570 43.5" />
        <path className="lc-path" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
          d="M120 180 L345 166 L570 134.5" />
        <g className="lc-dot" style={{ opacity: 1 }}>
          <circle cx="120" cy="134.5" r="4" fill="var(--color-border)" />
          <circle cx="345" cy="103" r="4" fill="var(--color-border)" />
          <circle cx="570" cy="43.5" r="4" fill="var(--color-border)" />
          <circle cx="120" cy="180" r="4" fill="var(--color-accent)" />
          <circle cx="345" cy="166" r="4" fill="var(--color-accent)" />
          <circle cx="570" cy="134.5" r="4" fill="var(--color-accent)" />
          <text x="570" y="126" fontFamily="SF Mono, Menlo, monospace" fontSize="11" fill="var(--color-accent)" textAnchor="middle" fontWeight="600">430 ms</text>
          <text x="570" y="35" fontFamily="SF Mono, Menlo, monospace" fontSize="11" fill="var(--color-text-muted)" textAnchor="middle">690 ms</text>
        </g>
      </svg>
    </div>
  );
}

// ---- syntax highlight helpers ----
const cm = (s: string) => <span style={{ color: '#6b6880', fontStyle: 'italic' }}>{s}</span>;
const st = (s: string) => <span style={{ color: '#9ed8a8' }}>{s}</span>;
const kw = (s: string) => <span style={{ color: '#c9a8ff' }}>{s}</span>;
const fn = (s: string) => <span style={{ color: '#8fc7ff' }}>{s}</span>;
const nm = (s: string) => <span style={{ color: '#e6c98a' }}>{s}</span>;
const ic = (s: string) => <span style={{ color: '#e8e6f0' }}>{s}</span>;

// ---- main Blog component ----

const BlogJAX: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const body: React.CSSProperties = {
    fontFamily: 'var(--font-serif)',
    fontSize: '17px',
    lineHeight: 1.72,
    color: 'var(--color-text)',
  };
  const h2: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: '24px',
    fontWeight: 700,
    letterSpacing: '-0.025em',
    lineHeight: 1.15,
    color: 'var(--color-text)',
    margin: '3.5rem 0 0.9rem',
  };
  const h3: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: '17.5px',
    fontWeight: 600,
    letterSpacing: '-0.015em',
    color: 'var(--color-text)',
    margin: '2.2rem 0 0.5rem',
  };
  const p: React.CSSProperties = { margin: '0 0 1rem' };
  const inlineCode = {
    fontFamily: '"IBM Plex Mono", SF Mono, Menlo, monospace',
    fontSize: '0.84em',
    background: 'var(--color-border-light)',
    padding: '0.06em 0.32em',
    borderRadius: 4,
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
  };

  return (
    <section style={body} className="d-article">
      {/* back button */}
      <button onClick={onBack} className="d-sans" style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        background: 'none', border: 'none', padding: '0 0 1.5rem', cursor: 'pointer',
        color: 'var(--color-text-muted)', fontSize: '13px',
      }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
      >
        ← Blog
      </button>
      {/* kicker */}
      <div className="d-sans" style={{
        fontSize: '11.5px',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--color-text-muted)',
      }}>Systems · Machine Learning · JAX</div>

      {/* title */}
      <h1 className="d-sans" style={{
        fontSize: '34px',
        fontWeight: 700,
        letterSpacing: '-0.035em',
        lineHeight: 1.08,
        color: 'var(--color-text)',
        margin: '0.6rem 0 0',
      }}>
        Cost-Aware Predictive Query Prefetching with JAX
      </h1>

      {/* lead */}
      <p style={{ fontSize: '19px', lineHeight: 1.55, color: 'var(--color-text-subtle)', marginTop: '1.1rem', marginBottom: 0 }}>
        A prefetch is a bet. This system uses a lightweight JAX predictor to place that bet only when the expected latency savings beat the expected backend cost.
      </p>

      {/* byline */}
      <div className="d-byline">
        <div>
          <div className="label">Author</div>
          <div className="value">Yll Kryeziu</div>
        </div>
        <div>
          <div className="label">Published</div>
          <div className="value">February 2026</div>
        </div>
        <div>
          <div className="label">Code</div>
          <div className="value">
            <a href="https://github.com/yllkryeziu/JAXPrefetch" target="_blank" rel="noopener noreferrer">
              JAXPrefetch
            </a>
          </div>
        </div>
      </div>

      {/* TL;DR */}
      <StatStrip />

      {/* --- The bet --- */}
      <h2 style={h2}>The bet nobody prices</h2>
      <p style={p}>Prefetching is one of the oldest tricks for hiding latency: guess what the user will ask for next, fetch it early, serve it instantly. The catch is that every speculative fetch you issue is a request your backend has to absorb <em>whether or not the user ever needed it</em>.</p>
      <p style={p}>Naive prefetchers ignore this. They fire the top-k predicted requests on every navigation, trading a chunk of backend capacity for a latency win that may never materialize. Under load, that trade gets expensive fast.</p>
      <p style={{ margin: 0 }}>The deeper question is whether fetching a resource early is worth the backend cost of doing so. That is the question I built around: a synthetic shopping workload, a JAX next-request predictor, and a <strong>cost-aware policy</strong> that only prefetches when the math works out.</p>

      {/* --- System overview --- */}
      <h2 style={h2}>System overview</h2>
      <p style={p}>Five stages, one decision point. Synthetic sessions train a JAX predictor; the predictor is exported as an artifact the gateway loads at request time; the gateway consults the cost-aware policy before touching the cache or any backend.</p>
      <figure style={{ margin: '2rem 0' }}>
        <ArchDiagram />
        <Figcaption><strong>Figure 1.</strong> The predictor is one component, not the product. The system-level result is the latency/load tradeoff the policy strikes; the model just feeds it probabilities.</Figcaption>
      </figure>

      {/* --- Model --- */}
      <h2 style={h2}>The JAX predictor</h2>
      <p style={p}>The model answers a narrow question: given the current session prefix and some context, what is the probability distribution over the <em>next</em> endpoint? Deliberately not a transformer: an embedding-plus-MLP that is fast to <code style={inlineCode}>jit</code>-compile and cheap to call inline on the request path.</p>
      <p style={p}>Each synthetic request carries the context the model and policy need:</p>

      <CodeBlock filename="simulator/synthetic_sessions.py">
        {cm('# Generated from a transition matrix with configurable noise')}{'\n'}
        {'{'}{'\n'}
        {'  '}{st('"session_id"')}{': '}{st('"s_123"')},{'\n'}
        {'  '}{st('"endpoint"')}{': '}{st('"/product"')},{'\n'}
        {'  '}{st('"previous_endpoint"')}{': '}{st('"/search"')},{'\n'}
        {'  '}{st('"user_segment"')}{': '}{st('"comparison_shopper"')},{'\n'}
        {'  '}{st('"device_type"')}{': '}{st('"mobile"')},{'\n'}
        {'  '}{st('"network_type"')}{': '}{st('"slow_4g"')},{'\n'}
        {'  '}{st('"cacheable"')}{': '}{kw('true')},{'\n'}
        {'  '}{st('"estimated_backend_cost"')}{': '}{nm('0.7')},{'\n'}
        {'  '}{st('"observed_latency_ms"')}{': '}{nm('180')}{'\n'}
        {'}'}
      </CodeBlock>

      <h3 style={h3}>Forward pass</h3>
      <p style={p}>Embeddings for the categorical features (current/previous endpoint, segment, device, network) are concatenated with the scalar context, run through a two-layer MLP, and softmaxed over the endpoint vocabulary. <code style={inlineCode}>vmap</code> turns the single-example function into a batched one for free; <code style={inlineCode}>grad</code> handles training.</p>

      <CodeBlock filename="jax_model/model.py">
        {kw('def')}{' '}{fn('forward')}{ic('(params, x):')}{'\n'}
        {'    '}{cm('# x: tokenized categoricals + normalized scalars')}{'\n'}
        {'    '}{'emb = jnp.concatenate(['}{'\n'}
        {'        '}{'params.ep_emb[x.current_ep],      '}{cm('# endpoint')}{'\n'}
        {'        '}{'params.ep_emb[x.prev_ep],         '}{cm('# previous endpoint')}{'\n'}
        {'        '}{'params.seg_emb[x.segment],        '}{cm('# user segment')}{'\n'}
        {'        '}{'params.dev_emb[x.device],'}{'\n'}
        {'        '}{'x.scalars,                        '}{cm('# pos, dt_ms, avg_latency...')}{'\n'}
        {'    '}{'])'}{'\n'}
        {'    '}{'h = jax.nn.'}{fn('gelu')}{ic('(emb @ params.w1 + params.b1)')}{'\n'}
        {'    '}{'logits = h @ params.w2 + params.b2'}{'\n'}
        {'    '}{kw('return')}{' jax.nn.'}{fn('softmax')}{ic('(logits)')}{cm('   # P(next | prefix, ctx)')}{'\n'}
        {'\n'}
        {'batched = jax.'}{fn('vmap')}{ic('(forward, in_axes=(')}{kw('None')}{ic(', ')}{nm('0')}{ic('))')}{'\n'}
        {'predict = jax.'}{fn('jit')}{ic('(batched)')}
      </CodeBlock>

      <figure style={{ margin: '2rem 0' }}>
        <AccuracyChart />
        <Figcaption><strong>Figure 2.</strong> Top-1 of 61% sounds modest. What matters is <em>calibrated probabilities</em>, not strict accuracy. A confident top-3 is exactly what a cost gate can act on.</Figcaption>
      </figure>

      {/* --- Policy --- */}
      <h2 style={h2}>The cost-aware policy</h2>
      <p style={p}>This is the heart of the project. For every candidate next endpoint the predictor surfaces, the policy prices the bet. The latency you'd save is discounted by how likely the user actually is to need it; the cost includes the backend hit, cache memory, network, and a penalty for the times you guessed wrong.</p>

      <Eq>
        {'expected_latency_gain = '}<span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>p_next</span>{' × est_latency_saved_ms'}<br /><br />
        {'expected_cost = backend_cost + cache_cost + network_cost'}<br />
        {'             + wasted_penalty × (1 − '}<span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>p_next</span>{')'}
      </Eq>

      <p style={p}>A prefetch only fires when the discounted gain clears the cost by a tunable margin <code style={inlineCode}>α</code>, the probability passes a floor, the endpoint is cacheable <em>and</em> safe, and there's budget left in the session window:</p>

      <CodeBlock filename="gateway/prefetch_policy.py">
        {kw('def')}{' '}{fn('should_prefetch')}{ic('(cand, ctx, budget):')}{'\n'}
        {'    gain = cand.p_next * cand.est_latency_saved_ms'}{'\n'}
        {'    cost = (cand.backend_cost + cand.cache_cost + cand.network_cost'}{'\n'}
        {'            + WASTED_PENALTY * ('}{nm('1')}{' - cand.p_next))'}{'\n'}
        {'\n'}
        {'    '}{kw('return')}{' ('}{'\n'}
        {'        gain > '}{nm('ALPHA')}{' * cost                '}{cm('# worth the spend?')}{'\n'}
        {'        '}{kw('and')}{' cand.p_next >= '}{nm('MIN_PROB')}{ic('          ')}{cm('# confident enough?')}{'\n'}
        {'        '}{kw('and')}{' cand.endpoint_is_cacheable      '}{cm('# safe to store?')}{'\n'}
        {'        '}{kw('and')}{' cand.endpoint_is_safe           '}{cm('# read-only, no PII?')}{'\n'}
        {'        '}{kw('and')}{' budget.remaining > '}{nm('0')}{ic('            ')}{cm('# budget left?')}{'\n'}
        {'    )'}
      </CodeBlock>

      <p style={p}>Walking one real session: the user lands on <code style={inlineCode}>/product</code> with a comparison-shopper profile on a slow connection. The predictor scores the candidates; the policy gates them.</p>

      <figure style={{ margin: '2rem 0' }}>
        <SessionWalk />
        <Figcaption><strong>Figure 3.</strong> Two prefetches fire; two are gated. <code style={{ ...inlineCode, background: 'transparent', border: 'none', padding: 0 }}>/cart</code> is plausible but below the probability floor; <code style={{ ...inlineCode, background: 'transparent', border: 'none', padding: 0 }}>/checkout/start</code> is blocked because it's a write path.</Figcaption>
      </figure>

      {/* --- Experiments --- */}
      <h2 style={h2}>Does it actually pay off?</h2>
      <p style={p}>I benchmarked four strategies against a no-prefetch baseline: naive top-1, naive top-2, a fixed rule-based prefetcher, and the JAX cost-aware policy. The point of the comparison is the <em>tradeoff</em>, not any single number.</p>

      <figure style={{ margin: '2rem 0' }}>
        <BarChart
          title="p95 latency by strategy"
          sub="Lower is better · synthetic workload, 1,000 concurrent users"
          rows={[
            { label: 'No prefetch', pct: 100, val: '412 ms' },
            { label: 'Naive top-1', pct: 87, val: '360 ms' },
            { label: 'Naive top-2', pct: 82, val: '338 ms' },
            { label: 'Rule-based', pct: 81, val: '332 ms' },
            { label: 'JAX cost-aware', pct: 72, val: '296 ms', hi: true },
          ]}
        />
        <Figcaption><strong>Figure 4.</strong> The cost-aware policy wins on latency, but latency alone is easy to buy. The difference shows up in what each strategy <em>spends</em> to get there.</Figcaption>
      </figure>

      <figure style={{ margin: '2rem 0' }}>
        <BarChart
          title="Extra backend load by strategy"
          sub="Lower is better · % requests above the no-prefetch baseline"
          rows={[
            { label: 'No prefetch', pct: 2, val: '0%' },
            { label: 'Rule-based', pct: 34, val: '14%' },
            { label: 'Naive top-1', pct: 54, val: '22%' },
            { label: 'Naive top-2', pct: 100, val: '41%' },
            { label: 'JAX cost-aware', pct: 20, val: '8%', hi: true },
          ]}
        />
        <Figcaption><strong>Figure 5.</strong> Naive top-2 bought its latency with <strong>41% extra load</strong>. The cost-aware policy gets a <em>better</em> p95 for <strong>8%</strong>, under the 10% budget and roughly a fifth of naive's cost.</Figcaption>
      </figure>

      <figure style={{ margin: '2rem 0' }}>
        <BarChart
          title="Cache hit rate by strategy"
          sub="Higher is better · share of requests served from cache"
          rows={[
            { label: 'No prefetch', pct: 23, val: '12%' },
            { label: 'Naive top-1', pct: 77, val: '41%' },
            { label: 'Rule-based', pct: 83, val: '44%' },
            { label: 'Naive top-2', pct: 91, val: '48%' },
            { label: 'JAX cost-aware', pct: 100, val: '53%', hi: true },
          ]}
        />
        <Figcaption><strong>Figure 6.</strong> The cost-aware policy lands the highest hit rate, because the prefetches it issues are the ones most likely to be used. Precision over volume.</Figcaption>
      </figure>

      <h3 style={h3}>Holding up under load</h3>
      <p style={p}>A prefetch policy that helps at low traffic but collapses under concurrency is worthless. I ran the stress test at 100, 500, and 1,000 concurrent users.</p>

      <figure style={{ margin: '2rem 0' }}>
        <LineChart />
        <Figcaption><strong>Figure 7.</strong> As load climbs, the no-prefetch line steepens as backends saturate. The cost-aware policy stays flatter: by spending its prefetch budget only on high-value bets, it preserves backend headroom exactly when it is scarcest.</Figcaption>
      </figure>

      {/* --- Takeaway --- */}
      <h2 style={h2}>What the numbers say</h2>
      <p style={p}>Against the success targets I set up front, the cost-aware policy cleared all four: <strong>p95 down 28%</strong> (target ≥25%), <strong>extra load 8%</strong> (target &lt;10%), <strong>wasted prefetches down 63%</strong> versus naive top-2, and a better latency/load tradeoff than the rule-based prefetcher at every operating point.</p>
      <p style={{ margin: 0 }}>The key result is not the model. A 61%-accurate MLP is useful, but it is replaceable. Pricing each speculative request turned a blunt latency hack into something you could run in front of real backends, matching the greedy approach on latency at a fifth of the cost.</p>

    </section>
  );
};

export default BlogJAX;
