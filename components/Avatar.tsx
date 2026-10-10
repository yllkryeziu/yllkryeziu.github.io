import React, { useEffect, useRef } from 'react';
import { BODY_INK, BODY_PAPER, BROW, EYE_CLIP, FEATURES, HEAD_INK, HEAD_PAPER, LIP, PIVOT, PUPILS, VIEWBOX } from './avatarArt';
import { CUFF, FIST, FIST_LINES, FOREARM } from './avatarHand';
import './Avatar.css';

// Idle looks use sixteen directions clockwise from twelve o'clock; null looks straight ahead.
type Direction = number | null;
type Fidget = 'yawn' | 'rub';

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
// While the cursor is still he fidgets, yawning or rubbing an eye in turn (milliseconds).
const FIRST_FIDGET = [8000, 14000];
const FIDGET_GAP = [25000, 45000];
// A yawn opens, holds and closes; the head tips back and the eyes shut.
const YAWN_OPEN = 900;
const YAWN_HOLD = 1000;
const YAWN_CLOSE = 800;
const YAWN_LOOK = { x: 0.1, y: -0.8 };
// The open mouth is a dark oval under the upper lip, centred at MOUTH when shut. It sinks and
// grows as it opens, and the lower lip drops to close it off (drawing pixels).
const MOUTH = [716, 730];
const LIP_DROP = 40;
// An eye rub: both hands come up from below the frame as the head bows into them, rub a few
// small circles, and go back down.
const RUB_RISE = 450;
const RUB_CIRCLES = 4;
const RUB_CIRCLE = 375;
const RUB_FALL = 500;
const RUB_SIZE = [12, 8];
const RUB_SWAY = 2;
const RUB_LOOK = { x: 0, y: 0.4 };
// The bowed head drops and tips forward around the neck (drawing pixels and degrees).
const BOW_DROP = 90;
const BOW_TILT = -5;
// For each hand: where its wrist sits on the face, how the fist and the forearm lean from it
// (degrees), and the fist's size; the far hand is a little smaller. The left one is mirrored.
const HANDS = [
  { wrist: [628, 690], fistTilt: 8, armTilt: 26, size: 0.85, mirror: false },
  { wrist: [810, 700], fistTilt: -8, armTilt: -26, size: 0.92, mirror: true },
];
// How far a hand travels straight up to come into view from below the frame.
const HAND_TRAVEL = 850;
// How far each part travels at a full look, in pixels of the drawing (about a sixth of a
// CSS pixel each). Parts nearer the front travel further, which reads as the head turning.
const HEAD_TILT = 2.2;
const HEAD_SHIFT = [7, 5];
const FEATURE_SHIFT = [15, 8];
const PUPIL_SHIFT = [8, 7];
// Between the eyes, in drawing pixels; looks are measured from here.
const EYES = [731, 540];
const [VIEW_X, VIEW_Y, VIEW_WIDTH, VIEW_HEIGHT] = VIEWBOX.split(' ').map(Number);
// The hoodie ends 20 pixels above the bottom of the view box, and its rim 18 below that.
const FRAME_BOTTOM = VIEW_Y + VIEW_HEIGHT - 20;
const RIM_BOTTOM = FRAME_BOTTOM + 18;
const easeIn = (t: number) => t ** 3;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const between = ([low, high]: number[]) => low + Math.random() * (high - low);

