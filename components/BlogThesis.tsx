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

// ---- shared style tokens (matches BlogSIMD) ----
const ACCENT = 'var(--color-accent)';
const BORDER = 'var(--color-border)';
const BORDER_LIGHT = 'var(--color-border-light)';
const TEXT = 'var(--color-text)';
const MUTED = 'var(--color-text-muted)';
const SUBTLE = 'var(--color-text-subtle)';
const BG = 'var(--color-bg)';
const MONO = '"IBM Plex Mono", SF Mono, Menlo, monospace';

// ---- syntax helpers (light-themed) ----
const cm = (s: string) => <span style={{ color: '#9a9aa1', fontStyle: 'italic' }}>{s}</span>;
const kw = (s: string) => <span style={{ color: '#1640c4' }}>{s}</span>;
const ty = (s: string) => <span style={{ color: '#b5430a' }}>{s}</span>;
const st = (s: string) => <span style={{ color: '#0a7d52' }}>{s}</span>;
const nm = (s: string) => <span style={{ color: '#8a4bd6' }}>{s}</span>;
const fn = (s: string) => <span style={{ fontWeight: 600 }}>{s}</span>;

// ---- References ----
const REFS: { n: number; text: React.ReactNode; url: string }[] = [
  { n: 1, text: <>Wei et al. <em>Chain-of-Thought Prompting Elicits Reasoning in Large Language Models</em>. 2022.</>, url: 'https://arxiv.org/abs/2201.11903' },
  { n: 2, text: <>DeepSeek-AI. <em>DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning</em>. 2025.</>, url: 'https://arxiv.org/abs/2501.12948' },
  { n: 3, text: <>OpenAI. <em>Learning to Reason with LLMs</em>. 2024.</>, url: 'https://openai.com/index/learning-to-reason-with-llms/' },
  { n: 4, text: <>Chen et al. <em>Do NOT Think That Much for 2+3=? On the Overthinking of o1-Like LLMs</em>. 2024.</>, url: 'https://arxiv.org/abs/2412.21187' },
  { n: 5, text: <>Lee, Che, and Peng. <em>How Well do LLMs Compress Their Own Chain-of-Thought? A Token Complexity Approach</em>. 2025.</>, url: 'https://arxiv.org/abs/2503.01141' },
  { n: 6, text: <>Madaan et al. <em>Self-Refine: Iterative Refinement with Self-Feedback</em>. 2023.</>, url: 'https://arxiv.org/abs/2303.17651' },
  { n: 7, text: <>Yang et al. <em>Qwen3 Technical Report</em>. 2025.</>, url: 'https://arxiv.org/abs/2505.09388' },
  { n: 8, text: <>Open Thoughts Team. <em>OpenThoughts-114k</em>. Hugging Face dataset. 2025.</>, url: 'https://huggingface.co/datasets/open-thoughts/OpenThoughts-114k' },
  { n: 9, text: <>Agarwal et al. <em>On-Policy Distillation of Language Models: Learning from Self-Generated Mistakes</em>. 2023.</>, url: 'https://arxiv.org/abs/2306.13649' },
  { n: 10, text: <>Lu and Thinking Machines Lab. <em>On-Policy Distillation</em>. 2025.</>, url: 'https://thinkingmachines.ai/blog/on-policy-distillation' },
  { n: 11, text: <>Hinton, Vinyals, and Dean. <em>Distilling the Knowledge in a Neural Network</em>. 2015.</>, url: 'https://arxiv.org/abs/1503.02531' },
];

function Cite({ ids }: { ids: number[] }) {
  return (
    <sup style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
      {ids.map((id, i) => {
        const ref = REFS.find(r => r.n === id);
        return (
          <React.Fragment key={id}>
            {i > 0 && <span style={{ color: MUTED }}>,</span>}
            <a href={ref?.url} target="_blank" rel="noopener noreferrer"
              style={{ color: ACCENT, textDecoration: 'none', padding: '0 1px' }}>{id}</a>
          </React.Fragment>
        );
      })}
    </sup>
  );
}

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

