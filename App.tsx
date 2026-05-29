import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import About from './components/About';
import Highlights from './components/Highlights';
import Experience from './components/Experience';
import Education from './components/Education';
import Work from './components/Blog';
import type { View } from './types';
import { aboutData, highlightsData, cvData } from './data';

const NOISE_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

function hashToView(hash: string): View {
  const segment = (hash.replace('#', '').split('/')[0] || '').toLowerCase();
  const map: Record<string, View> = {
    highlights: 'Highlights',
    experience: 'Experience',
    education: 'Education',
    work: 'Work',
    blog: 'Work',
    about: 'About',
  };
  return map[segment] || 'Highlights';
}

const App: React.FC = () => {
  const [activeView, setActiveViewRaw] = useState<View>(() => hashToView(window.location.hash));
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayedView, setDisplayedView] = useState<View>(() => hashToView(window.location.hash));
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  };

  const setActiveView = (view: View) => {
    const newHash = view.toLowerCase();
    if (window.location.hash !== '#' + newHash) {
      window.location.hash = newHash;
    }
    setActiveViewRaw(view);
  };

  useEffect(() => {
    const onHashChange = () => {
      const view = hashToView(window.location.hash);
      setActiveViewRaw(view);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (activeView !== displayedView) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayedView(activeView);
        setIsTransitioning(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeView, displayedView]);

  // Custom cursor tracking
  useEffect(() => {
    const isTouch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (isTouch) return;

    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    if (!dot || !ring) return;

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;
    let raf: number;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;

      const isInteractive = !!(e.target as HTMLElement).closest('a, button, [role="button"], input, label');
      dot.classList.toggle('is-hovering', isInteractive);
      ring.classList.toggle('is-hovering', isInteractive);
    };

    const onLeave = () => { dot.style.opacity = '0'; ring.style.opacity = '0'; };
    const onEnter = () => { dot.style.opacity = ''; ring.style.opacity = ''; };

    const animate = () => {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(animate);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    raf = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      cancelAnimationFrame(raf);
    };
  }, []);

  const renderContent = () => {
    switch (displayedView) {
      case 'Highlights':
        return <Highlights highlights={highlightsData} />;
      case 'Experience':
        return <Experience cv={cvData} />;
      case 'Education':
        return <Education cv={cvData} />;
      case 'About':
        return <About about={aboutData} />;
      case 'Work':
        return <Work />;
      default:
        return <Highlights highlights={highlightsData} />;
    }
  };

  return (
    <>
      {/* Top gradient accent bar */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, #0071E3 0%, #7C3AED 50%, #EC4899 100%)',
          zIndex: 100,
        }}
      />

      {/* Film grain texture overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 10,
          opacity: 0.04,
          backgroundImage: `url("${NOISE_SVG}")`,
          backgroundSize: '220px 220px',
        }}
      />

      {/* Custom cursor elements */}
      <div id="cursor-dot" aria-hidden="true" />
      <div id="cursor-ring" aria-hidden="true" />

      {/* Main app */}
      <div className="min-h-screen bg-stone-50 dark:bg-black transition-colors duration-300">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 py-12 sm:py-16 lg:py-24">
          <Header
            activeView={activeView}
            setActiveView={setActiveView}
            name={aboutData.name}
            bio={aboutData.bio}
            avatarUrl={aboutData.avatarUrl}
            email={aboutData.email}
            linkedinUrl={aboutData.linkedinUrl}
            githubUrl={aboutData.githubUrl}
            xUrl={aboutData.xUrl}
            isDark={isDark}
            toggleTheme={toggleTheme}
          />
          <main
            className={`mt-10 sm:mt-12 transition-all duration-200 ease-out ${
              isTransitioning
                ? 'opacity-0 translate-y-2'
                : 'opacity-100 translate-y-0'
            }`}
          >
            {renderContent()}
          </main>
        </div>
      </div>
    </>
  );
};

export default App;
