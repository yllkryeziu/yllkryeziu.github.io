import React, { useEffect, useRef } from 'react';

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

// ---- syntax helpers (light-themed) ----
const cm = (s: string) => <span style={{ color: '#9a9aa1', fontStyle: 'italic' }}>{s}</span>;
const kw = (s: string) => <span style={{ color: '#1640c4' }}>{s}</span>;
const ty = (s: string) => <span style={{ color: '#b5430a' }}>{s}</span>;
const st = (s: string) => <span style={{ color: '#0a7d52' }}>{s}</span>;
const nm = (s: string) => <span style={{ color: '#8a4bd6' }}>{s}</span>;
const fn = (s: string) => <span style={{ fontWeight: 600 }}>{s}</span>;

// ---- shared style tokens ----
const ACCENT = 'var(--color-accent)';
const BORDER = 'var(--color-border)';
const BORDER_LIGHT = 'var(--color-border-light)';
const TEXT = 'var(--color-text)';
const MUTED = 'var(--color-text-muted)';
const SUBTLE = 'var(--color-text-subtle)';
const BG = 'var(--color-bg)';
const MONO = '"IBM Plex Mono", SF Mono, Menlo, monospace';

// ---- Light code block ----
function CodeBlock({ lang, file, children }: { lang: string; file: string; children: React.ReactNode }) {
  return (
    <div style={{ margin: '1.4rem 0' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: MONO, fontSize: '11.5px', letterSpacing: '0.04em',
        color: MUTED, background: '#efeee9',
        border: `1px solid ${BORDER}`, borderBottom: 'none',
        borderRadius: '8px 8px 0 0', padding: '8px 14px',
      }}>
        <span style={{ fontWeight: 600, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10.5px' }}>{lang}</span>
        <span style={{ color: '#a3a3ab' }}>{file}</span>
        <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: '#d3d2cb' }} />)}
        </div>
      </div>
      <pre style={{
        margin: 0, background: '#f7f7f3',
        border: `1px solid ${BORDER}`, borderRadius: '0 0 8px 8px',
        padding: '1rem 1.1rem', overflowX: 'auto',
        fontFamily: MONO, fontSize: '13px', lineHeight: 1.62,
        color: TEXT, tabSize: 2,
      }}>{children}</pre>
    </div>
  );
}

// ---- Pull quote ----
function Pull({ children }: { children: React.ReactNode }) {
  return (
    <blockquote style={{
      fontSize: '19px', lineHeight: 1.45, color: TEXT, fontWeight: 500,
      borderLeft: `2px solid ${ACCENT}`,
      paddingLeft: '1.4rem', margin: '2rem 0',
    }}>{children}</blockquote>
  );
}

// ---- Figure card wrapper ----
function FigCard({ title, unit, caption, children }: { title: string; unit: string; caption: React.ReactNode; children: React.ReactNode }) {
  return (
    <figure style={{ margin: '2rem 0' }}>
      <div style={{
        background: BG, border: `1px solid ${BORDER}`,
        borderRadius: 8, padding: '1.6rem 1.6rem 1.3rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: '1.3rem' }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600, letterSpacing: '-0.01em', color: TEXT }}>{title}</span>
          <span style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a3a3ab', whiteSpace: 'nowrap' }}>{unit}</span>
        </div>
        {children}
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: SUBTLE, marginTop: '0.8rem', lineHeight: 1.5, paddingLeft: '0.9rem', borderLeft: `2px solid ${BORDER}` }}>
        {caption}
      </div>
    </figure>
  );
}

// ---- Hero stat strip ----
function HeroStats() {
  const stats = [
    { num: '6.9', unit: '×', lbl: 'throughput vs. Java tree parser', accent: true },
    { num: '−61', unit: '%', lbl: 'CPU at a fixed offered load', accent: false },
    { num: '2.95', unit: ' GB/s', lbl: 'peak single-thread parse rate', accent: false },
    { num: '0', unit: '', lbl: 'byte copies on the hot path', accent: false },
  ];
  return (
    <div style={{
      marginTop: '2.5rem',
      borderTop: `1px solid ${TEXT}`,
      borderBottom: `1px solid ${BORDER}`,
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
    }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          padding: '1.3rem 0.75rem 1.2rem',
          borderRight: i < 3 ? `1px solid ${BORDER}` : 'none',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '38px', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.04em',
            color: s.accent ? ACCENT : TEXT,
          }}>
            {s.num}<span style={{ fontSize: '18px', fontWeight: 400, color: MUTED, letterSpacing: 0 }}>{s.unit}</span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '0.04em', color: MUTED, marginTop: '0.7rem', lineHeight: 1.35 }}>{s.lbl}</div>
        </div>
      ))}
    </div>
  );
}

// ---- Tick list ----
function TickList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: '1.2rem 0' }}>
      {items.map((item, i) => (
        <li key={i} style={{ position: 'relative', paddingLeft: 26, marginBottom: '0.8rem', fontSize: '15px', color: SUBTLE, lineHeight: 1.6 }}>
          <span style={{
            position: 'absolute', left: 0, top: 8,
            width: 8, height: 8,
            border: `1.5px solid ${ACCENT}`,
            transform: 'rotate(45deg)',
            display: 'inline-block',
          }} />
          {item}
        </li>
      ))}
    </ul>
  );
}

