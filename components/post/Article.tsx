import React from 'react';

export interface Reference {
  n: number;
  text: React.ReactNode;
  url: string;
}

function scrollToSection(event: React.MouseEvent, id: string) {
  event.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

const BackLink: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <button
    onClick={onBack}
    className="post-sans"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem',
      background: 'none',
      border: 'none',
      padding: '0 0 1.75rem',
      margin: 0,
      cursor: 'pointer',
      font: 'inherit',
      fontSize: '13px',
      color: 'var(--color-text-muted)',
    }}
    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
  >
    ← Work
  </button>
);

const Toc: React.FC<{ entries: TocEntry[] }> = ({ entries }) => (
  <nav className="post-toc" aria-label="Table of contents">
    <div className="post-toc-label">Contents</div>
    <ol>
      {entries.map((entry, i) => (
        <li key={entry.id}>
          <a href={`#${entry.id}`} onClick={e => scrollToSection(e, entry.id)}>
            <span className="num">{String(i + 1).padStart(2, '0')}</span>
            <span>{entry.label}</span>
          </a>
        </li>
      ))}
    </ol>
  </nav>
);

const Article: React.FC<ArticleProps> = ({
  onBack, kicker, title, dek, date, readingMinutes, repo, toc, children,
}) => (
  <article className="post">
    <BackLink onBack={onBack} />
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
    <Toc entries={toc} />
    {children}
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
  <div className="post-note">
    {label && <span className="note-label">{label}</span>}
    {children}
  </div>
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