// ---- Equation block ----
function Eq({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: BORDER_LIGHT,
      border: `1px solid ${BORDER}`,
      borderLeft: `3px solid ${ACCENT}`,
      borderRadius: '0 10px 10px 0',
      padding: '1rem 1.2rem',
      margin: '1.3rem 0',
      fontFamily: MONO,
      fontSize: '13px',
      lineHeight: 1.9,
      color: TEXT,
      overflowX: 'auto',
    }}>{children}</div>
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

// ---- Hero stat strip ----
function HeroStats() {
  const stats = [
    { num: '78–83', unit: '%', lbl: 'reasoning tokens cut by self-rewriting', accent: true },
    { num: '+1 to +6', unit: 'pts', lbl: 'accuracy, preserved or improved', accent: false },
    { num: '0', unit: '', lbl: 'reward models or difficulty labels', accent: false },
    { num: '28–46', unit: '%', lbl: 'tokens cut after distilling it in', accent: false },
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
            fontSize: '30px', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.04em',
            color: s.accent ? ACCENT : TEXT,
          }}>
            {s.num}<span style={{ fontSize: '15px', fontWeight: 400, color: MUTED, letterSpacing: 0 }}>{s.unit}</span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: '10.5px', letterSpacing: '0.03em', color: MUTED, marginTop: '0.7rem', lineHeight: 1.35 }}>{s.lbl}</div>
        </div>
      ))}
    </div>
  );
}

// ---- Adaptive rewrite behavior figure ----
function AdaptiveFigure() {
  const ref = useScrollAnimate((el) => {
    el.querySelectorAll<HTMLElement>('[data-w]').forEach(b => { b.style.width = b.dataset.w + '%'; });
  });
  const Row = ({ label, w, accent, dashed }: { label: string; w: number; accent?: boolean; dashed?: boolean }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <span style={{ fontFamily: MONO, fontSize: '10.5px', color: MUTED, textAlign: 'right', letterSpacing: '0.02em' }}>{label}</span>
      <div style={{ position: 'relative', height: 18 }}>
        <div data-w={w} style={{
          height: '100%', width: 0, borderRadius: 4,
          background: accent ? ACCENT : dashed ? 'transparent' : BORDER,
          border: dashed ? `1.5px dashed ${ACCENT}` : 'none',
          transition: 'width 900ms cubic-bezier(.2,.7,.2,1)',
        }} />
      </div>
    </div>
  );
  return (
    <div ref={ref} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.8rem' }}>
      <div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: TEXT, marginBottom: 4 }}>Easy problem</div>
        <div style={{ fontFamily: MONO, fontSize: '11px', color: ACCENT, marginBottom: 14 }}>overthinking → trim</div>
        <Row label="original" w={100} />
        <Row label="rewritten" w={22} accent />
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: TEXT, marginBottom: 4 }}>Hard problem</div>
        <div style={{ fontFamily: MONO, fontSize: '11px', color: ACCENT, marginBottom: 14 }}>underthinking → expand</div>
        <Row label="original" w={42} />
        <Row label="rewritten" w={78} accent />
      </div>
    </div>
  );
}