// ---- Throughput bar chart ----
function ThroughputChart() {
  const rows = [
    { label: 'Gson', sub: 'tree', pct: 10, val: '300', accent: false, semi: false },
    { label: 'Jackson', sub: 'databind / tree', pct: 14.3, val: '430', accent: false, semi: false },
    { label: 'Jackson', sub: 'streaming tokens', pct: 24, val: '720', accent: false, semi: false },
    { label: 'simdjson + JNI', sub: 'on-heap copy', pct: 64, val: '1,920', accent: false, semi: true },
    { label: 'simdjson + JNI', sub: 'zero-copy buffer', pct: 98.3, val: '2,950', accent: true, semi: false },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '148px 1fr', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right', fontSize: '13px', color: SUBTLE, lineHeight: 1.25 }}>
            {r.label}
            <div style={{ color: MUTED, fontSize: '11px' }}>{r.sub}</div>
          </div>
          <div style={{ position: 'relative', height: 32 }}>
            <div style={{
              height: '100%', borderRadius: '0 4px 4px 0',
              background: r.accent ? ACCENT : r.semi ? 'rgba(201,104,74,0.25)' : BORDER,
              width: r.pct + '%',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
              paddingRight: 10, minWidth: 44,
            }}>
              <span style={{
                fontFamily: MONO, fontSize: '12px', fontWeight: 500,
                color: r.accent ? '#fff' : r.semi ? ACCENT : SUBTLE,
                whiteSpace: 'nowrap',
              }}>{r.val}</span>
            </div>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 160, fontFamily: MONO, fontSize: '11px', color: '#a3a3ab', marginTop: 6 }}>
        <span>0</span><span>1,000</span><span>2,000</span><span>3,000</span>
      </div>
    </div>
  );
}

// ---- Latency grouped bar chart ----
function LatencyChart() {
  return (
    <svg viewBox="0 0 660 300" style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* gridlines */}
      <g stroke={BORDER} strokeWidth="1">
        <line x1="100" y1="250" x2="640" y2="250" />
        <line x1="100" y1="197" x2="640" y2="197" />
        <line x1="100" y1="144" x2="640" y2="144" />
        <line x1="100" y1="91" x2="640" y2="91" />
        <line x1="100" y1="38" x2="640" y2="38" />
      </g>
      {/* y labels */}
      <g fill="#a3a3ab" fontSize="10" fontFamily="SF Mono, Menlo, monospace" textAnchor="end">
        <text x="88" y="254">0</text>
        <text x="88" y="201">500</text>
        <text x="88" y="148">1000</text>
        <text x="88" y="95">1500</text>
        <text x="88" y="42">2000</text>
      </g>
      {/* Java baseline (gray) */}
      <rect x="114" y="192.7" width="38" height="57.3" fill="#c3c5cd" />
      <rect x="304" y="124.5" width="38" height="125.5" fill="#c3c5cd" />
      <rect x="494" y="33.5" width="38" height="216.5" fill="#c3c5cd" />
      {/* Native (accent) */}
      <rect x="162" y="240.7" width="38" height="9.3" fill={ACCENT} />
      <rect x="352" y="232.1" width="38" height="17.9" fill={ACCENT} />
      <rect x="542" y="219.2" width="38" height="30.8" fill={ACCENT} />
      {/* value labels */}
      <g fontSize="11" fontFamily="SF Mono, Menlo, monospace" textAnchor="middle">
        <text x="133" y="184" fill={MUTED}>540</text>
        <text x="181" y="232" fill={ACCENT} fontWeight="600">88</text>
        <text x="323" y="116" fill={MUTED}>1180</text>
        <text x="371" y="224" fill={ACCENT} fontWeight="600">165</text>
        <text x="513" y="25" fill={MUTED}>2050</text>
        <text x="561" y="211" fill={ACCENT} fontWeight="600">295</text>
      </g>
      {/* group labels */}
      <g fill={TEXT} fontSize="13" fontWeight="600" textAnchor="middle">
        <text x="157" y="272">p50</text>
        <text x="347" y="272">p95</text>
        <text x="537" y="272">p99</text>
      </g>
    </svg>
  );
}

