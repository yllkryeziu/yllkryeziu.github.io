
import React from 'react';
import type { AboutData, HighlightItem } from '../types';
import { ArrowUpRightIcon } from '../data';

interface AboutAndHighlightsProps {
  about: AboutData;
  highlights: HighlightItem[];
}

const LinkRenderer: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(↗|↘|↓)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (['↗', '↘', '↓'].includes(part)) {
          return <ArrowUpRightIcon key={index} />;
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
};


const AboutAndHighlights: React.FC<AboutAndHighlightsProps> = ({ about, highlights }) => {
  return (
    <div className="space-y-16">
      <section className="space-y-4 text-gray-700 leading-relaxed">
        {about.paragraphs.map((p, index) => (
          <p key={index}>
            <LinkRenderer text={p} />
          </p>
        ))}
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Highlights</h2>
        <div className="space-y-8">
          {highlights.map((item, index) => (
            <div key={index} className="flex gap-4 sm:gap-8 items-start">
              <p className="text-gray-500 font-mono text-sm pt-1 whitespace-nowrap">{item.year}</p>
              <p 
                className="text-gray-700"
                dangerouslySetInnerHTML={{ __html: item.description }}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AboutAndHighlights;
