import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import Post from './components/Blog';
import Intro from './components/Intro';
import { postSlugFromHash } from './components/post/posts';

const App: React.FC = () => {
  const [hash, setHash] = useState(() => window.location.hash);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.theme = next ? 'dark' : 'light';
  };

  // Standalone, URL-only page: render the intro video without the portfolio chrome.
  if (hash.toLowerCase() === '#intro') {
    return <Intro />;
  }

  // An open post is a page of its own (#work/<slug>, or #blog/<slug> from older links).
  // The rail's back arrow returns to the work grid.
  const slug = postSlugFromHash(hash);
  if (slug) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
        <div className="px-5 sm:px-8 py-12 sm:py-16">
          <Post slug={slug} onBack={() => { window.location.hash = 'work'; }} />
        </div>
      </div>
    );
  }

  // Everything else, including old tab links like #experience, is the home page.
  return <Home isDark={isDark} toggleTheme={toggleTheme} />;
};

export default App;
