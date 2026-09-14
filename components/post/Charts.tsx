import React, { useState } from 'react';

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];
const MUTE = 'var(--series-mute)';
const GRID = 'var(--series-grid)';

interface Tip {
  x: number;
  y: number;
  lines: string[];
}

function useTip() {
  const [tip, setTip] = useState<Tip | null>(null);
  const node = tip && (
    <div className="chart-tip" style={{ left: `${tip.x}%`, top: `${tip.y}%` }}>
      {tip.lines.map((line, i) => (
        <div key={i} className={i > 0 ? 'tip-k' : undefined}>{line}</div>
      ))}
    </div>
  );
  return { node, show: setTip, hide: () => setTip(null) };
}

function niceTicks(max: number, count = 4): number[] {
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? mag * 10;
  const ticks: number[] = [];
  for (let t = 0; t <= max + step * 0.001; t += step) ticks.push(t);
  return ticks;
}

function roundedBar(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w);
  return `M${x},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h - rr} Q${x + w},${y + h} ${x + w - rr},${y + h} H${x} Z`;
}

const Frame: React.FC<{
  title: string;
  sub?: string;
  legend?: { label: string; color: string }[];
  footer?: React.ReactNode;
  children: React.ReactNode;
  tip: React.ReactNode;
}> = ({ title, sub, legend, footer, children, tip }) => (
  <div className="chart">
    <div className="chart-title">{title}</div>
    {sub && <div className="chart-sub">{sub}</div>}
    {legend && (
      <div className="chart-legend">
        {legend.map(item => (
          <span key={item.label}>
            <i style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    )}
    <div style={{ position: 'relative', marginTop: '0.9rem' }}>
      {children}
      {tip}
    </div>
    {footer && <div className="chart-sub" style={{ marginTop: '0.8rem' }}>{footer}</div>}
  </div>
);

export interface BarDatum {
  label: string;
  value: number;
  display: string;
  error?: number;
  subject?: boolean;
  note?: string;
}

export const BarChart: React.FC<{
  title: string;
  sub?: string;
  unit: string;
  data: BarDatum[];
  labelWidth?: number;
  footer?: React.ReactNode;
}> = ({ title, sub, unit, data, labelWidth = 148, footer }) => {
  const tip = useTip();
  const rowH = 30;
  const barH = 17;
  const padRight = 74;
  const width = 640;
  const height = data.length * rowH + 8;
  const max = Math.max(...data.map(d => d.value + (d.error ?? 0)));
  const plotW = width - labelWidth - padRight;
  const scale = (v: number) => (v / max) * plotW;

  return (
    <Frame title={title} sub={sub} footer={footer} tip={tip.node}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        {data.map((d, i) => {
          const y = i * rowH + 4;
          const w = Math.max(scale(d.value), 2);
          const color = d.subject ? SERIES[1] : MUTE;
          return (
            <g
              key={d.label}
              onMouseEnter={() => tip.show({
                x: ((labelWidth + w) / width) * 100,
                y: (y / height) * 100,
                lines: [`${d.display} ${unit}`, d.note ?? d.label],
              })}
              onMouseLeave={tip.hide}
            >
              <rect x="0" y={y} width={width} height={rowH} fill="transparent" />
              <text className={`chart-label${d.subject ? ' on' : ''}`} x={labelWidth - 12} y={y + barH / 2 + 4} textAnchor="end">
                {d.label}
              </text>
              <path d={roundedBar(labelWidth, y, w, barH, 4)} fill={color} />
              {d.error !== undefined && d.error > 0 && (
                <g stroke="var(--color-text-muted)" strokeWidth="1">
                  <line x1={labelWidth + scale(d.value - d.error)} y1={y + barH / 2} x2={labelWidth + scale(d.value + d.error)} y2={y + barH / 2} />
                  <line x1={labelWidth + scale(d.value - d.error)} y1={y + 3} x2={labelWidth + scale(d.value - d.error)} y2={y + barH - 3} />
                  <line x1={labelWidth + scale(d.value + d.error)} y1={y + 3} x2={labelWidth + scale(d.value + d.error)} y2={y + barH - 3} />
                </g>
              )}
              <text className={`chart-value${d.subject ? ' on' : ''}`} x={labelWidth + scale(d.value + (d.error ?? 0)) + 9} y={y + barH / 2 + 4}>
                {d.display}
              </text>
            </g>
          );
        })}
      </svg>
    </Frame>
  );
};

export interface GroupedSeries {
  label: string;
  values: number[];
  displays: string[];
}

export const GroupedBarChart: React.FC<{
  title: string;
  sub?: string;
  unit: string;
  groups: string[];
  series: GroupedSeries[];
  footer?: React.ReactNode;
}> = ({ title, sub, unit, groups, series, footer }) => {
  const tip = useTip();
  const width = 640;
  const height = 260;
  const left = 46;
  const bottom = 34;
  const top = 12;
  const max = Math.max(...series.flatMap(s => s.values));
  const ticks = niceTicks(max);
  const plotH = height - bottom - top;
  const plotW = width - left - 12;
  const bandW = plotW / groups.length;
  const barW = Math.min(24, (bandW - 14) / series.length - 2);
  const y = (v: number) => top + plotH - (v / ticks[ticks.length - 1]) * plotH;

  return (
    <Frame
      title={title}
      sub={sub}
      footer={footer}
      legend={series.map((s, i) => ({ label: s.label, color: SERIES[i] }))}
      tip={tip.node}
    >
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={left} y1={y(t)} x2={width - 12} y2={y(t)} stroke={GRID} strokeWidth="1" />
            <text className="chart-axis" x={left - 10} y={y(t) + 3.5} textAnchor="end">{t.toLocaleString()}</text>
          </g>
        ))}
        {groups.map((g, gi) => {
          const groupX = left + gi * bandW;
          return (
            <g key={g}>
              <text className="chart-axis" x={groupX + bandW / 2} y={height - bottom + 20} textAnchor="middle">{g}</text>
              {series.map((s, si) => {
                const totalW = series.length * barW + (series.length - 1) * 2;
                const x = groupX + (bandW - totalW) / 2 + si * (barW + 2);
                const top0 = y(s.values[gi]);
                const h = Math.max(top + plotH - top0, 2);
                return (
                  <path
                    key={s.label}
                    d={`M${x},${top0 + 4} Q${x},${top0} ${x + 4},${top0} H${x + barW - 4} Q${x + barW},${top0} ${x + barW},${top0 + 4} V${top0 + h} H${x} Z`}
                    fill={SERIES[si]}
                    onMouseEnter={() => tip.show({
                      x: ((x + barW / 2) / width) * 100,
                      y: (top0 / height) * 100,
                      lines: [`${s.displays[gi]} ${unit}`, `${s.label} · ${g}`],
                    })}
                    onMouseLeave={tip.hide}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
    </Frame>
  );
};

export interface LineSeries {
  label: string;
  points: { x: number; y: number }[];
  endLabel?: string;
}

export const LineChart: React.FC<{
  title: string;
  sub?: string;
  xLabel: string;
  yLabel: string;
  xTicks: { v: number; label: string }[];
  series: LineSeries[];
  unit: string;
  footer?: React.ReactNode;
}> = ({ title, sub, xLabel, yLabel, xTicks, series, unit, footer }) => {
  const tip = useTip();
  const width = 640;
  const height = 280;
  const left = 54;
  const right = 66;
  const top = 14;
  const bottom = 44;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const allY = series.flatMap(s => s.points.map(p => p.y));
  const yTicks = niceTicks(Math.max(...allY));
  const yMax = yTicks[yTicks.length - 1];
  const xs = series.flatMap(s => s.points.map(p => p.x));
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const px = (v: number) => left + ((v - xMin) / (xMax - xMin || 1)) * plotW;
  const py = (v: number) => top + plotH - (v / yMax) * plotH;

  return (
    <Frame
      title={title}
      sub={sub}
      footer={footer}
      legend={series.map((s, i) => ({ label: s.label, color: SERIES[i] }))}
      tip={tip.node}
    >
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        {yTicks.map(t => (
          <g key={t}>
            <line x1={left} y1={py(t)} x2={width - right} y2={py(t)} stroke={GRID} strokeWidth="1" />
            <text className="chart-axis" x={left - 10} y={py(t) + 3.5} textAnchor="end">{t.toLocaleString()}</text>
          </g>
        ))}
        {xTicks.map(t => (
          <text key={t.v} className="chart-axis" x={px(t.v)} y={height - bottom + 22} textAnchor="middle">{t.label}</text>
        ))}
        <text className="chart-axis" x={left} y={height - 6} textAnchor="start">{xLabel}</text>
        <text className="chart-axis" x={left - 10} y={top - 4} textAnchor="end">{yLabel}</text>
        {series.map((s, si) => (
          <path
            key={s.label}
            d={s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.x)},${py(p.y)}`).join(' ')}
            fill="none"
            stroke={SERIES[si]}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {series.map((s, si) =>
          s.points.map((p, i) => (
            <circle
              key={`${s.label}-${i}`}
              cx={px(p.x)}
              cy={py(p.y)}
              r="4.5"
              fill={SERIES[si]}
              stroke="var(--color-bg)"
              strokeWidth="2"
              onMouseEnter={() => tip.show({
                x: (px(p.x) / width) * 100,
                y: (py(p.y) / height) * 100,
                lines: [`${p.y.toLocaleString()} ${unit}`, `${s.label} · ${p.x.toLocaleString()}`],
              })}
              onMouseLeave={tip.hide}
            />
          ))
        )}
        {(() => {
          const labelled = series
            .map((s, si) => ({ s, si, y: py(s.points[s.points.length - 1].y), x: px(s.points[s.points.length - 1].x) }))
            .filter(entry => entry.s.endLabel)
            .sort((a, b) => a.y - b.y);
          let previous = -Infinity;
          return labelled.map(entry => {
            const y = Math.max(entry.y, previous + 14);
            previous = y;
            return (
              <text key={`e-${entry.s.label}`} className="chart-value" x={entry.x + 12} y={y + 4}>
                {entry.s.endLabel}
              </text>
            );
          });
        })()}
      </svg>
    </Frame>
  );
};

export interface ScatterPoint {
  x: number;
  y: number;
  label: string;
  series: number;
}

export const ScatterChart: React.FC<{
  title: string;
  sub?: string;
  xLabel: string;
  yLabel: string;
  points: ScatterPoint[];
  seriesLabels: string[];
  frontier?: { x: number; y: number }[];
  footer?: React.ReactNode;
}> = ({ title, sub, xLabel, yLabel, points, seriesLabels, frontier, footer }) => {
  const tip = useTip();
  const width = 640;
  const height = 300;
  const left = 54;
  const right = 20;
  const top = 16;
  const bottom = 46;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const xTicks = niceTicks(Math.max(...points.map(p => p.x)));
  const yTicks = niceTicks(Math.max(...points.map(p => p.y)));
  const xMax = xTicks[xTicks.length - 1];
  const yMax = yTicks[yTicks.length - 1];
  const px = (v: number) => left + (v / xMax) * plotW;
  const py = (v: number) => top + plotH - (v / yMax) * plotH;

  return (
    <Frame
      title={title}
      sub={sub}
      footer={footer}
      legend={seriesLabels.map((label, i) => ({ label, color: SERIES[i] }))}
      tip={tip.node}
    >
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        {yTicks.map(t => (
          <g key={t}>
            <line x1={left} y1={py(t)} x2={width - right} y2={py(t)} stroke={GRID} strokeWidth="1" />
            <text className="chart-axis" x={left - 10} y={py(t) + 3.5} textAnchor="end">{t.toLocaleString()}</text>
          </g>
        ))}
        {xTicks.map(t => (
          <text key={t} className="chart-axis" x={px(t)} y={height - bottom + 22} textAnchor="middle">{t.toLocaleString()}</text>
        ))}
        <text className="chart-axis" x={left + plotW / 2} y={height - 6} textAnchor="middle">{xLabel}</text>
        <text className="chart-axis" x={left - 10} y={top - 4} textAnchor="end">{yLabel}</text>
        {frontier && (
          <path
            d={frontier.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.x)},${py(p.y)}`).join(' ')}
            fill="none"
            stroke={SERIES[0]}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.55"
          />
        )}
        {points.map(p => (
          <circle
            key={p.label}
            cx={px(p.x)}
            cy={py(p.y)}
            r="5.5"
            fill={SERIES[p.series]}
            stroke="var(--color-bg)"
            strokeWidth="2"
            onMouseEnter={() => tip.show({
              x: (px(p.x) / width) * 100,
              y: (py(p.y) / height) * 100,
              lines: [p.label, `${xLabel} ${p.x} · ${yLabel} ${p.y}`],
            })}
            onMouseLeave={tip.hide}
          />
        ))}
      </svg>
    </Frame>
  );
};
