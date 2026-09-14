import React from 'react';

const TEXT = 'var(--color-text)';
const MUTED = 'var(--color-text-muted)';
const SUBTLE = 'var(--color-text-subtle)';
const BORDER = 'var(--color-border)';
const SOFT = 'var(--color-border-light)';
const BG = 'var(--color-bg)';
const ACCENT = 'var(--series-2)';
const COOL = 'var(--series-1)';

const SAMPLE = '{"id":42,"make":"Ford"}';
const STRUCTURAL = new Set(['{', '}', '[', ']', ':', ',']);

export const ClassificationFigure: React.FC = () => {
  const cell = 21;
  const left = 104;
  const top = 34;
  const rowH = 26;
  const width = left + SAMPLE.length * cell + 12;

  const lanes = [
    { label: 'structural', test: (c: string) => STRUCTURAL.has(c), color: ACCENT },
    { label: 'quote', test: (c: string) => c === '"', color: COOL },
    { label: 'digit', test: (c: string) => c >= '0' && c <= '9', color: MUTED },
  ];

  return (
    <svg viewBox={`0 0 ${width} ${top + rowH * 4 + 46}`} role="img" aria-label="SIMD byte classification">
      <text x={0} y={14} fontFamily="var(--font-sans)" fontSize="11" fontWeight="650" fill={MUTED} letterSpacing="0.06em">
        ONE 32-BYTE CHUNK, THREE VECTOR COMPARES
      </text>
      <text x={left - 12} y={top + 14} textAnchor="end" fontFamily="var(--font-sans)" fontSize="11.5" fill={SUBTLE}>
        input
      </text>
      {SAMPLE.split('').map((ch, i) => (
        <g key={`c-${i}`}>
          <rect x={left + i * cell} y={top} width={cell - 2} height={20} rx="3" fill={SOFT} stroke={BORDER} strokeWidth="1" />
          <text
            x={left + i * cell + (cell - 2) / 2}
            y={top + 14}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="11.5"
            fill={TEXT}
          >
            {ch === ' ' ? '␣' : ch}
          </text>
        </g>
      ))}
      {lanes.map((lane, li) => {
        const y = top + rowH * (li + 1) + 4;
        return (
          <g key={lane.label}>
            <text x={left - 12} y={y + 13} textAnchor="end" fontFamily="var(--font-sans)" fontSize="11.5" fill={SUBTLE}>
              {lane.label}
            </text>
            {SAMPLE.split('').map((ch, i) => {
              const on = lane.test(ch);
              return (
                <g key={`${lane.label}-${i}`}>
                  <rect
                    x={left + i * cell}
                    y={y}
                    width={cell - 2}
                    height={18}
                    rx="3"
                    fill={on ? lane.color : 'transparent'}
                    stroke={on ? 'none' : BORDER}
                    strokeWidth="1"
                  />
                  <text
                    x={left + i * cell + (cell - 2) / 2}
                    y={y + 13}
                    textAnchor="middle"
                    fontFamily="var(--font-mono)"
                    fontSize="10.5"
                    fill={on ? BG : MUTED}
                  >
                    {on ? '1' : '0'}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
      <text x={left} y={top + rowH * 4 + 30} fontFamily="var(--font-mono)" fontSize="11" fill={MUTED}>
        structural index ← positions of set bits, extracted with a leading-zero count per word
      </text>
    </svg>
  );
};

const Box: React.FC<{
  x: number; y: number; w: number; h: number;
  title: string; lines: string[];
  dashed?: boolean; tone?: 'plain' | 'accent' | 'warn';
}> = ({ x, y, w, h, title, lines, dashed, tone = 'plain' }) => {
  const stroke = tone === 'accent' ? ACCENT : tone === 'warn' ? 'var(--color-accent)' : BORDER;
  const fill = tone === 'accent' ? 'color-mix(in srgb, var(--series-2) 7%, transparent)' : tone === 'warn' ? 'transparent' : BG;
  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h} rx="8"
        fill={fill} stroke={stroke} strokeWidth="1.4"
        strokeDasharray={dashed ? '5 4' : undefined}
      />
      <text x={x + 16} y={y + 26} fontFamily="var(--font-sans)" fontSize="13" fontWeight="650" fill={TEXT}>{title}</text>
      {lines.map((line, i) => (
        <text key={i} x={x + 16} y={y + 46 + i * 16} fontFamily="var(--font-mono)" fontSize="10.5" fill={MUTED}>{line}</text>
      ))}
    </g>
  );
};

export const MemoryFigure: React.FC = () => (
  <svg viewBox="0 0 640 320" role="img" aria-label="Zero-copy memory topology across the JNI boundary">
    <defs>
      <marker id="sj-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10z" fill={ACCENT} />
      </marker>
      <marker id="sj-arrow-dead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10z" fill={MUTED} />
      </marker>
    </defs>

    <g fontFamily="var(--font-sans)" fontSize="10.5" fontWeight="650" fill={MUTED} letterSpacing="0.08em" textAnchor="middle">
      <text x={95} y={14}>JVM HEAP</text>
      <text x={320} y={14}>OFF-HEAP</text>
      <text x={545} y={14}>NATIVE</text>
    </g>

    <Box x={10} y={30} w={170} h={86} title="ByteBuffer" lines={['address + capacity', 'a handle, not the bytes']} />
    <Box x={225} y={30} w={190} h={86} title="direct arena" lines={['GC never relocates it', 'raw UTF-8 + padding']} tone="accent" dashed />
    <Box x={460} y={30} w={170} h={86} title="ondemand::parser" lines={['iterates in place', 'const uint8_t*']} />

    <line x1="182" y1="73" x2="221" y2="73" stroke={ACCENT} strokeWidth="1.4" strokeDasharray="4 4" markerEnd="url(#sj-arrow)" />
    <line x1="417" y1="73" x2="456" y2="73" stroke={ACCENT} strokeWidth="2" markerEnd="url(#sj-arrow)" />

    <rect x={366} y={136} width="228" height="24" rx="12" fill={ACCENT} />
    <text x={480} y={152} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10.5" fill={BG}>
      GetDirectBufferAddress · 0 bytes copied
    </text>
    <line x1="480" y1="118" x2="480" y2="134" stroke={ACCENT} strokeWidth="1.4" />

    <Box x={10} y={200} w={240} h={80} title="byte[] on the managed heap" lines={['GetByteArrayElements', 'copies the whole payload']} tone="warn" dashed />
    <line x1="252" y1="238" x2="360" y2="176" stroke={MUTED} strokeWidth="1.3" strokeDasharray="5 4" markerEnd="url(#sj-arrow-dead)" />
    <g stroke="var(--color-accent)" strokeWidth="2.4" strokeLinecap="round">
      <line x1="291" y1="200" x2="311" y2="220" />
      <line x1="311" y1="200" x2="291" y2="220" />
    </g>
    <text x={130} y={300} textAnchor="middle" fontFamily="var(--font-sans)" fontSize="11.5" fill={SUBTLE}>
      the copy the direct buffer lets you skip
    </text>
  </svg>
);
