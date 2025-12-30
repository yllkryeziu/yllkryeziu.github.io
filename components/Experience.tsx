import React, { useState } from 'react';
import type { CVData, CVItem } from '../types';
import { ArrowUpRightIcon } from '../data';

const ExperienceItem: React.FC<{
  item: CVItem;
  id: string;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ item, id, isExpanded, onToggle }) => {
  return (
    <div className="group">
      <div
        className={`flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 sm:gap-6 ${
          item.details ? 'cursor-pointer' : ''
        }`}
        onClick={() => item.details && onToggle()}
        role={item.details ? "button" : undefined}
        aria-expanded={item.details ? isExpanded : undefined}
        aria-controls={item.details ? `details-${id}` : undefined}
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-stone-900 inline-flex items-center gap-1">
            {item.companyUrl ? (
              <a
                href={item.companyUrl}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-accent transition-colors inline-flex items-center gap-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.company}
                <ArrowUpRightIcon className="w-3.5 h-3.5 text-stone-400" />
              </a>
            ) : (
              item.company || item.role
            )}
          </h3>
          {item.company && (
            <p className="text-stone-600 mt-0.5">{item.role}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-stone-400 text-sm font-mono whitespace-nowrap">
            {item.period}
          </span>
          {item.details && (
            <span className="text-stone-400 text-sm transition-transform duration-200 select-none">
              {isExpanded ? '−' : '+'}
            </span>
          )}
        </div>
      </div>

      {/* Expandable Details */}
      <div
        id={`details-${id}`}
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isExpanded ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="pl-4 border-l-2 border-accent/20">
          <p className="text-stone-500 text-sm leading-relaxed">
            {item.details}
          </p>
        </div>
      </div>
    </div>
  );
};

const Experience: React.FC<{ cv: CVData }> = ({ cv }) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  return (
    <div className="space-y-8">
      {cv.experience.items.map((item, index) => {
        const id = `exp-${index}`;
        return (
          <ExperienceItem
            key={id}
            item={item}
            id={id}
            isExpanded={expandedItem === id}
            onToggle={() => toggleItem(id)}
          />
        );
      })}
    </div>
  );
};

export default Experience;
