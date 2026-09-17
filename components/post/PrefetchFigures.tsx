import React from 'react';

const TEXT = 'var(--color-text)';
const MUTED = 'var(--color-text-muted)';
const SUBTLE = 'var(--color-text-subtle)';
const BORDER = 'var(--color-border)';
const BG = 'var(--color-bg)';
const SOFT = 'var(--color-border-light)';
const ACCENT = 'var(--series-2)';
const COOL = 'var(--series-1)';

const Node: React.FC<{
  x: number; y: number; w: number; h: number;
  title: string; sub?: string; tone?: 'plain' | 'accent';
}> = ({ x, y, w, h, title, sub, tone = 'plain' }) => (
  <g>
    <rect
      x={x} y={y} width={w} height={h} rx="2"
      fill={tone === 'accent' ? 'color-mix(in srgb, var(--series-2) 8%, transparent)' : BG}
      stroke={tone === 'accent' ? ACCENT : BORDER}
      strokeWidth="1.4"
    />
    <text x={x + w / 2} y={sub ? y + h / 2 - 3 : y + h / 2 + 4} textAnchor="middle" fontFamily="var(--font-sans)" fontSize="12.5" fontWeight="650" fill={TEXT}>
      {title}
    </text>
    {sub && (
      <text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill={MUTED}>
        {sub}
      </text>
    )}
  </g>
);

export const SystemFigure: React.FC = () => (
  <svg viewBox="0 0 640 262" role="img" aria-label="Gateway, cache and shared origin capacity">
    <defs>
      <marker id="pf-a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10z" fill={MUTED} />
      </marker>
      <marker id="pf-b" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10z" fill={ACCENT} />
      </marker>
    </defs>

    <Node x={8} y={94} w={106} h={52} title="session" sub="replayed trace" />
    <Node x={158} y={94} w={106} h={52} title="cache" sub="LRU + TTL" />
    <Node x={158} y={12} w={106} h={52} title="predictor" sub="JAX · p(next)" tone="accent" />
    <Node x={306} y={12} w={118} h={52} title="policy" sub="gain > α · cost" tone="accent" />
    <Node x={466} y={94} w={166} h={52} title="origin" sub="c workers · queue" />

    <line x1="116" y1="120" x2="154" y2="120" stroke={MUTED} strokeWidth="1.4" markerEnd="url(#pf-a)" />
    <line x1="211" y1="92" x2="211" y2="68" stroke={MUTED} strokeWidth="1.2" markerEnd="url(#pf-a)" />
    <line x1="266" y1="38" x2="302" y2="38" stroke={ACCENT} strokeWidth="1.4" markerEnd="url(#pf-b)" />

    <path d="M424 38 L500 38 L500 90" fill="none" stroke={ACCENT} strokeWidth="1.6" markerEnd="url(#pf-b)" />
    <text x={470} y={30} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill={ACCENT}>speculative</text>

    <path d="M264 120 L462 120" fill="none" stroke={MUTED} strokeWidth="1.6" markerEnd="url(#pf-a)" />
    <text x={363} y={112} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill={MUTED}>miss</text>

    <path d="M211 148 L211 188 L61 188 L61 150" fill="none" stroke={COOL} strokeWidth="1.4" markerEnd="url(#pf-a)" />
    <text x={136} y={202} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill={COOL}>hit · served immediately</text>

    <path d="M549 148 L549 232 L61 232 L61 152" fill="none" stroke={MUTED} strokeWidth="1.2" strokeDasharray="4 4" markerEnd="url(#pf-a)" />
    <text x={305} y={246} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill={MUTED}>response · also fills the cache</text>

  </svg>
);