// ---- CPU line chart ----
function CPUChart() {
  const ref = useScrollAnimate((el) => {
    el.querySelectorAll<SVGPathElement>('.cpu-path').forEach(p => { p.style.strokeDashoffset = '0'; });
  });
  return (
    <div ref={ref}>
      <svg viewBox="0 0 640 300" style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* gridlines */}
        <g stroke={BORDER} strokeWidth="1">
          <line x1="50" y1="260" x2="620" y2="260" />
          <line x1="50" y1="208" x2="620" y2="208" />
          <line x1="50" y1="156" x2="620" y2="156" />
          <line x1="50" y1="104" x2="620" y2="104" />
          <line x1="50" y1="52" x2="620" y2="52" />
        </g>
        {/* y labels */}
        <g fill="#a3a3ab" fontSize="10" fontFamily="SF Mono, Menlo, monospace" textAnchor="end">
          <text x="40" y="264">0</text>
          <text x="40" y="212">25</text>
          <text x="40" y="160">50</text>
          <text x="40" y="108">75</text>
          <text x="40" y="56">100%</text>
        </g>
        {/* native fill area */}
        <polygon fill="rgba(201,104,74,0.08)" stroke="none"
          points="50,190 133,180 216,188 299,193 382,183 465,185 548,190 620,190 620,260 50,260" />
        {/* avg reference lines */}
        <line x1="50" y1="79.3" x2="620" y2="79.3" stroke={SUBTLE} strokeWidth="1" strokeDasharray="3 5" />
        <line x1="50" y1="187.5" x2="620" y2="187.5" stroke={ACCENT} strokeWidth="1" strokeDasharray="3 5" />
        {/* baseline line */}
        <polyline className="cpu-path" fill="none" stroke={BORDER} strokeWidth="2" strokeLinejoin="round"
          points="50,95.2 133,77 216,84.4 299,71.5 382,79 465,74 548,81 620,83" />
        {/* native line */}
        <polyline className="cpu-path" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinejoin="round"
          points="50,190 133,180 216,188 299,193 382,183 465,185 548,190 620,190" />
        {/* inline labels */}
        <text x="430" y="65" fill={MUTED} fontSize="12" fontWeight="600">Java baseline · avg 78%</text>
        <text x="430" y="205" fill={ACCENT} fontSize="12" fontWeight="600">simdjson via JNI · avg 30%</text>
        {/* x labels */}
        <g fill="#a3a3ab" fontSize="10" fontFamily="SF Mono, Menlo, monospace" textAnchor="middle">
          <text x="50" y="280">0s</text><text x="212" y="280">15s</text>
          <text x="374" y="280">30s</text><text x="536" y="280">45s</text>
          <text x="620" y="280">60s</text>
        </g>
      </svg>
    </div>
  );
}

