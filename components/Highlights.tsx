import React from 'react';
import type { HighlightItem } from '../types';

interface HighlightsProps {
  highlights: HighlightItem[];
}

const Highlights: React.FC<HighlightsProps> = ({ highlights }) => {
  return (
    <section>
      <div className="space-y-4">
        {highlights.map((item, index) => (
          <div
            key={index}
            className="flex gap-4 sm:gap-6 items-baseline group -mx-3 px-3 py-2 -my-2 rounded-lg transition-colors duration-150 hover:bg-stone-900/[0.02] dark:hover:bg-white/[0.03]"
          >
            <span className="w-14 sm:w-16 flex-shrink-0 text-stone-400 font-mono text-xs tabular-nums">
              {item.year}
            </span>
            <div className="flex-1 relative">
              <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-transparent group-hover:bg-accent/30 transition-colors duration-200" />
              <p
                className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed [&_b]:text-stone-900 dark:[&_b]:text-stone-100 [&_b]:font-semibold [&_a]:text-stone-900 dark:[&_a]:text-stone-100 [&_a]:underline [&_a]:decoration-stone-300 dark:[&_a]:decoration-stone-600 [&_a]:underline-offset-2 hover:[&_a]:decoration-accent [&_a]:transition-colors"
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
