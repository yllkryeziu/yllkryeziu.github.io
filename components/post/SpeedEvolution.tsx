import React from 'react';
import Figure from './Figure';
import study from './results/speed-evolution.json';
import legacyStudy from './results/speed-evolution-legacy.json';
import './SpeedEvolution.css';

type Checkpoint = typeof study.checkpoints[number];

const checkpointLabel = (checkpoint: Checkpoint) => {
  if (checkpoint.steps === 0) return 'Untrained';
  const label = /^0\.\d+M$/.test(checkpoint.label)
    ? `${Math.round(Number.parseFloat(checkpoint.label) * 1000)}k`
    : checkpoint.label;
  return `${label} steps`;
};

const EvolutionClip: React.FC<{
  checkpoint: Checkpoint;
  rate: number;
  countSeconds: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}> = ({ checkpoint, rate, countSeconds, videoRef }) => {
  const box = React.useRef<HTMLDivElement>(null);
  const visible = React.useRef(false);
  const [active, setActive] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (!box.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
      if (entry.isIntersecting) setActive(true);
      else videoRef.current?.pause();
    }, { rootMargin: '200px' });
    observer.observe(box.current);
    return () => observer.disconnect();
  }, [videoRef]);

  React.useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = rate;
  }, [rate, videoRef]);

  return (
    <div ref={box} className="speed-evolution-clip">
      {failed ? (
        <div className="speed-evolution-error" role="status">
          This clip could not be loaded.
          <button type="button" onClick={() => setFailed(false)}>Try again</button>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={active ? `blj/${checkpoint.file}` : undefined}
          aria-label={`Speed policy at ${checkpointLabel(checkpoint)}`}
          controls muted playsInline loop preload="metadata"
          onError={() => setFailed(true)}
          onLoadedMetadata={event => { event.currentTarget.playbackRate = rate; }}
          onLoadedData={event => {
            if (visible.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
              void event.currentTarget.play().catch(() => {});
            }
          }}
        />
      )}
      <div className="speed-evolution-detail" aria-live="polite">
        <strong title={`${checkpoint.steps.toLocaleString('en-US')} training steps`}>
          {checkpointLabel(checkpoint)}
        </strong>
        <span>{checkpoint.escapes} escapes in {countSeconds}s</span>
      </div>
    </div>
  );
};

const EvolutionViewer: React.FC<{ study: typeof study }> = ({ study }) => {
  const checkpoints = study.checkpoints;
  const [selected, setSelected] = React.useState(0);
  const [comparison, setComparison] = React.useState(() => {
    const afterDiscovery = checkpoints.findIndex(row => row.steps >= study.firstTrainingSuccess);
    return afterDiscovery > 0 ? afterDiscovery : checkpoints.length - 1;
  });
  const [comparing, setComparing] = React.useState(false);
  const [rate, setRate] = React.useState(1);
  const primaryVideo = React.useRef<HTMLVideoElement>(null);
  const comparisonVideo = React.useRef<HTMLVideoElement>(null);
  const checkpoint = checkpoints[selected];
  const rangeId = React.useId();

  const replay = () => {
    for (const ref of [primaryVideo, comparisonVideo]) {
      if (!ref.current) continue;
      ref.current.currentTime = 0;
      void ref.current.play().catch(() => {});
    }
  };
  const pause = () => {
    primaryVideo.current?.pause();
    comparisonVideo.current?.pause();
  };

  return (
    <Figure n={5} plain caption={
      <>
        64 copies of one speed policy, seed {study.trainingSeed}. First training success:{' '}
        {study.firstTrainingSuccess.toLocaleString('en-US')} steps. Copies reset after escaping,
        so escape counts can exceed 64; they are not success percentages.
        {study.captureSeedMode === 'shared'
          ? ' Captures share the initial sampling seed, with no warmup. The untrained network is reconstructed from seed 4.'
          : ' Counts include 1.5 seconds of warmup before each 15-second clip.'}
      </>
    }>
      <div className="speed-evolution" role="group" aria-label="Speed policy evolution">
        <div className={`speed-evolution-videos${comparing ? ' is-comparing' : ''}`}>
          <EvolutionClip key={`primary-${checkpoint.file}`} checkpoint={checkpoint} rate={rate} countSeconds={checkpoint.seconds + study.warmupFrames / 30} videoRef={primaryVideo} />
          {comparing && (
            <EvolutionClip key={`comparison-${checkpoints[comparison].file}`} checkpoint={checkpoints[comparison]} rate={rate} countSeconds={checkpoints[comparison].seconds + study.warmupFrames / 30} videoRef={comparisonVideo} />
          )}
        </div>
        <div className="speed-evolution-timeline">
          <label htmlFor={rangeId}>Training checkpoint</label>
          <div className="speed-evolution-slider">
            <button type="button" aria-label="Previous checkpoint" disabled={selected === 0} onClick={() => setSelected(selected - 1)}>←</button>
            <input id={rangeId} type="range" min={0} max={checkpoints.length - 1} step={1}
              value={selected} aria-valuetext={`${checkpointLabel(checkpoint)}, ${checkpoint.steps.toLocaleString('en-US')} training steps`}
              onChange={event => setSelected(Number(event.target.value))} />
            <button type="button" aria-label="Next checkpoint" disabled={selected === checkpoints.length - 1} onClick={() => setSelected(selected + 1)}>→</button>
          </div>
          <div className="speed-evolution-endpoints" aria-hidden="true">
            <span>{checkpointLabel(checkpoints[0])}</span>
            <span>{checkpointLabel(checkpoints[checkpoints.length - 1])}</span>
          </div>
        </div>
        <div className="speed-evolution-controls">
          <label>Playback <select value={rate} onChange={event => setRate(Number(event.target.value))}>
            <option value={1}>1×</option><option value={0.5}>½×</option><option value={0.25}>¼×</option>
          </select></label>
          <button type="button" aria-pressed={comparing} onClick={() => setComparing(!comparing)}>Compare checkpoints</button>
          {comparing && <>
            <label>Compare with <select value={comparison} onChange={event => setComparison(Number(event.target.value))}>
              {checkpoints.map((row, index) => <option key={row.file} value={index}>{checkpointLabel(row)}</option>)}
            </select></label>
            <button type="button" onClick={replay}>Replay together</button>
            <button type="button" onClick={pause}>Pause both</button>
          </>}
        </div>
        {study.captureSeedMode === 'shared' && <p className="speed-evolution-reading">
          Start with 500k and 600k: they bracket the first training success. This 15-second
          sample still has no escapes at 600k, then 2 at 700k and 68 at 1M.
        </p>}
      </div>
    </Figure>
  );
};

const SpeedEvolution: React.FC = () => {
  const [hasStudy, setHasStudy] = React.useState(false);

  React.useEffect(() => {
    // Keep the published four-clip set usable until the new media release is installed.
    const controller = new AbortController();
    void fetch(`blj/${study.checkpoints[0].file}`, { method: 'HEAD', signal: controller.signal })
      .then(response => {
        if (response.ok && response.headers.get('content-type')?.startsWith('video/')) setHasStudy(true);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return <EvolutionViewer key={hasStudy ? 'study' : 'legacy'} study={hasStudy ? study : legacyStudy} />;
};

export default SpeedEvolution;
