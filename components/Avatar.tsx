import React, { useEffect, useRef } from 'react';
import { BODY_INK, BODY_PAPER, BROW, EYE_CLIP, FEATURES, HEAD_INK, HEAD_PAPER, PIVOT, PUPILS, VIEWBOX } from './avatarArt';
import './Avatar.css';

// Idle looks use sixteen directions clockwise from twelve o'clock; null looks straight ahead.
type Direction = number | null;

const IDLE_LOOKS: { direction: Direction; duration: number }[] = [
  { direction: null, duration: 2400 },
  { direction: 12, duration: 1100 },
  { direction: 10, duration: 900 },
  { direction: null, duration: 1800 },
  { direction: 4, duration: 1200 },
  { direction: 6, duration: 900 },
  { direction: null, duration: 2200 },
  { direction: 14, duration: 1000 },
  { direction: 1, duration: 900 },
  { direction: null, duration: 1600 },
  { direction: 9, duration: 1100 },
];
const CURSOR_HOLD = 1600;
const BLINK = 150;
// Now and then one eyebrow goes up: it rises, holds, and settles back (milliseconds).
const BROW_RISE = 140;
const BROW_HOLD = 750;
const BROW_FALL = 260;
// The raised brow lifts and tilts up at its outer end, pivoting near the nose.
const BROW_LIFT = 14;
const BROW_TILT = -2;
const BROW_PIVOT = [737, 500];
// How far each part travels at a full look, in pixels of the drawing (about a sixth of a
// CSS pixel each). Parts nearer the front travel further, which reads as the head turning.
const HEAD_TILT = 2.2;
const HEAD_SHIFT = [7, 5];
const FEATURE_SHIFT = [15, 8];
const PUPIL_SHIFT = [8, 7];
// Between the eyes, in drawing pixels; looks are measured from here.
const EYES = [731, 540];
const [VIEW_X, VIEW_Y, VIEW_WIDTH] = VIEWBOX.split(' ').map(Number);
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

