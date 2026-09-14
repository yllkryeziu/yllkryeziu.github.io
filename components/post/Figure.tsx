import React from 'react';

interface FigureProps {
  n: number;
  caption: React.ReactNode;
  plain?: boolean;
  children: React.ReactNode;
}

const Figure: React.FC<FigureProps> = ({ n, caption, plain, children }) => (
  <figure className={`post-figure${plain ? ' post-figure-plain' : ''}`}>
    <div className="post-figure-body">{children}</div>
    <figcaption className="post-caption">
      <span className="lbl">Fig. {n}.</span> {caption}
    </figcaption>
  </figure>
);

export default Figure;