export const DecisionFigure: React.FC<{
  latencySaved: number;
  costUnit: number;
  wastedPenalty: number;
  alpha: number;
  floor: number;
}> = ({ latencySaved, costUnit, wastedPenalty, alpha, floor }) => {
  const width = 640;
  const height = 250;
  const left = 56;
  const right = 118;
  const top = 16;
  const bottom = 44;
  const plotW = width - left - right;
  const plotH = height - top - bottom;

  const gain = (p: number) => p * latencySaved;
  const cost = (p: number) => alpha * (costUnit + wastedPenalty * (1 - p));
  const yMax = Math.max(gain(1), cost(0)) * 1.12;
  const px = (p: number) => left + p * plotW;
  const py = (v: number) => top + plotH - (v / yMax) * plotH;

  const samples = Array.from({ length: 41 }, (_, i) => i / 40);
  const crossing = samples.find(p => gain(p) >= cost(p)) ?? 1;
  const decision = Math.max(crossing, floor);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Expected gain versus expected cost">
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <text key={t} x={px(t)} y={height - bottom + 22} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10.5" fill={MUTED}>
          {t.toFixed(2)}
        </text>
      ))}
      <line x1={left} y1={top + plotH} x2={width - right} y2={top + plotH} stroke={BORDER} strokeWidth="1" />
      <text x={left + plotW / 2} y={height - 6} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10.5" fill={MUTED}>
        p(next request = this resource)
      </text>

      <rect x={left} y={top} width={px(decision) - left} height={plotH} fill={SOFT} />
      <line x1={px(decision)} y1={top} x2={px(decision)} y2={top + plotH} stroke={TEXT} strokeWidth="1.2" strokeDasharray="4 3" />
      <text x={px(decision) + 8} y={top + 14} fontFamily="var(--font-mono)" fontSize="10.5" fill={TEXT}>
        fire above {decision.toFixed(2)}
      </text>

      <path d={samples.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p)},${py(gain(p))}`).join(' ')} fill="none" stroke={COOL} strokeWidth="1.75" />
      <path d={samples.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p)},${py(cost(p))}`).join(' ')} fill="none" stroke={ACCENT} strokeWidth="1.75" />

      <text x={px(1) + 10} y={py(gain(1)) + 4} fontFamily="var(--font-sans)" fontSize="11.5" fill={SUBTLE}>expected gain</text>
      <text x={px(1) + 10} y={py(cost(1)) + 4} fontFamily="var(--font-sans)" fontSize="11.5" fill={SUBTLE}>α × expected cost</text>
    </svg>
  );
};

export interface ReliabilityBin {
  confidence: number;
  accuracy: number;
  count: number;
}

export const ReliabilityFigure: React.FC<{
  series: { label: string; bins: ReliabilityBin[]; color: string }[];
}> = ({ series }) => {
  const size = 300;
  const pad = 44;
  const plot = size - pad - 14;
  const px = (v: number) => pad + v * plot;
  const py = (v: number) => size - pad - v * plot;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: 300, maxWidth: '100%', height: 'auto' }} role="img" aria-label="Reliability diagram">
        {ticks.map(t => (
          <g key={t}>
            <line x1={px(t)} y1={py(0)} x2={px(t)} y2={py(1)} stroke={BORDER} strokeWidth="1" />
            <line x1={px(0)} y1={py(t)} x2={px(1)} y2={py(t)} stroke={BORDER} strokeWidth="1" />
            <text x={px(t)} y={size - pad + 16} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9.5" fill={MUTED}>{t}</text>
            <text x={pad - 8} y={py(t) + 3.5} textAnchor="end" fontFamily="var(--font-mono)" fontSize="9.5" fill={MUTED}>{t}</text>
          </g>
        ))}
        <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(1)} stroke={MUTED} strokeWidth="1.4" strokeDasharray="4 4" />
        {series.map(s => (
          <path
            key={s.label}
            d={s.bins.map((b, i) => `${i === 0 ? 'M' : 'L'}${px(b.confidence)},${py(b.accuracy)}`).join(' ')}
            fill="none"
            stroke={s.color}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        ))}
        {series.map(s =>
          s.bins.map((b, i) => (
            <circle key={`${s.label}-${i}`} cx={px(b.confidence)} cy={py(b.accuracy)} r="3"
              fill={s.color} />
          ))
        )}
        <text x={px(0.5)} y={size - 6} textAnchor="middle" fontFamily="var(--font-sans)" fontSize="11" fill={SUBTLE}>predicted probability</text>
        <text x={12} y={py(0.5)} textAnchor="middle" fontFamily="var(--font-sans)" fontSize="11" fill={SUBTLE}
          transform={`rotate(-90 12 ${py(0.5)})`}>observed frequency</text>
      </svg>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div className="chart-legend" style={{ flexDirection: 'column', gap: '0.5rem', margin: 0 }}>
          {series.map(s => (
            <span key={s.label}><i style={{ background: s.color }} />{s.label}</span>
          ))}
          <span style={{ color: MUTED }}>
            <i style={{ background: 'transparent', borderTop: `2px dashed ${MUTED}`, height: 0, borderRadius: 0 }} />
            perfect calibration
          </span>
        </div>
      </div>
    </div>
  );
};