const Avatar: React.FC<{ className?: string }> = ({ className }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const heads = Array.from<SVGElement>(svg.querySelectorAll('[data-part="head"]'));
    const features = svg.querySelector<SVGElement>('[data-part="features"]')!;
    const pupils = Array.from<SVGElement>(svg.querySelectorAll('[data-part="pupil"]'));
    const brow = svg.querySelector<SVGElement>('[data-part="brow"]')!;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let gaze = { x: 0, y: 0 };
    let pointer: { x: number; y: number } | null = null;
    let lastMovement = -Infinity;
    let following = false;
    let idleIndex = 0;
    let idleStarted = performance.now();
    let blinkStarted = -Infinity;
    let nextBlink = performance.now() + 2500;
    let browStarted = -Infinity;
    let nextBrow = performance.now() + 6000 + Math.random() * 6000;
    let lastTime = performance.now();
    let frameRequest = 0;
    let lastPose = '';
    let bounds = svg.getBoundingClientRect();

    const pose = (x: number, y: number, open: number, raise: number) => {
      const key = `${x.toFixed(3)}:${y.toFixed(3)}:${open.toFixed(2)}:${raise.toFixed(3)}`;
      if (key === lastPose) return;
      lastPose = key;
      const head = `rotate(${(HEAD_TILT * x).toFixed(2)} ${PIVOT[0]} ${PIVOT[1]}) translate(${(HEAD_SHIFT[0] * x).toFixed(2)} ${(HEAD_SHIFT[1] * y).toFixed(2)})`;
      heads.forEach(part => part.setAttribute('transform', head));
      features.setAttribute('transform', `translate(${(FEATURE_SHIFT[0] * x).toFixed(2)} ${(FEATURE_SHIFT[1] * y).toFixed(2)})`);
      brow.setAttribute('transform', `translate(0 ${(-BROW_LIFT * raise).toFixed(2)}) rotate(${(BROW_TILT * raise).toFixed(2)} ${BROW_PIVOT[0]} ${BROW_PIVOT[1]})`);
      // A blink squashes each pupil up into its lid, leaving the closed-eye line.
      pupils.forEach((pupil, index) => {
        const lid = PUPILS[index].cy;
        const dx = PUPIL_SHIFT[0] * x, dy = PUPIL_SHIFT[1] * y + lid * (1 - open);
        pupil.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(1 ${open.toFixed(3)})`);
      });
    };

    const resetToIdle = () => {
      if (following) {
        idleIndex = 0;
        idleStarted = performance.now();
      }
      following = false;
      pointer = null;
      lastMovement = -Infinity;
    };

    const animate = (now: number) => {
      const elapsed = Math.min(now - lastTime, 100);
      lastTime = now;
      let target = { x: 0, y: 0 };
      let settle = 160;
      if (pointer && now - lastMovement < CURSOR_HOLD) {
        following = true;
        settle = 70;
        const scale = bounds.width / VIEW_WIDTH;
        const dx = pointer.x - (bounds.left + (EYES[0] - VIEW_X) * scale);
        const dy = pointer.y - (bounds.top + (EYES[1] - VIEW_Y) * scale);
        // Full look once the cursor is a little way off; closer in, a partial one.
        const reach = Math.max(Math.hypot(dx, dy), 140);
        target = { x: dx / reach, y: dy / reach };
      } else {
        if (following) resetToIdle();
        if (now - idleStarted >= IDLE_LOOKS[idleIndex].duration) {
          idleIndex = (idleIndex + 1) % IDLE_LOOKS.length;
          idleStarted = now;
        }
        const { direction } = IDLE_LOOKS[idleIndex];
        if (direction !== null) {
          const angle = direction * Math.PI / 8;
          target = { x: 0.9 * Math.sin(angle), y: -0.9 * Math.cos(angle) };
        }
      }
      const step = 1 - Math.exp(-elapsed / settle);
      gaze = { x: gaze.x + (target.x - gaze.x) * step, y: gaze.y + (target.y - gaze.y) * step };

      if (now >= nextBlink) {
        blinkStarted = now;
        // Now and then a double blink.
        nextBlink = now + (Math.random() < 0.15 ? BLINK + 90 : 2500 + Math.random() * 3500);
      }
      const blinking = now - blinkStarted < BLINK;

      if (now >= nextBrow) {
        browStarted = now;
        nextBrow = now + 9000 + Math.random() * 9000;
      }
      const sinceBrow = now - browStarted;
      let raise = 0;
      if (sinceBrow < BROW_RISE) raise = easeOut(sinceBrow / BROW_RISE);
      else if (sinceBrow < BROW_RISE + BROW_HOLD) raise = 1;
      else if (sinceBrow < BROW_RISE + BROW_HOLD + BROW_FALL) raise = 1 - easeInOut((sinceBrow - BROW_RISE - BROW_HOLD) / BROW_FALL);

      pose(gaze.x, gaze.y, blinking ? Math.abs(Math.cos(Math.PI * (now - blinkStarted) / BLINK)) : 1, raise);
      frameRequest = requestAnimationFrame(animate);
    };

    const restart = () => {
      cancelAnimationFrame(frameRequest);
      resetToIdle();
      gaze = { x: 0, y: 0 };
      idleIndex = 0;
      idleStarted = lastTime = performance.now();
      browStarted = -Infinity;
      pose(0, 0, 1, 0);
      if (!reducedMotion.matches && !document.hidden) frameRequest = requestAnimationFrame(animate);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || reducedMotion.matches) return;
      pointer = { x: event.clientX, y: event.clientY };
      lastMovement = performance.now();
    };
    const measure = () => { bounds = svg.getBoundingClientRect(); };
    const onClick = () => {
      if (reducedMotion.matches) return;
      blinkStarted = performance.now();
      svg.animate([
        { transform: 'translateY(0)' },
        { transform: 'translateY(-6px)', offset: 0.4 },
        { transform: 'translateY(0)' },
      ], { duration: 280, easing: 'ease-out' });
    };

    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', resetToIdle);
    window.addEventListener('blur', resetToIdle);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    document.addEventListener('visibilitychange', restart);
    reducedMotion.addEventListener('change', restart);
    svg.addEventListener('click', onClick);
    restart();

    return () => {
      cancelAnimationFrame(frameRequest);
      document.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', resetToIdle);
      window.removeEventListener('blur', resetToIdle);
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      document.removeEventListener('visibilitychange', restart);
      reducedMotion.removeEventListener('change', restart);
      svg.removeEventListener('click', onClick);
    };
  }, []);

  // Layers, bottom to top: a paper backing (with a rim that shows in dark mode), the head
  // with its face and pupils, then the hoodie, drawn over the neck so the head can move.
  return (
    <svg
      ref={svgRef}
      className={className ? `avatar ${className}` : 'avatar'}
      viewBox={VIEWBOX}
      role="img"
      aria-label="Drawing of Yll in a Yankees cap and a Knicks hoodie"
    >
      <defs>
        <clipPath id="avatar-eyes">
          <path d={EYE_CLIP} />
        </clipPath>
      </defs>
      <g className="avatar-rim">
        <path data-part="head" d={HEAD_PAPER} />
        <path d={BODY_PAPER} />
      </g>
      <g data-part="head">
        <path className="avatar-ink" d={HEAD_INK} fillRule="evenodd" />
        <g data-part="features">
          <g clipPath="url(#avatar-eyes)">
            {PUPILS.map((pupil, index) => (
              <ellipse key={index} data-part="pupil" className="avatar-ink" cx={pupil.cx} cy={pupil.cy} rx={pupil.rx} ry={pupil.ry} />
            ))}
          </g>
          <path className="avatar-ink" d={FEATURES} fillRule="evenodd" />
          <path data-part="brow" className="avatar-brow" d={BROW} />
        </g>
      </g>
      <path className="avatar-ink" d={BODY_INK} fillRule="evenodd" />
    </svg>
  );
};

export default Avatar;
