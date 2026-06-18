import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import About from './components/About';
import Highlights from './components/Highlights';
import Experience from './components/Experience';
import Education from './components/Education';
import Work from './components/Blog';
import type { View } from './types';
import { aboutData, highlightsData, cvData } from './data';

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
      setActiveViewRaw(hashToView(window.location.hash));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const renderContent = () => {
    switch (activeView) {
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
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
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
        <main className="mt-10 sm:mt-12">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
