import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

function render(tex: string, displayMode: boolean): string {
  return katex.renderToString(tex, {
    displayMode,
    throwOnError: false,
    strict: false,
    trust: false,
  });
}

export const M: React.FC<{ children: string }> = ({ children }) => {
  const html = useMemo(() => render(children, false), [children]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

export const Eq: React.FC<{ children: string }> = ({ children }) => {
  const html = useMemo(() => render(children, true), [children]);
  return <div className="post-eq" dangerouslySetInnerHTML={{ __html: html }} />;
};
