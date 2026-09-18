import React, { useEffect, useRef, useState } from 'react';
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
  readingMinutes: number;
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

    const observer = new IntersectionObserver(
      () => {
        const cutoff = window.innerHeight * 0.35;
        let current = headings[0].id;
        for (const heading of headings) {
          if (heading.getBoundingClientRect().top <= cutoff) current = heading.id;
        }
        setActive(current);
      },
      { rootMargin: '-35% 0px -60% 0px', threshold: [0, 1] },
    );
    headings.forEach(heading => observer.observe(heading));

    const onScroll = () => {
      const cutoff = window.innerHeight * 0.35;
      let current = headings[0].id;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= cutoff) current = heading.id;
      }
      setActive(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [ids.join('|')]);

  return active;
}

const ReadingNav: React.FC<{ entries: TocEntry[]; onBack: () => void }> = ({ entries, onBack }) => {
  const active = useActiveSection(entries.map(entry => entry.id));
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  return (
    <div className="post-reading-nav">
      <button type="button" onClick={onBack}>← Work</button>
      <details ref={menu} className="post-contents" onKeyDown={event => {
        if (event.key === 'Escape' && menu.current) {
          menu.current.open = false;
          menu.current.querySelector('summary')?.focus();
        }
      }}>
        <summary>Contents</summary>
        <nav aria-label="Table of contents"><ol>
          {entries.map(entry => <li key={entry.id}>
            <button type="button" aria-current={active === entry.id ? 'location' : undefined} onClick={() => {
              if (menu.current) menu.current.open = false;
              scrollToSection(entry.id);
            }}>{entry.label}</button>
          </li>)}
        </ol></nav>
      </details>
    </div>
  );
};

const Article: React.FC<ArticleProps> = ({
  onBack, title, date, readingMinutes, repo, toc, children,
}) => (
  <article className="post">
    <ReadingNav entries={toc} onBack={onBack} />
    <header className="post-head">
      <h1 className="post-title">{title}</h1>
      <div className="post-meta">
        <span>{date}</span>
        <span className="sep">·</span>
        <span>{readingMinutes} min read</span>
        {repo && (
          <>
            <span className="sep">·</span>
            <a href={repo.url} target="_blank" rel="noopener noreferrer">{repo.label} ↗</a>
          </>
        )}
      </div>
    </header>
    <div className="post-shell">
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