// ---- Flamegraph ----
function Flamegraph() {
  const f = (bg: string, fg = '#fff') => ({
    height: 24, borderRadius: 2, display: 'flex', alignItems: 'center',
    padding: '0 6px', fontFamily: MONO, fontSize: '10px', color: fg,
    whiteSpace: 'nowrap' as const, overflow: 'hidden',
    background: bg,
  });

  const Node = ({ style, label, children }: { style: React.CSSProperties; label: string; children?: React.ReactNode }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <div style={{ ...f(style.background as string, style.color as string) }}>{label}</div>
      {children && <div style={{ display: 'flex', gap: 3, minWidth: 0 }}>{children}</div>}
    </div>
  );

  const panel = (label: React.ReactNode, rows: React.ReactNode) => (
    <div>
      <div style={{ fontFamily: MONO, fontSize: '11.5px', fontWeight: 600, color: TEXT, marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {rows}
      </div>
    </div>
  );

  const row = (children: React.ReactNode) => (
    <div style={{ display: 'flex', gap: 3 }}>{children}</div>
  );

  const bar = (bg: string, fg: string, flex: number, label: string) => (
    <div style={{ flex, minWidth: 0, ...f(bg, fg) }}>{label}</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {panel(
        <>Before · Java tree parser <span style={{ color: '#e8590c', fontWeight: 500 }}>parse 71%</span></>,
        <>
          {row(<div style={{ ...f('#c2c6cf', '#3a3a40'), flex: 1 }}>ingestFeed()</div>)}
          {row(<div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={f('#aab0bb')}>parseBatch()</div>
            {row(<>
              <div style={{ flex: 71, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <div style={f('#e8590c')}>Jackson.readTree()</div>
                {row(<>
                  {bar('#f08c2b', '#3a2400', 30, 'nextToken')}
                  {bar('#c92a2a', '#fff', 26, 'parseObject')}
                  {bar('#f08c2b', '#3a2400', 15, '_parseName')}
                </>)}
              </div>
              {bar('#8aa0e8', '#fff', 19, 'mapToListing')}
              {bar('#b7c4ee', '#243a78', 10, 'validate')}
            </>)}
          </div>)}
        </>
      )}
      {panel(
        <>After · simdjson via JNI <span style={{ color: ACCENT, fontWeight: 500 }}>parse 12%</span></>,
        <>
          {row(<div style={{ ...f('#c2c6cf', '#3a3a40'), flex: 1 }}>ingestFeed()</div>)}
          {row(<div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={f('#aab0bb')}>parseBatch()</div>
            {row(<>
              {bar('#e8590c', '#fff', 12, 'simdjson')}
              {bar('#8aa0e8', '#fff', 46, 'mapToListing')}
              {bar('#b7c4ee', '#243a78', 26, 'validate')}
              {bar('#d6deef', '#2a3a66', 16, 'index')}
            </>)}
          </div>)}
        </>
      )}
    </div>
  );
}

// ---- Zero-copy memory diagram ----
function MemoryDiagram() {
  return (
    <svg viewBox="0 0 660 360" style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <marker id="ar-acc2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#C9684A" />
        </marker>
        <marker id="ar-red2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#c92a2a" />
        </marker>
        <marker id="ar-mut2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#a3a3ab" />
        </marker>
      </defs>
      {/* column headers */}
      <g fill="#a3a3ab" fontSize="10" fontWeight="600" letterSpacing="1.2" textAnchor="middle" fontFamily="SF Mono, Menlo, monospace">
        <text x="110" y="22">JAVA HEAP</text>
        <text x="330" y="22">OFF-HEAP MEMORY</text>
        <text x="555" y="22">C++ / SIMDJSON</text>
      </g>
      {/* feed arrow */}
      <text x="330" y="46" fill="#a3a3ab" fontSize="10.5" textAnchor="middle" fontFamily="SF Mono, Menlo, monospace">feed.read(buffer)</text>
      <line x1="330" y1="52" x2="330" y2="78" stroke="#a3a3ab" strokeWidth="1.5" markerEnd="url(#ar-mut2)" />
      {/* java handle box */}
      <rect x="28" y="84" width="164" height="90" rx="9" fill={BG} stroke={BORDER} strokeWidth="1.5" />
      <text x="46" y="116" fill={TEXT} fontSize="13" fontWeight="600">DirectByteBuffer</text>
      <text x="46" y="135" fill={MUTED} fontSize="11">address + capacity</text>
      <text x="46" y="154" fill="#a3a3ab" fontSize="10.5" fontStyle="italic">handle, not the bytes</text>
      {/* off-heap arena */}
      <rect x="245" y="84" width="170" height="90" rx="9" fill="rgba(201,104,74,0.06)" stroke={ACCENT} strokeWidth="1.5" strokeDasharray="5 4" />
      <text x="330" y="102" fill={ACCENT} fontSize="10" fontWeight="600" textAnchor="middle" fontFamily="SF Mono, Menlo, monospace">16 MiB arena · GC-immovable</text>
      <g>
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <rect key={i} x={258 + i * 20} y={114} width={18} height={24} rx={2}
            fill={i % 2 === 0 ? '#fff' : 'rgba(201,104,74,0.12)'} stroke="rgba(201,104,74,0.2)" strokeWidth={1} />
        ))}
      </g>
      <text x="330" y="163" fill="#a3a3ab" fontSize="9.5" textAnchor="middle" fontFamily="SF Mono, Menlo, monospace">raw UTF-8</text>
      {/* native box */}
      <rect x="475" y="84" width="160" height="90" rx="9" fill={BG} stroke={BORDER} strokeWidth="1.5" />
      <text x="492" y="116" fill={TEXT} fontSize="13" fontWeight="600">ondemand::parser</text>
      <text x="492" y="135" fill={MUTED} fontSize="11">reads in place via</text>
      <text x="492" y="154" fill={ACCENT} fontSize="11" fontFamily="SF Mono, Menlo, monospace">const uint8_t*</text>
      {/* arrow: handle -> arena */}
      <line x1="193" y1="129" x2="241" y2="129" stroke={ACCENT} strokeWidth="1.6" strokeDasharray="4 4" markerEnd="url(#ar-acc2)" />
      <text x="218" y="122" fill="#a3a3ab" fontSize="9.5" textAnchor="middle">view</text>
      {/* arrow: arena -> native */}
      <line x1="416" y1="129" x2="471" y2="129" stroke={ACCENT} strokeWidth="2.5" markerEnd="url(#ar-acc2)" />
      {/* zero-copy badge */}
      <rect x="378" y="192" width="220" height="26" rx="13" fill={ACCENT} />
      <text x="488" y="209" fill="#fff" fontSize="10.5" textAnchor="middle" fontFamily="SF Mono, Menlo, monospace">GetDirectBufferAddress() · zero copy</text>
      <line x1="488" y1="175" x2="488" y2="192" stroke={ACCENT} strokeWidth="1.5" />
      {/* avoided path */}
      <rect x="80" y="260" width="220" height="58" rx="8" fill="#f6f1f1" stroke="#c92a2a" strokeWidth="1.4" strokeDasharray="5 4" />
      <text x="190" y="286" fill="#b23636" fontSize="12" fontWeight="600" textAnchor="middle">byte[] on managed heap</text>
      <text x="190" y="303" fill="#c0726f" fontSize="10" textAnchor="middle" fontFamily="SF Mono, Menlo, monospace">GetByteArrayElements → memcpy</text>
      {/* red crossed arrow — aims toward native but stops clear of the zero-copy badge */}
      <line x1="300" y1="285" x2="387" y2="232" stroke="#c92a2a" strokeWidth="1.5" strokeDasharray="5 4" markerEnd="url(#ar-red2)" />
      <g stroke="#c92a2a" strokeWidth="3" strokeLinecap="round">
        <line x1="334" y1="249" x2="354" y2="269" /><line x1="354" y1="249" x2="334" y2="269" />
      </g>
      <text x="335" y="346" fill="#c92a2a" fontSize="11" fontWeight="600" textAnchor="middle">the copy you don't make</text>
    </svg>
  );
}

// ---- inline code style ----
const ic: React.CSSProperties = {
  fontFamily: MONO, fontSize: '0.84em',
  background: BORDER_LIGHT, padding: '0.06em 0.32em',
  borderRadius: 4, border: `1px solid ${BORDER}`, color: TEXT,
};

// ---- Main component ----
const BlogSIMD: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const body: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: '17px', lineHeight: 1.72, color: TEXT };
  const p: React.CSSProperties = { margin: '0 0 1rem' };
  const h2s: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: '23px', fontWeight: 700, letterSpacing: '-0.025em',
    lineHeight: 1.15, color: TEXT, margin: '3.2rem 0 0.8rem',
  };
  return (
    <section style={body} className="d-article">
      {/* back */}
      <button onClick={onBack} className="d-sans" style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        background: 'none', border: 'none', padding: '0 0 1.5rem', cursor: 'pointer',
        color: MUTED, fontSize: '13px',
      }}
        onMouseEnter={e => (e.currentTarget.style.color = TEXT)}
        onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
      >
        ← Blog
      </button>

      {/* kicker */}
      <div className="d-sans" style={{ fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTED }}>
        Performance Engineering · JVM × Native
      </div>

      {/* title */}
      <h1 className="d-sans" style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.1, color: TEXT, margin: '0.6rem 0 0' }}>
        Crossing the JNI boundary for 6.9× faster JSON ingestion
      </h1>

      {/* dek */}
      <p style={{ fontSize: '19px', lineHeight: 1.55, color: SUBTLE, marginTop: '1rem', marginBottom: 0 }}>
        A Java ingestion service was burning most of its CPU just turning vehicle-listing feeds into objects.
        Routing the hot path through <strong>simdjson</strong> using zero-copy{' '}
        <code style={ic}>DirectByteBuffer</code>s pushed sustained throughput past 2.9 GB/s and gave back 61% of the parse CPU.
      </p>

      {/* byline */}
      <div className="d-byline">
        <div>
          <div className="label">Author</div>
          <div className="value">Yll Kryeziu</div>
        </div>
        <div>
          <div className="label">Published</div>
          <div className="value">October 2025</div>
        </div>
      </div>

      {/* hero stats */}
      <HeroStats />

      {/* ---- 01 ---- */}
      <h2 style={h2s}>The bottleneck nobody profiles for</h2>
      <p style={p}>Our backend does something deeply unglamorous: it pulls multi-gigabyte JSON feeds of vehicle listings from a dozen partners, validates them, and writes the survivors into our catalog. For a long time the assumption was that the network or the database was the limiting factor. Then we actually profiled it under load: roughly two-thirds of on-CPU time was spent inside the JSON parser, before a single field had been validated or a single row written.</p>
      <p style={p}>That is not unusual. General-purpose Java parsers walk the input one byte at a time, branching on every structural character, allocating boxed tokens and intermediate tree nodes as they go. On a fast feed that work dominates everything downstream. A tree parser like Jackson's <code style={ic}>readTree</code> managed around <strong>480 MB/s</strong> on our payloads; streaming token parsing pushed that to about 720 MB/s but made the mapping code far uglier. Neither was going to keep a 10 Gbit feed busy without a small fleet of cores.</p>
      <Pull>When parsing is two-thirds of your CPU, "make the parser faster" stops being a micro-optimization and becomes the architecture.</Pull>
      <p style={{ margin: 0 }}>The state of the art for raw parse speed is <strong>SIMD-accelerated parsing</strong>, the approach popularized by simdjson, which uses vectorized instructions to classify many input bytes per cycle and routinely sustains several GB/s. The catch: it is a C++ library, and our service is Java. The real question was whether we could reach a native parser <em>without</em> paying the speed gain back at the language boundary.</p>

      {/* ---- 02 ---- */}
      <h2 style={h2s}>Keep Java, borrow C++ for the hot loop</h2>
      <p style={p}>The design rule was conservative: change as little as possible. All orchestration (fetching, scheduling, retries, validation, persistence) stays in Java, where it is readable and safe. Only the innermost loop, "bytes to document tree," crosses into native code through JNI. Everything the native side returns is an opaque handle that Java navigates through a thin accessor API; the C++ never touches our domain model.</p>
      <TickList items={[
        <><strong>Java owns the buffer.</strong> The feed is read into an off-heap arena that Java allocates and the GC will never relocate.</>,
        <><strong>C++ owns the parse.</strong> simdjson reads that arena in place and builds its document, exposing it as a <code style={ic}>long</code> handle.</>,
        <><strong>Nobody copies.</strong> The same physical bytes are seen by both sides. That is the entire performance thesis.</>,
      ]} />

      {/* ---- 03 ---- */}
      <h2 style={h2s}>Zero-copy is the whole game</h2>
      <p style={p}>A naïve JNI bridge hands a Java <code style={ic}>byte[]</code> to native code with <code style={ic}>GetByteArrayElements</code>. Under the hood that often <em>copies</em> the array out of the managed heap so the GC can move things freely while C++ runs. Copy a few gigabytes per second and you have spent your entire speed-up on <code style={ic}>memcpy</code>.</p>
      <p style={p}>The fix is to never put the bytes on the managed heap in the first place. A <code style={ic}>DirectByteBuffer</code> is backed by memory <em>outside</em> the GC heap. The Java object is just a handle holding an address and a capacity; the bytes live in native memory the collector can neither see nor move. We read the feed straight into that arena, and the native side asks the JVM for the raw pointer with <code style={ic}>GetDirectBufferAddress</code>. No copy, in either direction.</p>

      <FigCard
        title="One buffer, two views"
        unit="Memory topology"
        caption={<><strong>Figure 1.</strong> The feed lands in an off-heap arena. Java holds only a lightweight handle into it; the native parser receives a raw <code style={ic}>const uint8_t*</code> to the same bytes. The dashed red path (copying onto the managed heap) is exactly what <code style={ic}>DirectByteBuffer</code> lets you skip.</>}
      >
        <MemoryDiagram />
      </FigCard>

      <p style={p}>On the Java side the whole thing is about fifteen lines. Note the arena is sized with simdjson's required tail padding, and that <code style={ic}>feed.read</code> writes <em>directly</em> into off-heap memory:</p>

      <CodeBlock lang="Java" file="SimdJson.java">
        {kw('public final class')}{' '}{ty('SimdJson')}{' '}{kw('implements')}{' '}{ty('AutoCloseable')}{' {'}{'\n'}
        {'    '}{kw('static')}{' { '}{ty('System')}{'.'}{'loadLibrary'}{'('}{st('"simdjson_jni"')}{'); }'}{'\n\n'}
        {'    '}{cm('// 16 MiB arena + simdjson\'s mandatory SIMDJSON_PADDING tail.')}{'\n'}
        {'    '}{kw('private final')}{' '}{ty('ByteBuffer')}{' arena ='}{'\n'}
        {'        '}{ty('ByteBuffer')}{'.'}{'allocateDirect'}{'(('}{nm('1')}{' << '}{nm('24')}{') + '}{ty('PADDING')}{');'}{'\n\n'}
        {'    '}{cm('/** Parse bytes [0, len) of a direct buffer; returns a native')}{'\n'}
        {'    '}{cm(' *  document handle, or throws on malformed input. */')}{'\n'}
        {'    '}{kw('private static native')}{' '}{ty('long')}{' '}{fn('parse')}{'('}{ty('ByteBuffer')}{' buf, '}{ty('int')}{' len);'}{'\n\n'}
        {'    '}{kw('public')}{' '}{ty('Document')}{' '}{fn('ingest')}{'('}{ty('ReadableByteChannel')}{' feed) '}{kw('throws')}{' '}{ty('IOException')}{' {'}{'\n'}
        {'        arena.'}{fn('clear')}{'();'}{'\n'}
        {'        '}{ty('int')}{' len = feed.'}{fn('read')}{'(arena);   '}{cm('// bytes land off-heap')}{'\n'}
        {'        '}{ty('long')}{' doc = '}{fn('parse')}{'(arena, len);  '}{cm('// hand the address — no copy')}{'\n'}
        {'        '}{kw('return new')}{' '}{ty('Document')}{'(doc);'}{'\n'}
        {'    }'}{'\n'}
        {'}'}
      </CodeBlock>

      {/* ---- 04 ---- */}
      <h2 style={h2s}>The bridge, in full</h2>
      <p style={p}>The C++ half is almost anticlimactic, which is the point. <code style={ic}>GetDirectBufferAddress</code> returns a pointer straight into the JVM's off-heap memory; simdjson iterates over it in place. A thread-local parser amortizes its internal buffers across calls. Errors become Java exceptions rather than crashes, and the document is returned as an opaque handle Java will later free.</p>

      <CodeBlock lang="C++" file="simdjson_jni.cpp">
        {cm('#include <jni.h>')}{'\n'}
        {cm('#include "simdjson.h"')}{'\n'}
        {kw('using namespace')}{' simdjson;'}{'\n\n'}
        {kw('static thread_local')}{' ondemand::parser parser;   '}{cm('// reused across calls')}{'\n\n'}
        {kw('extern')}{' '}{st('"C"')}{' JNIEXPORT jlong JNICALL'}{'\n'}
        {fn('Java_com_feeds_SimdJson_parse')}{'(JNIEnv* env, jclass, jobject buf, jint len) {'}{'\n'}
        {'    '}{cm('// Raw pointer into the JVM\'s off-heap memory — zero copy.')}{'\n'}
        {'    '}{kw('auto')}{'* data = '}{kw('static_cast')}{`<`}{kw('const')}{' uint8_t*>(env->'}{fn('GetDirectBufferAddress')}{'(buf));'}{'\n'}
        {'    '}{kw('if')}{' (data == '}{kw('nullptr')}{') { '}{fn('throwParse')}{'(env, '}{st('"not a direct buffer"')}{'); '}{kw('return')}{' '}{nm('0')}{'; }'}{'\n\n'}
        {'    '}{kw('auto')}{'* doc = '}{kw('new')}{' ondemand::document();'}{'\n'}
        {'    '}{kw('auto')}{' err = parser.'}{fn('iterate')}{'(data, len, len + SIMDJSON_PADDING).'}{fn('get')}{'(*doc);'}{'\n'}
        {'    '}{kw('if')}{' (err) { '}{kw('delete')}{' doc; '}{fn('throwParse')}{'(env, '}{fn('error_message')}{'(err)); '}{kw('return')}{' '}{nm('0')}{'; }'}{'\n\n'}
        {'    '}{kw('return')}{' '}{kw('reinterpret_cast')}{`<`}{'jlong>(doc);   '}{cm('// opaque handle back to Java')}{'\n'}
        {'}'}
      </CodeBlock>

      <p style={{ margin: 0 }}>One subtlety worth flagging: simdjson's On Demand API requires <code style={ic}>SIMDJSON_PADDING</code> readable bytes past the end of the document. Allocating the direct buffer a little large keeps that guarantee without a defensive copy.</p>

      {/* ---- 05 ---- */}
      <h2 style={h2s}>From 480 MB/s to 2.95 GB/s</h2>
      <p style={p}>All numbers below come from JMH on a single pinned core. The headline is the gap between the two simdjson bars: even the version that <em>does</em> copy onto the heap is a big win, but eliminating the copy is what unlocks the last 50%.</p>

      <FigCard
        title="Single-thread parse throughput, 256 KiB listing batch"
        unit="MB/s · higher is better"
        caption={<><strong>Figure 2.</strong> simdjson over JNI with a zero-copy <code style={ic}>DirectByteBuffer</code> reaches <strong>2,950 MB/s</strong>: <strong>6.9×</strong> the Jackson tree parser and <strong>4.1×</strong> its streaming mode. The semi-transparent bar shows what you leave on the table by skipping the direct buffer.</>}
      >
        <ThroughputChart />
        <div style={{ display: 'flex', gap: '1.4rem', marginTop: 14, fontSize: '12.5px', color: MUTED }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <i style={{ width: 13, height: 13, borderRadius: 3, display: 'inline-block', background: ACCENT }} />simdjson via JNI
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <i style={{ width: 13, height: 13, borderRadius: 3, display: 'inline-block', background: BORDER }} />Java parsers
          </span>
        </div>
      </FigCard>

      {/* ---- 06 ---- */}
      <h2 style={h2s}>Where the tail goes</h2>
      <p style={p}>Throughput averages hide the part operators actually feel: the tail. Under the same workload, per-batch parse latency dropped across the board. The p99 collapsed from milliseconds to hundreds of microseconds, because the native path allocates almost nothing and never triggers a GC pause mid-parse.</p>

      <FigCard
        title="Per-batch parse latency by percentile"
        unit="microseconds · lower is better"
        caption={<><strong>Figure 3.</strong> The p99 tail shrinks from <strong>2,050 µs</strong> to <strong>295 µs</strong>, roughly <strong>7×</strong>. Just as importantly, the distance between p50 and p99 narrows. Predictability improves alongside speed.</>}
      >
        <LatencyChart />
        <div style={{ display: 'flex', gap: '1.4rem', marginTop: 8, fontSize: '12.5px', color: MUTED }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <i style={{ width: 13, height: 13, borderRadius: 3, display: 'inline-block', background: '#c3c5cd' }} />Java baseline (Jackson streaming)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <i style={{ width: 13, height: 13, borderRadius: 3, display: 'inline-block', background: ACCENT }} />simdjson via JNI (zero-copy)
          </span>
        </div>
      </FigCard>

      {/* ---- 07 ---- */}
      <h2 style={h2s}>The headroom you get back</h2>
      <p style={p}>The most useful chart for capacity planning measures CPU cost, not raw speed. Holding the feed at a fixed ~1.2 GB/s, the native path runs at about a third of the CPU the Java baseline needed, which is the difference between provisioning a fleet and provisioning a box.</p>

      <FigCard
        title="CPU utilization at a fixed ~1.2 GB/s offered load"
        unit="% of 8 vCPU · lower is better"
        caption={<><strong>Figure 4.</strong> Average utilization falls from <strong>~78%</strong> to <strong>~30%</strong>, a <strong>61%</strong> reduction for identical work. That reclaimed headroom lets the same hardware absorb partner traffic spikes without autoscaling.</>}
      >
        <CPUChart />
      </FigCard>

      {/* ---- 08 ---- */}
      <h2 style={h2s}>What the flamegraph says</h2>
      <p style={p}>Numbers convince; flamegraphs explain. Captured with async-profiler, the before/after profiles tell the whole story at a glance. In the baseline, the <span style={{ color: '#e8590c' }}>warm</span> parsing subtree swallows the frame. Afterward, parsing is a sliver and the work that is actually ours (mapping and validation) becomes the thing worth optimizing next.</p>

      <FigCard
        title="On-CPU samples, before and after"
        unit="async-profiler · icicle view"
        caption={<><strong>Figure 5.</strong> JSON parsing falls from <strong>71%</strong> of on-CPU samples to <strong>12%</strong>. The native frame is a single thin bar; everything it used to crowd out is now visible and addressable.</>}
      >
        <Flamegraph />
      </FigCard>

      {/* ---- 09 ---- */}
      <h2 style={h2s}>Making the numbers checkable</h2>
      <p style={p}>A benchmark you can't re-run is an anecdote. The whole harness is one JMH class plus a runner script that pins the dataset, the CPU governor, and the profiler so anyone can reproduce the figures on their own hardware. JMH's forking and warmup keep JIT effects honest; the differential harness parses every batch with both engines and asserts structural equality so "fast" never quietly becomes "wrong."</p>

      <CodeBlock lang="Java" file="ParseBench.java · JMH">
        {ty('@BenchmarkMode')}{'('}{ty('Mode')}{'.Throughput)'}{'\n'}
        {ty('@OutputTimeUnit')}{'('}{ty('TimeUnit')}{'.SECONDS)'}{'\n'}
        {ty('@State')}{'('}{ty('Scope')}{'.Thread)'}{'\n'}
        {ty('@Fork')}{'(value = '}{nm('3')}{', jvmArgs = {'}{st('"-Xms4g"')}{', '}{st('"-Xmx4g"')}{'}) '}{'\n'}
        {ty('@Warmup')}{'(iterations = '}{nm('5')}{', time = '}{nm('2')}{') '}{'\n'}
        {ty('@Measurement')}{'(iterations = '}{nm('10')}{', time = '}{nm('2')}{') '}{'\n'}
        {kw('public class')}{' '}{ty('ParseBench')}{' {'}{'\n\n'}
        {'    '}{ty('@Param')}{'({'}{st('"jackson-tree"')}{', '}{st('"jackson-stream"')}{', '}{st('"simdjson-jni"')}{'}) '}{ty('String')}{' engine;'}{'\n\n'}
        {'    '}{kw('private')}{' '}{ty('Ingestor')}{' ingestor;'}{'\n'}
        {'    '}{kw('private')}{' '}{ty('ByteBuffer')}{' batch;   '}{cm('// 256 KiB, pre-loaded off-heap')}{'\n\n'}
        {'    '}{ty('@Setup')}{' '}{kw('public void')}{' '}{fn('load')}{'() '}{kw('throws')}{' '}{ty('IOException')}{' {'}{'\n'}
        {'        batch    = '}{ty('Datasets')}{'.'}{'direct'}{'('}{ty('System')}{'.'}{'getProperty'}{'('}{st('"dataset"')}{'));'}{'\n'}
        {'        ingestor = '}{ty('Ingestor')}{'.'}{'of'}{'(engine);'}{'\n'}
        {'    }'}{'\n\n'}
        {'    '}{ty('@Benchmark')}{'\n'}
        {'    '}{kw('public')}{' '}{ty('long')}{' '}{fn('parseBatch')}{'() {'}{'\n'}
        {'        '}{kw('return')}{' ingestor.'}{fn('ingest')}{'(batch.'}{fn('rewind')}{'()).'}{fn('listingCount')}{'();'}{'\n'}
        {'    }'}{'\n'}
        {'}'}
      </CodeBlock>

      <CodeBlock lang="Shell" file="run-bench.sh">
        {cm('#!/usr/bin/env bash')}{'\n'}
        {'set -euo pipefail'}{'\n\n'}
        {cm('# Reproducible 8 GB slice of the public listings feed.')}{'\n'}
        {'DATA='}{st('${DATA:-./data/listings-8g.ndjson}')}{'\n'}
        {'[ -f '}{st('"$DATA"')}{' ] || curl -L '}{st('"$FEED_URL"')}{' | zstd -d -o '}{st('"$DATA"')}{'\n\n'}
        {cm('# Pin clocks so the numbers are stable across runs.')}{'\n'}
        {'sudo cpupower frequency-set -g performance\n\n'}
        {'java -jar bench.jar '}{st("'ParseBench'")}{' \\\n'}
        {'  -p dataset='}{st('"$DATA"')}{' \\\n'}
        {'  -prof gc \\\n'}
        {'  -prof '}{st('"async:output=flamegraph;event=cpu"')}{' \\\n'}
        {'  -rf json -rff results/'}{st('"$(git rev-parse --short HEAD)"')}{'.json'}
      </CodeBlock>

      {/* ---- 10 ---- */}
      <h2 style={h2s}>What it added up to</h2>
      <p style={p}>The win was not simdjson alone. Plenty of teams bind a fast parser and then hand back the speed at a copy. The real gain came from <em>boundary discipline</em>: keep the bytes off the managed heap, pass an address instead of an array, and let the native parser read in place. Everything else is bookkeeping.</p>
      <TickList items={[
        <><strong>6.9×</strong> single-thread throughput over the Java tree parser; <strong>2.95 GB/s</strong> peak.</>,
        <><strong>−61%</strong> CPU at a fixed offered load: capacity reclaimed, not just latency shaved.</>,
        <><strong>~7×</strong> lower p99, because the hot path stopped allocating and stopped triggering GC.</>,
        <><strong>Output equivalence</strong> enforced by a differential harness on every batch.</>,
      ]} />
      <p style={p}>The honest caveats: JNI adds operational weight. You now ship and debug a native artifact per platform, malformed input must become a Java exception rather than a segfault, and native document handles need disciplined lifetime management. For a path that was two-thirds of our CPU, that trade was obvious. For a parser that was 5% of yours, it would not be.</p>

    </section>
  );
};

export default BlogSIMD;
