import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import About from './components/About';
import Highlights from './components/Highlights';
import Experience from './components/Experience';
import Education from './components/Education';
import Projects from './components/Projects';
import type { View } from './types';
import { aboutData, highlightsData, cvData, projectsData } from './data';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('Highlights');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayedView, setDisplayedView] = useState<View>('Highlights');

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

  const renderContent = () => {
    switch (displayedView) {
      case 'Highlights':
        return <Highlights highlights={highlightsData} />;
      case 'Experience':
        return <Experience cv={cvData} />;
      case 'Education':
        return <Education cv={cvData} />;
      case 'Projects':
        return <Projects projects={projectsData} />;
      case 'About':
        return <About about={aboutData} />;
      default:
        return <Highlights highlights={highlightsData} />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 font-body">
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
  );
};

export default App;
