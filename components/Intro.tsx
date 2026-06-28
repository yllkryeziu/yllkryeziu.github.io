import React from 'react';

// Standalone intro video page. Reachable only via the #intro URL — not linked anywhere.
// The mp4 at /intro.mp4 is a placeholder; replace it with the real video later.
const Intro: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.25rem',
      background: 'var(--color-bg)',
    }}>
      <video
        controls
        playsInline
        preload="metadata"
        src="/intro.mp4"
        style={{
          width: '100%',
          maxWidth: 880,
          aspectRatio: '16 / 9',
          background: '#000',
          borderRadius: 12,
          border: '1px solid var(--color-border)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
        }}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default Intro;
