import React from 'react';
import type { HighlightItem } from '../types';

interface HighlightsProps {
  highlights: HighlightItem[];
}

const Highlights: React.FC<HighlightsProps> = ({ highlights }) => {
  return (
    <section>
      <div className="space-y-6">
        {highlights.map((item, index) => (
          <div
            key={index}
            className="flex gap-4 sm:gap-6 items-baseline group"
          >
            <span className="w-16 sm:w-20 flex-shrink-0 text-stone-400 font-mono text-xs sm:text-sm">
              {item.year}
            </span>
            <div className="flex-1 relative">
              <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-stone-100 group-hover:bg-accent/30 transition-colors duration-200" />
              <p
                className="text-sm sm:text-base text-stone-600 leading-relaxed [&_b]:text-stone-900 [&_b]:font-semibold [&_a]:text-stone-900 [&_a]:underline [&_a]:decoration-stone-300 [&_a]:underline-offset-2 hover:[&_a]:decoration-accent [&_a]:transition-colors"
                dangerouslySetInnerHTML={{ __html: item.description }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Highlights;