// ---- On-policy self-distillation loop diagram ----
function LoopDiagram() {
  return (
    <svg viewBox="0 0 660 320" style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <marker id="th-arr-acc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#C9684A" />
        </marker>
        <marker id="th-arr-mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#a3a3ab" />
        </marker>
      </defs>

      {/* offline static trace box */}
      <rect x="220" y="14" width="220" height="58" rx="9" fill="rgba(201,104,74,0.06)" stroke={ACCENT} strokeWidth="1.4" strokeDasharray="5 4" />
      <text x="330" y="38" fill={ACCENT} fontSize="12" fontWeight="600" textAnchor="middle" fontFamily="var(--font-sans)">Static trace t_static(x)</text>
      <text x="330" y="58" fill={MUTED} fontSize="10.5" textAnchor="middle" fontFamily="SF Mono, Menlo, monospace">precomputed once · offline · frozen</text>
      {/* feeds the teacher */}
      <line x1="440" y1="58" x2="500" y2="118" stroke={ACCENT} strokeWidth="1.4" strokeDasharray="4 4" markerEnd="url(#th-arr-acc)" />

      {/* student box */}
      <rect x="34" y="120" width="220" height="92" rx="11" fill={BG} stroke={BORDER} strokeWidth="1.5" />
      <text x="144" y="150" fill={TEXT} fontSize="15" fontWeight="700" textAnchor="middle" fontFamily="var(--font-sans)">Student π_θ</text>
      <text x="144" y="172" fill={MUTED} fontSize="11" textAnchor="middle" fontFamily="SF Mono, Menlo, monospace">samples live rollout</text>
      <text x="144" y="190" fill={MUTED} fontSize="11" textAnchor="middle" fontFamily="SF Mono, Menlo, monospace">y ~ π_θ(· | problem)</text>
      <text x="144" y="206" fill={ACCENT} fontSize="10" textAnchor="middle" fontFamily="SF Mono, Menlo, monospace">updated every step</text>

      {/* teacher box */}
      <rect x="406" y="120" width="220" height="92" rx="11" fill={BG} stroke={BORDER} strokeWidth="1.5" />
      <text x="516" y="148" fill={TEXT} fontSize="15" fontWeight="700" textAnchor="middle" fontFamily="var(--font-sans)">Teacher π_teach</text>
      <text x="516" y="168" fill={MUTED} fontSize="10.5" textAnchor="middle" fontFamily="SF Mono, Menlo, monospace">same weights, new prompt:</text>
      <text x="516" y="184" fill={MUTED} fontSize="10.5" textAnchor="middle" fontFamily="SF Mono, Menlo, monospace">problem + static trace</text>
      <text x="516" y="200" fill={ACCENT} fontSize="10.5" textAnchor="middle" fontFamily="SF Mono, Menlo, monospace">+ rewrite instruction · frozen</text>

      {/* top arrow: student -> teacher (score) */}
      <path d="M254 142 C 320 110, 360 110, 406 142" fill="none" stroke={MUTED} strokeWidth="1.6" markerEnd="url(#th-arr-mut)" />
      <text x="330" y="108" fill={MUTED} fontSize="10.5" textAnchor="middle" fontFamily="SF Mono, Menlo, monospace">score y, token by token</text>

      {/* bottom arrow: teacher -> student (reverse KL) */}
      <path d="M406 190 C 360 224, 320 224, 254 190" fill="none" stroke={ACCENT} strokeWidth="2" markerEnd="url(#th-arr-acc)" />
      <text x="330" y="238" fill={ACCENT} fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="SF Mono, Menlo, monospace">reverse-KL: pull π_θ toward π_teach</text>

      {/* dense supervision note */}
      <text x="330" y="288" fill={SUBTLE} fontSize="11.5" textAnchor="middle" fontFamily="var(--font-sans)">
        Dense, token-level signal on the prefixes the student actually visits —
      </text>
      <text x="330" y="306" fill={SUBTLE} fontSize="11.5" textAnchor="middle" fontFamily="var(--font-sans)">
        no ground-truth answers, no separate reward model.
      </text>
    </svg>
  );
}

