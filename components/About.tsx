import React from 'react';
import type { AboutData } from '../types';
import { ArrowUpRightIcon } from '../data';

interface AboutProps {
  about: AboutData;
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

const About: React.FC<AboutProps> = ({ about }) => {
  return (
    <section className="max-w-xl">
      <div className="space-y-5">
        {about.paragraphs.map((p, index) => (
          <p
            key={index}
            className="text-base text-stone-600 leading-[1.75] tracking-[-0.01em]"
          >
            <LinkRenderer text={p} />
          </p>
        ))}
      </div>
    </section>
  );
};

export default About;
