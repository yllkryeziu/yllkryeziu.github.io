import React, { useEffect, useState } from 'react';

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
  kicker: string;
  title: string;
  dek: React.ReactNode;
  date: string;
  readingMinutes: number;
  repo?: { label: string; url: string };
  toc: TocEntry[];
  children: React.ReactNode;
}

function scrollToSection(event: React.MouseEvent, id: string) {
  event.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

const Rail: React.FC<{ entries: TocEntry[]; onBack: () => void }> = ({ entries, onBack }) => {
  const active = useActiveSection(entries.map(entry => entry.id));
  return (
    <aside className="post-rail">
      <button onClick={onBack} className="post-rail-back">← Work</button>
      <nav className="post-rail-toc" aria-label="Table of contents">
        <div className="post-rail-label">Contents</div>
        <ol>
          {entries.map((entry, index) => (
            <li key={entry.id} className={active === entry.id ? 'on' : undefined}>
              <a href={`#${entry.id}`} onClick={event => scrollToSection(event, entry.id)}>
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
  onBack, kicker, title, dek, date, readingMinutes, repo, toc, children,
}) => (
  <article className="post">
    <header className="post-head">
      <div className="post-kicker">{kicker}</div>
      <h1 className="post-title">{title}</h1>
      <p className="post-dek">{dek}</p>
      <div className="post-meta">
        <span>Yll Kryeziu</span>
        <span className="sep">·</span>
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
      <Rail entries={toc} onBack={onBack} />
      <div className="post-body">{children}</div>
    </div>
  </article>
);

export const H2: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <h2 id={id}>
    {children}
    <a className="post-anchor" href={`#${id}`} onClick={e => scrollToSection(e, id)} aria-label="Link to section">#</a>
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

export const KeyNumbers: React.FC<{ items: { k: string; v: string; s: string }[] }> = ({ items }) => (
  <div className="post-keys">
    {items.map(item => (
      <div className="cell" key={item.k}>
        <div className="k">{item.k}</div>
        <div className="v">{item.v}</div>
        <div className="s">{item.s}</div>
      </div>
    ))}
  </div>
);

export default Article;
