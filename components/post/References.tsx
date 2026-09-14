import React from 'react';
import type { Reference } from './Article';

export function makeCite(refs: Reference[]) {
  return function Cite({ ids }: { ids: number[] }) {
    return (
      <span className="post-cite">
        [{ids.map((id, i) => {
          const ref = refs.find(r => r.n === id);
          return (
            <React.Fragment key={id}>
              {i > 0 && ', '}
              <a href={ref?.url} target="_blank" rel="noopener noreferrer">{id}</a>
            </React.Fragment>
          );
        })}]
      </span>
    );
  };
}

interface ReferencesProps {
  refs: Reference[];
  bibtex: string;
}

const References: React.FC<ReferencesProps> = ({ refs, bibtex }) => (
  <div className="post-refs">
    <h2 id="references" style={{ margin: '0 0 1rem' }}>References</h2>
    <ol>
      {refs.map(ref => (
        <li key={ref.n}>
          <span className="n">[{ref.n}]</span>
          <span>
            {ref.text}{' '}
            <a href={ref.url} target="_blank" rel="noopener noreferrer">↗</a>
          </span>
        </li>
      ))}
    </ol>
    <h3 style={{ margin: '2rem 0 0.6rem' }}>Cited as</h3>
    <div className="post-bibtex">{bibtex.trim()}</div>
  </div>
);

export default References;
