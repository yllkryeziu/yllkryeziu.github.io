import React, { useEffect, useState } from 'react';
import './BlogDesign.css';

export interface Reference {
  n: number;
  text: React.ReactNode;
  url: string;
}

export interface TocEntry {
  id: string;
  label: string;
}

interface ArticleProps {
  onBack: () => void;
  title: string;
  date: string;
  repo?: { label: string; url: string };
  toc: TocEntry[];
  children: React.ReactNode;
}

function scrollToSection(id: string) {
  const heading = document.getElementById(id);
  if (!heading) return;
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
  heading.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    const headings = ids
      .map(id => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (headings.length === 0) return;

    const onScroll = () => {
      // The final section may be too short to reach the usual activation line.
      if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        setActive(headings[headings.length - 1].id);
        return;
      }
      const cutoff = window.innerHeight * 0.35;
      let current = headings[0].id;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= cutoff) current = heading.id;
      }
      setActive(current);
    };
    const observer = new IntersectionObserver(onScroll,
      { rootMargin: '-35% 0px -60% 0px', threshold: [0, 1] });
    headings.forEach(heading => observer.observe(heading));
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [ids.join('|')]);

  return active;
}

const Rail: React.FC<{ entries: TocEntry[]; onBack: () => void }> = ({ entries, onBack }) => {
  const active = useActiveSection(entries.map(entry => entry.id));
  return (
    <aside className="post-rail">
      <button type="button" onClick={onBack} className="post-rail-back">← Work</button>
      <nav className="post-rail-toc" aria-label="Table of contents">
        <div className="post-rail-label">Contents</div>
        <ol>
          {entries.map((entry, index) => (
            <li key={entry.id} className={active === entry.id ? 'on' : undefined}>
              <a href={window.location.hash} aria-current={active === entry.id ? 'location' : undefined}
                onClick={event => { event.preventDefault(); scrollToSection(entry.id); }}>
                <span className="num">{String(index + 1).padStart(2, '0')}</span>
                <span className="label">{entry.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  );
};

const Article: React.FC<ArticleProps> = ({
  onBack, title, date, repo, toc, children,
}) => (
  <article className="post">
    <header className="post-head">
      <h1 className="post-title">{title}</h1>
      <div className="post-meta">
        <span>{date}</span>
        {repo && (
          <>
            <span className="sep">·</span>
            <a href={repo.url} target="_blank" rel="noopener noreferrer">{repo.label} ↗</a>
          </>
        )}
      </div>
    </header>
    <div className="post-shell">
      <Rail entries={toc} onBack={onBack} />
      <div className="post-body">{children}</div>
    </div>
  </article>
);

export const H2: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <h2 id={id}>
    {children}
  </h2>
);

export const H3: React.FC<{ id?: string; children: React.ReactNode }> = ({ id, children }) => (
  <h3 id={id}>{children}</h3>
);

export const Note: React.FC<{ label?: string; children: React.ReactNode }> = ({ label, children }) => (
  <aside className="post-note">
    {label && <span className="note-label">{label}</span>}
    {children}
  </aside>
);

export default Article;