// ---- Benchmark chart: original vs rewritten tokens per model ----
function BenchmarkChart() {
  const ref = useScrollAnimate((el) => {
    el.querySelectorAll<HTMLElement>('[data-w]').forEach(b => { b.style.width = b.dataset.w + '%'; });
  });
  // tokens normalized to the largest original (7638)
  const rows = [
    { model: 'Qwen3-1.7B', orig: 7638, rew: 1405, dAcc: '+4.0', red: '−81.6%' },
    { model: 'Qwen3-4B', orig: 7355, rew: 1250, dAcc: '+5.3', red: '−83.0%' },
    { model: 'Qwen3-8B', orig: 7579, rew: 1421, dAcc: '+6.0', red: '−81.3%' },
    { model: 'Qwen3-14B', orig: 6233, rew: 1340, dAcc: '+1.0', red: '−78.5%' },
  ];
  const max = 7638;
  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
      {rows.map((r, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: TEXT }}>{r.model}</span>
            <span style={{ fontFamily: MONO, fontSize: '11px', color: MUTED }}>
              {r.red} tokens · <span style={{ color: ACCENT, fontWeight: 600 }}>{r.dAcc} acc</span>
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', alignItems: 'center', gap: 10, marginBottom: 5 }}>
            <span style={{ fontFamily: MONO, fontSize: '10px', color: MUTED, textAlign: 'right' }}>original</span>
            <div style={{ position: 'relative', height: 20 }}>
              <div data-w={(r.orig / max) * 100} style={{
                height: '100%', width: 0, borderRadius: '0 4px 4px 0', background: BORDER,
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, minWidth: 40,
                transition: 'width 900ms cubic-bezier(.2,.7,.2,1)',
              }}>
                <span style={{ fontFamily: MONO, fontSize: '11px', color: SUBTLE }}>{r.orig.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: '10px', color: MUTED, textAlign: 'right' }}>rewritten</span>
            <div style={{ position: 'relative', height: 20 }}>
              <div data-w={(r.rew / max) * 100} style={{
                height: '100%', width: 0, borderRadius: '0 4px 4px 0', background: ACCENT,
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, minWidth: 40,
                transition: 'width 900ms cubic-bezier(.2,.7,.2,1)',
              }}>
                <span style={{ fontFamily: MONO, fontSize: '11px', color: '#fff' }}>{r.rew.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Scaling chart: accuracy gap narrows with model size ----
function ScalingChart() {
  const ref = useScrollAnimate((el) => {
    el.querySelectorAll<SVGPathElement>('.sc-path').forEach(p => { p.style.strokeDashoffset = '0'; });
    el.querySelectorAll<SVGElement>('.sc-dot').forEach(d => { d.style.opacity = '1'; });
  });
  // x positions for 1.7B, 4B, 8B, 14B
  const xs = [90, 270, 450, 600];
  // y axis: 0 pts at y=50, -15 pts at y=250  => y = 50 + (-drop)*(200/15)
  const yFor = (drop: number) => 50 + Math.abs(drop) * (200 / 15);
  const math = [-5.6, -2.7, -1.9, -0.9];
  const aime = [-13.5, -12.0, -10.5, -8.3];
  const pts = (arr: number[]) => arr.map((d, i) => `${xs[i]},${yFor(d)}`).join(' ');
  return (
    <div ref={ref}>
      <svg viewBox="0 0 660 300" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
        {/* gridlines */}
        <g stroke={BORDER} strokeWidth="1">
          <line x1="60" y1="50" x2="630" y2="50" />
          <line x1="60" y1="116.7" x2="630" y2="116.7" />
          <line x1="60" y1="183.3" x2="630" y2="183.3" />
          <line x1="60" y1="250" x2="630" y2="250" />
        </g>
        {/* y labels (percentage points of accuracy lost) */}
        <g fill="#a3a3ab" fontSize="11" fontFamily="SF Mono, Menlo, monospace" textAnchor="end">
          <text x="52" y="54">0</text>
          <text x="52" y="120.7">−5</text>
          <text x="52" y="187.3">−10</text>
          <text x="52" y="254">−15</text>
        </g>
        {/* x labels */}
        <g fill={TEXT} fontSize="12" fontWeight="600" fontFamily="SF Mono, Menlo, monospace" textAnchor="middle">
          <text x="90" y="278">1.7B</text>
          <text x="270" y="278">4B</text>
          <text x="450" y="278">8B</text>
          <text x="600" y="278">14B</text>
        </g>
        {/* AIME line */}
        <polyline className="sc-path" fill="none" stroke={BORDER} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts(aime)} />
        {/* MATH line */}
        <polyline className="sc-path" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts(math)} />
        <g className="sc-dot" style={{ opacity: 1 }}>
          {aime.map((d, i) => <circle key={'a' + i} cx={xs[i]} cy={yFor(d)} r="4" fill={BORDER} />)}
          {math.map((d, i) => <circle key={'m' + i} cx={xs[i]} cy={yFor(d)} r="4" fill={ACCENT} />)}
          {/* endpoint labels */}
          <text x={xs[0]} y={yFor(aime[0]) + 20} fill={MUTED} fontSize="11" textAnchor="middle" fontFamily="SF Mono, Menlo, monospace">−13.5</text>
          <text x={xs[3]} y={yFor(aime[3]) + 20} fill={MUTED} fontSize="11" textAnchor="middle" fontFamily="SF Mono, Menlo, monospace">−8.3</text>
          <text x={xs[0]} y={yFor(math[0]) - 12} fill={ACCENT} fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="SF Mono, Menlo, monospace">−5.6</text>
          <text x={xs[3]} y={yFor(math[3]) - 12} fill={ACCENT} fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="SF Mono, Menlo, monospace">−0.9</text>
        </g>
      </svg>
      <div style={{ display: 'flex', gap: '1.4rem', marginTop: 10, fontSize: '12.5px', color: MUTED }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i style={{ width: 13, height: 13, borderRadius: 3, display: 'inline-block', background: ACCENT }} />MATH500 (easier)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i style={{ width: 13, height: 13, borderRadius: 3, display: 'inline-block', background: BORDER }} />AIME2025 (harder)
        </span>
      </div>
    </div>
  );
}

// ---- inline code style ----
const ic: React.CSSProperties = {
  fontFamily: MONO, fontSize: '0.84em',
  background: BORDER_LIGHT, padding: '0.06em 0.32em',
  borderRadius: 4, border: `1px solid ${BORDER}`, color: TEXT,
};

// ---- Main component ----
const BlogThesis: React.FC<{ onBack: () => void }> = ({ onBack }) => {
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
        Machine Learning · LLM Reasoning · Distillation
      </div>

      {/* title */}
      <h1 className="d-sans" style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.1, color: TEXT, margin: '0.6rem 0 0' }}>
        On-policy self-distillation for adaptive compute
      </h1>

      {/* dek */}
      <p style={{ fontSize: '19px', lineHeight: 1.55, color: SUBTLE, marginTop: '1rem', marginBottom: 0 }}>
        Reasoning models overthink: they burn thousands of tokens on easy problems for no extra accuracy. I let a model
        rewrite its own reasoning to a length that fits the problem, then distill that behavior back in — using
        only the model itself, with <strong>no reward model and no difficulty labels</strong>.
      </p>

      {/* byline */}
      <div className="d-byline">
        <div>
          <div className="label">Author</div>
          <div className="value">Yll Kryeziu</div>
        </div>
        <div>
          <div className="label">Published</div>
          <div className="value">March 2026</div>
        </div>
        <div>
          <div className="label">Code</div>
          <div className="value">
            <a href="https://github.com/yllkryeziu/rewritebench" target="_blank" rel="noopener noreferrer">rewritebench</a>
            {' · '}
            <a href="https://github.com/yllkryeziu/nvidia-rl" target="_blank" rel="noopener noreferrer">nvidia-rl</a>
          </div>
        </div>
      </div>

      {/* hero stats */}
      <HeroStats />

      <p style={{ ...p, marginTop: '2.2rem', fontSize: '14px', color: MUTED }}>
        This post distills my bachelor's thesis at TUM, supervised by Prof. Dr. Stefan Bauer.
      </p>

      {/* ---- 01 ---- */}
      <h2 style={h2s}>The compute you spend where it isn't needed</h2>
      <p style={p}>
        Reasoning models earned their reputation by <em>thinking longer</em>. Train a model with RL to produce long
        chains of thought before answering, and accuracy on hard benchmarks climbs with the number of tokens it is
        allowed to spend at inference time.<Cite ids={[1, 2, 3]} /> The flip side is less flattering: the same models
        keep thinking long after the problem has been solved. They allocate a wall of reasoning to <code style={ic}>2+3</code>,
        re-derive the obvious, and second-guess correct answers — a pattern documented as <em>overthinking</em>.<Cite ids={[4]} />
      </p>
      <p style={p}>
        Every extra token costs latency and money without buying accuracy. So you want the opposite of a fixed budget:
        spend less on easy problems, keep the budget for hard ones. The catch is that &ldquo;how hard is this problem&rdquo;
        is exactly the thing you don't know in advance.
      </p>
      <Pull>The goal isn't shorter reasoning. It's reasoning that's the right length for the problem in front of it.</Pull>
      <p style={p}>
        Plenty of methods chase this, but most lean on something external — a token budget conditioned on an estimated
        difficulty, a verifier, a reward model, or preference pairs curated by a stronger teacher. Those signals are
        powerful, but they're not always available, and they pull you out of the single-model setting.<Cite ids={[5]} /> I
        wanted to know how far you can get <strong>self-contained</strong>: one frozen model, the problem, and the
        model's own reasoning trace. Nothing else.
      </p>

      {/* ---- 02 ---- */}
      <h2 style={h2s}>Let the model rewrite itself</h2>
      <p style={p}>
        The first idea is self-refinement.<Cite ids={[6]} /> Take the model's own reasoning trace and ask the same model
        to rewrite it — not to a fixed length, but to a length that matches how hard the problem actually was. If the
        trace overthinks an easy problem, trim it. If it underthinks a hard one, deepen it. Crucially, the rewrite must
        stay <em>in distribution</em>: it should read like a normal solution, not like edit notes or meta-commentary
        about the rewrite, because we later want to use it as a training signal.
      </p>

      <FigCard
        title="Same operator, opposite directions"
        unit="rewrite behavior"
        caption={<><strong>Figure 1.</strong> The rewrite is adaptive by construction. The instruction asks the model to first
          judge whether the original trace was overthinking or underthinking <em>for its true difficulty</em>, then trim or
          expand accordingly — preserving the original voice, productive tangents, and self-corrections.</>}
      >
        <AdaptiveFigure />
      </FigCard>

      <p style={p}>
        The whole mechanism is a prompt. It tells the model to act as a careful reader of its own monologue, keep the
        voice intact, fix genuine errors, and delete only redundancy that leads nowhere — and to compress
        <em>only</em> when the problem is clearly overthought for its difficulty.
      </p>

      <CodeBlock lang="Prompt" file="rewrite_instruction.txt (excerpt)">
        {cm('### TASK')}{'\n'}
        {'You will receive a '}{ty('problem statement')}{' and a '}{ty('reasoning trace')}{'.'}{'\n'}
        {'Ask yourself: was this problem easy, moderate, or hard for a'}{'\n'}
        {'careful human thinker? Then decide whether the original reasoning'}{'\n'}
        {'is '}{st('underthinking')}{' or '}{st('overthinking')}{'.'}{'\n\n'}
        {'- easy + overthinking  → '}{fn('trim')}{' excess, keep the voice'}{'\n'}
        {'- hard + underthinking → '}{fn('deepen')}{' it, add missing exploration'}{'\n\n'}
        {cm('### THE ORIGINAL STYLE AND TONE MUST SURVIVE')}{'\n'}
        {'Keep productive tangents and self-corrections. They are features.'}{'\n'}
        {'DELETE only genuine redundancy that contributes nothing.'}{'\n'}
        {'DO NOT summarize or compress unless the problem is clearly'}{'\n'}
        {'overthought for its difficulty.'}
      </CodeBlock>

      <p style={p}>
        It works, and not by a little. Across Qwen3 models from 1.7B to 14B<Cite ids={[7]} /> on a math subset of
        OpenThoughts-114k,<Cite ids={[8]} /> self-refinement strips <strong>78–83%</strong> of the reasoning trace while
        final-answer accuracy goes <em>up</em>, by +1 to +6 points. The load-bearing steps survive; what gets cut is the
        redundancy. Self-refinement is a strong test-time compression operator — and because the rewrites stay in
        distribution, they're clean enough to teach <em>back</em> to the model.
      </p>

      <FigCard
        title="Original vs. rewritten reasoning length"
        unit="avg tokens per generation · lower is better"
        caption={<><strong>Figure 2.</strong> Self-refinement collapses each trace from roughly 6–8k tokens down to 1.2–1.4k —
          a <strong>78–83%</strong> cut — while final-answer accuracy is preserved or improved across every model size.</>}
      >
        <BenchmarkChart />
      </FigCard>

      {/* ---- 04 ---- */}
      <h2 style={h2s}>Distilling the behavior back in</h2>
      <p style={p}>
        Rewriting at inference time means running the model twice. The point of the thesis is to fold the behavior into
        the model's <em>default</em> distribution, so it just reasons concisely on the first pass. The mechanism is
        token-level <strong>on-policy distillation</strong>: instead of training on a fixed dataset of rewrites, the
        student is supervised on the tokens it actually generates, which sidesteps the train–inference mismatch that
        plagues offline imitation.<Cite ids={[9, 10]} />
      </p>
      <p style={p}>
        The twist is that the teacher and student are the <em>same model</em>. They differ only in their prompt. The
        student sees the bare problem. The teacher sees the problem, a frozen static trace of the student's own earlier
        attempt, and the rewrite instruction — so its next-token distribution is shifted toward the concise,
        compute-optimal continuation. We never sample an explicit rewrite from the teacher; we only use it as a
        <em>scorer</em>.
      </p>

      <FigCard
        title="The on-policy rewrite-distillation loop"
        unit="same weights, two prompts"
        caption={<><strong>Figure 3.</strong> The student samples a live rollout; the teacher — identical weights under a
          rewrite-conditioned prefix — scores those exact tokens. Because the teacher conditions on context the student
          never sees at inference time, this is a form of context distillation: a context-conditioned teacher pressed into
          a context-free student.</>}
      >
        <LoopDiagram />
      </FigCard>

      <p style={p}>
        Concretely: for a live student completion <code style={ic}>y</code>, we evaluate the teacher's log-probabilities
        on those same tokens under its rewrite-conditioned prefix, and update the student to reduce the reverse-KL
        divergence between the two next-token distributions along the prefixes the student visits.
      </p>

      <Eq>
        log π_teach(y | rewrite-prefix) = Σₜ log π_teach(yₜ | rewrite-prefix, y₍&lt;ₜ₎)<br /><br />
        <span style={{ color: ACCENT, fontWeight: 600 }}>L(θ)</span>{' = 𝔼'}<sub>y~π_θ</sub>{' [ Σₜ D'}<sub>KL</sub>{'( π_θ(· | x, y₍<ₜ₎) ‖ π_teach(· | x, y₍<ₜ₎) ) ]'}
      </Eq>

      <p style={p}>
        Reverse KL is mode-seeking, which is what we want here: a trace can be rewritten many valid ways, and we'd rather
        the student commit to one consistent concise style than smear probability across all of them. The teacher is the
        same model frozen at its initial weights; the static trace is precomputed once, offline, per instance. The
        training loop then alternates four steps:
      </p>

      <CodeBlock lang="Python" file="train_loop.py (sketch)">
        {cm('# A. Offline, once: a frozen per-instance context')}{'\n'}
        {'t_static[x] = extract_trace(student0.'}{fn('sample')}{'(x))'}{'\n\n'}
        {kw('for')}{' x '}{kw('in')}{' batch:'}{'\n'}
        {'    '}{cm('# B. Live, on-policy rollout from the *current* student')}{'\n'}
        {'    y = student.'}{fn('sample')}{'(student_prompt(x))'}{'\n\n'}
        {'    '}{cm('# C. Implicit rewrite: teacher scores the live tokens')}{'\n'}
        {'    prefix = rewrite_prompt(x, t_static[x])'}{'\n'}
        {'    logp_t = teacher.'}{fn('score')}{'(prefix, y)        '}{cm('# one forward pass')}{'\n\n'}
        {'    '}{cm('# D. Update the student via reverse-KL distillation')}{'\n'}
        {'    loss = '}{fn('reverse_kl')}{'(student(x, y), logp_t)'}{'\n'}
        {'    loss.'}{fn('backward')}{'(); opt.'}{fn('step')}{'()'}
      </CodeBlock>

      <p style={p}>
        Because the teacher grades the student's own prefixes, every token position gets a directional grade — dense
        supervision, no sparse sequence-level reward, and no ground-truth answer anywhere in the loop.<Cite ids={[11]} />
      </p>

      {/* ---- 05 ---- */}
      <h2 style={h2s}>Folding conciseness into the weights</h2>
      <p style={p}>
        Trained across all four Qwen3 sizes and evaluated on MATH500 and AIME2025, the distilled checkpoints generate
        <strong> 28–46% fewer tokens</strong> by default. The model reasons concisely on the first pass — no second
        rewrite, no inference-time overhead. The behavior moved into the weights.
      </p>

      <FigCard
        title="Accuracy delta after distillation, by model size"
        unit="percentage points · closer to 0 is better"
        caption={<><strong>Figure 4.</strong> The accuracy gap closes with scale on both benchmarks. On MATH500 it tightens to
          just <strong>−0.9 points at 14B</strong>; on the harder AIME2025 it tightens from −13.5 to −8.3. Both lines bend toward
          zero as the model grows.</>}
      >
        <ScalingChart />
      </FigCard>

      <p style={p}>
        Scale is the lever. As the underlying model gets stronger, the rewrite-conditioned teacher delivers sharper
        token-level guidance, and the student internalizes conciseness while keeping the robustness hard problems demand.
        Stronger models compress harder <em>and</em> hold their accuracy — exactly the trajectory you want.
      </p>

      {/* ---- 06 ---- */}
      <h2 style={h2s}>What it adds up to</h2>
      <p style={p}>
        Two results stand on their own. First, a model can rewrite its own reasoning to the right length with no external
        signal, cutting ~80% of the trace while improving correctness — self-refinement is a powerful, self-contained
        test-time compression operator. Second, that behavior is distillable: token-level on-policy self-distillation
        bakes the conciseness into the model's default policy, and the trade tilts further in your favor as models scale.
      </p>
      <TickList items={[
        <><strong>78–83%</strong> trace-token reduction from self-rewriting, with accuracy <strong>+1 to +6</strong> points.</>,
        <><strong>28–46%</strong> fewer tokens after distillation; the behavior survives the transfer into the weights.</>,
        <><strong>Self-contained</strong> end to end — one frozen model as its own teacher, no reward model, no difficulty labels, no ground-truth answers in the loop.</>,
        <><strong>Scale helps.</strong> The downstream accuracy gap narrows with model size on both easy and hard benchmarks.</>,
      ]} />

      {/* ---- references ---- */}
      <h2 style={h2s}>References</h2>
      <ol style={{ margin: '1rem 0 0', padding: 0, listStyle: 'none', counterReset: 'ref' }}>
        {REFS.map(r => (
          <li key={r.n} style={{
            display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10,
            fontSize: '13.5px', color: SUBTLE, lineHeight: 1.5, marginBottom: '0.7rem',
          }}>
            <span style={{ fontFamily: MONO, fontSize: '11px', color: MUTED, paddingTop: 2 }}>[{r.n}]</span>
            <span>
              {r.text}{' '}
              <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'none', wordBreak: 'break-all' }}>
                {r.url.replace(/^https?:\/\//, '')}
              </a>
            </span>
          </li>
        ))}
      </ol>

    </section>
  );
};

export default BlogThesis;
