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
    <section className="space-y-4 text-gray-700 leading-relaxed">
      {about.paragraphs.map((p, index) => (
        <p key={index}>
          <LinkRenderer text={p} />
        </p>
      ))}
    </section>
  );
};

export default About;