const Avatar: React.FC<{ className?: string }> = ({ className }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const all = (part: string) => Array.from<SVGElement>(svg.querySelectorAll(`[data-part="${part}"]`));
    const heads = all('head');
    const features = all('features');
    const pupils = all('pupil');
    const brow = all('brow')[0];
    const mouth = all('mouth')[0];
    const mouthOpenings = all('mouth-opening');
    const tongue = all('tongue')[0];
    const lips = all('lip');
    const arms = all('arms')[0];
    const hands = all('hand');

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
    let fidget: Fidget | null = null;
    let lastFidget: Fidget = Math.random() < 0.5 ? 'yawn' : 'rub';
    let fidgetStarted = -Infinity;
    let nextFidget = Infinity;
    let lastTime = performance.now();
    let frameRequest = 0;
    let lastPose = '';
    let bounds = svg.getBoundingClientRect();

    // yawn and hand run from 0 to 1; rub counts the circles the hand has made.
    const pose = (x: number, y: number, open: number, raise: number, yawn: number, hand: number, rub: number) => {
      const key = [x, y, open, raise, yawn, hand, rub].map(value => value.toFixed(3)).join(':');
      if (key === lastPose) return;
      lastPose = key;
      // The hands bring the head down with them.
      const head = `rotate(${(HEAD_TILT * x + BOW_TILT * hand).toFixed(2)} ${PIVOT[0]} ${PIVOT[1]}) translate(${(HEAD_SHIFT[0] * x).toFixed(2)} ${(HEAD_SHIFT[1] * y + BOW_DROP * hand).toFixed(2)})`;
      heads.forEach(part => part.setAttribute('transform', head));
      const feature = `translate(${(FEATURE_SHIFT[0] * x).toFixed(2)} ${(FEATURE_SHIFT[1] * y).toFixed(2)})`;
      features.forEach(part => part.setAttribute('transform', feature));
      brow.setAttribute('transform', `translate(0 ${(-BROW_LIFT * raise).toFixed(2)}) rotate(${(BROW_TILT * raise).toFixed(2)} ${BROW_PIVOT[0]} ${BROW_PIVOT[1]})`);
      // A blink squashes each pupil up into its lid, leaving the closed-eye line.
      pupils.forEach((pupil, index) => {
        const lid = PUPILS[index].cy;
        const dx = PUPIL_SHIFT[0] * x, dy = PUPIL_SHIFT[1] * y + lid * (1 - open);
        pupil.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(1 ${open.toFixed(3)})`);
      });

      mouth.setAttribute('visibility', yawn > 0 ? 'visible' : 'hidden');
      const cy = MOUTH[1] + 30 * yawn, rx = 30 + 18 * yawn, ry = 8 + 44 * yawn;
      mouthOpenings.forEach(opening => {
        opening.setAttribute('cy', cy.toFixed(2));
        opening.setAttribute('rx', rx.toFixed(2));
        opening.setAttribute('ry', ry.toFixed(2));
      });
      // The tongue is a mound on the floor of the mouth.
      const [mx] = MOUTH, floor = cy + ry, side = 0.62 * rx, crest = cy + 0.35 * ry;
      tongue.setAttribute('d', `M ${(mx - side).toFixed(1)} ${floor.toFixed(1)} C ${(mx - 0.5 * rx).toFixed(1)} ${crest.toFixed(1)},${(mx + 0.5 * rx).toFixed(1)} ${crest.toFixed(1)},${(mx + side).toFixed(1)} ${floor.toFixed(1)} Z`);
      lips.forEach(lip => lip.setAttribute('transform', `translate(0 ${(LIP_DROP * yawn).toFixed(2)})`));

      // Each hand comes up from below and rubs in small circles, half a turn from the other.
      arms.setAttribute('visibility', hand > 0 ? 'visible' : 'hidden');
      hands.forEach(part => {
        const index = Number(part.dataset.hand), { wrist, mirror } = HANDS[index];
        const turn = 2 * Math.PI * (rub + index / 2), side = mirror ? -1 : 1;
        const hx = wrist[0] + side * RUB_SIZE[0] * (Math.cos(turn) - 1);
        const hy = wrist[1] + HAND_TRAVEL * (1 - hand) + RUB_SIZE[1] * Math.sin(turn);
        part.setAttribute('transform', `translate(${hx.toFixed(2)} ${hy.toFixed(2)}) rotate(${(side * RUB_SWAY * Math.sin(turn)).toFixed(2)})`);
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

      const browing = now - browStarted < BROW_RISE + BROW_HOLD + BROW_FALL;
      if (!fidget && !following && !browing && now >= nextFidget) {
        fidget = lastFidget = lastFidget === 'yawn' ? 'rub' : 'yawn';
        fidgetStarted = now;
      }
      let yawn = 0, hand = 0, rub = 0, shut = 0;
      const sinceFidget = now - fidgetStarted;
      const rubbing = RUB_CIRCLES * RUB_CIRCLE;
      if (fidget === 'yawn') {
        if (sinceFidget < YAWN_OPEN) yawn = easeInOut(sinceFidget / YAWN_OPEN);
        else if (sinceFidget < YAWN_OPEN + YAWN_HOLD) yawn = 1;
        else yawn = 1 - easeInOut(Math.min((sinceFidget - YAWN_OPEN - YAWN_HOLD) / YAWN_CLOSE, 1));
        shut = Math.min(1.5 * yawn, 1);
        target = { x: target.x + (YAWN_LOOK.x - target.x) * yawn, y: target.y + (YAWN_LOOK.y - target.y) * yawn };
      } else if (fidget === 'rub') {
        if (sinceFidget < RUB_RISE) hand = easeOut(sinceFidget / RUB_RISE);
        else if (sinceFidget < RUB_RISE + rubbing) {
          hand = 1;
          rub = (sinceFidget - RUB_RISE) / RUB_CIRCLE;
        } else hand = 1 - easeIn(Math.min((sinceFidget - RUB_RISE - rubbing) / RUB_FALL, 1));
        // The eyes close as the fists arrive, and open again as they leave.
        shut = Math.min(Math.max((hand - 0.4) / 0.4, 0), 1);
        target = { x: target.x + (RUB_LOOK.x - target.x) * hand, y: target.y + (RUB_LOOK.y - target.y) * hand };
      }
      const fidgetLength = fidget === 'yawn' ? YAWN_OPEN + YAWN_HOLD + YAWN_CLOSE : RUB_RISE + rubbing + RUB_FALL;
      if (fidget && sinceFidget >= fidgetLength) {
        fidget = null;
        nextFidget = now + between(FIDGET_GAP);
        // Eyes that were shut blink twice on opening.
        blinkStarted = now;
        nextBlink = now + BLINK + 90;
      }

      const step = 1 - Math.exp(-elapsed / settle);
      gaze = { x: gaze.x + (target.x - gaze.x) * step, y: gaze.y + (target.y - gaze.y) * step };

      if (now >= nextBlink) {
        blinkStarted = now;
        // Now and then a double blink.
        nextBlink = now + (Math.random() < 0.15 ? BLINK + 90 : 2500 + Math.random() * 3500);
      }
      const blinking = now - blinkStarted < BLINK;

      if (now >= nextBrow && !fidget) {
        browStarted = now;
        nextBrow = now + 9000 + Math.random() * 9000;
      }
      const sinceBrow = now - browStarted;
      let raise = 0;
      if (sinceBrow < BROW_RISE) raise = easeOut(sinceBrow / BROW_RISE);
      else if (sinceBrow < BROW_RISE + BROW_HOLD) raise = 1;
      else if (sinceBrow < BROW_RISE + BROW_HOLD + BROW_FALL) raise = 1 - easeInOut((sinceBrow - BROW_RISE - BROW_HOLD) / BROW_FALL);
      // A yawn lifts the brow a little too.
      raise = Math.max(raise, 0.4 * yawn);

      const open = Math.min(blinking ? Math.abs(Math.cos(Math.PI * (now - blinkStarted) / BLINK)) : 1, 1 - shut);
      pose(gaze.x, gaze.y, open, raise, yawn, hand, rub);
      frameRequest = requestAnimationFrame(animate);
    };

    const restart = () => {
      cancelAnimationFrame(frameRequest);
      resetToIdle();
      gaze = { x: 0, y: 0 };
      idleIndex = 0;
      idleStarted = lastTime = performance.now();
      browStarted = -Infinity;
      fidget = null;
      nextFidget = performance.now() + between(FIRST_FIDGET);
      pose(0, 0, 1, 0, 0, 0, 0);
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

  // The arms are drawn twice, rims then ink, each inside its own copy of the head and face
  // groups so they move with the eyes they rub; the rims reach as far down as the hoodie's.
  const armLayer = (rim: boolean) => (
    <g clipPath={`url(#avatar-${rim ? 'rim' : 'frame'})`}>
      <g data-part="head">
        <g data-part="features">
          {HANDS.map(({ fistTilt, armTilt, size, mirror }, index) => {
            const fist = `rotate(${fistTilt}) scale(${mirror ? -size : size} ${size})`;
            const forearm = `rotate(${armTilt})${mirror ? ' scale(-1 1)' : ''}`;
            return (
              <g key={index} data-part="hand" data-hand={index}>
                {rim ? (
                  <g className="avatar-rim">
                    <path transform={forearm} d={FOREARM} />
                    <path className="avatar-fist-rim" transform={fist} d={FIST} />
                  </g>
                ) : (
                  <>
                    <g transform={fist}>
                      <path className="avatar-hand" d={FIST} />
                      <path className="avatar-hand-lines" d={FIST_LINES} />
                    </g>
                    <g transform={forearm}>
                      <path className="avatar-sleeve" d={FOREARM} />
                      <path className="avatar-cuff" d={CUFF} />
                    </g>
                  </>
                )}
              </g>
            );
          })}
        </g>
      </g>
    </g>
  );

  // Layers, bottom to top: a paper backing (with a rim that shows in dark mode), the head
  // with its face and pupils, then the hoodie, drawn over the neck so the head can move, and
  // last the arms, hidden until he rubs his eyes.
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
        <clipPath id="avatar-frame">
          <rect x={VIEW_X - 500} y={0} width={VIEW_WIDTH + 1000} height={FRAME_BOTTOM} />
        </clipPath>
        <clipPath id="avatar-rim">
          <rect x={VIEW_X - 500} y={0} width={VIEW_WIDTH + 1000} height={RIM_BOTTOM} />
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
          <g data-part="mouth" visibility="hidden">
            <g className="avatar-gap">
              <ellipse data-part="mouth-opening" cx={MOUTH[0]} cy={MOUTH[1]} />
              <path data-part="lip" d={LIP} />
            </g>
            <ellipse data-part="mouth-opening" className="avatar-ink" cx={MOUTH[0]} cy={MOUTH[1]} />
            <path data-part="tongue" className="avatar-paper" />
          </g>
          <path data-part="lip" className="avatar-ink" d={LIP} />
          <path className="avatar-ink" d={FEATURES} fillRule="evenodd" />
          <path data-part="brow" className="avatar-brow" d={BROW} />
        </g>
      </g>
      <path className="avatar-ink" d={BODY_INK} fillRule="evenodd" />
      <g data-part="arms" visibility="hidden">
        {armLayer(true)}
        {armLayer(false)}
      </g>
    </svg>
  );
};

export default Avatar;
