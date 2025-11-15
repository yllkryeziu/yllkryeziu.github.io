import React, { useState } from 'react';
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

  const renderContent = () => {
    switch (activeView) {
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20">
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
      <main className="mt-8 sm:mt-12">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;