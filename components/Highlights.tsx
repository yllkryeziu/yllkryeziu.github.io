import React from 'react';
import type { HighlightItem } from '../types';

interface HighlightsProps {
  highlights: HighlightItem[];
}

const Highlights: React.FC<HighlightsProps> = ({ highlights }) => {
  return (
    <section>
      <div className="space-y-8">
        {highlights.map((item, index) => (
          <div key={index} className="flex gap-4 sm:gap-8 items-start">
            <p className="w-20 flex-shrink-0 text-gray-500 font-mono text-sm pt-1 whitespace-nowrap">{item.year}</p>
            <p 
              className="text-gray-700"
              dangerouslySetInnerHTML={{ __html: item.description }}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default Highlights;