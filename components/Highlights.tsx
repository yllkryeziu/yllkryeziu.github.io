import React from 'react';
import type { HighlightItem } from '../types';

interface HighlightsProps {
  highlights: HighlightItem[];
}

const Highlights: React.FC<HighlightsProps> = ({ highlights }) => {
  return (
    <section>
      <div className="space-y-6 sm:space-y-8">
        {highlights.map((item, index) => (
          <div key={index} className="flex gap-3 sm:gap-8 items-start">
            <p className="w-16 sm:w-20 flex-shrink-0 text-gray-500 font-mono text-xs sm:text-sm whitespace-nowrap">{item.year}</p>
            <p
              className="text-sm sm:text-base text-gray-700 min-w-0"
              dangerouslySetInnerHTML={{ __html: item.description }}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default Highlights;