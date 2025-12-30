import React, { useState } from 'react';
import type { CVData, CVItem, EducationItem } from '../types';
import { ArrowUpRightIcon } from '../data';

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-6">
    {children}
  </h2>
);

const EducationItemComponent: React.FC<{
  item: EducationItem;
  id: string;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ item, id, isExpanded, onToggle }) => {
  return (
    <div className="group -mx-3 px-3 py-2 -my-2 rounded-lg transition-colors duration-150 hover:bg-stone-900/[0.02] dark:hover:bg-white/[0.03]">
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
          <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 inline-flex items-center gap-1">
            {item.institutionUrl ? (
              <a
                href={item.institutionUrl}
                onClick={(e) => e.stopPropagation()}
                className="link-underline hover:text-accent transition-colors inline-flex items-center gap-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.institution}
                <ArrowUpRightIcon className="w-3.5 h-3.5 text-stone-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            ) : (
              item.institution
            )}
          </h3>
          <p className="text-stone-500 text-sm mt-0.5">{item.degree}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-stone-400 text-xs font-mono whitespace-nowrap">
            {item.period}
          </span>
          {item.details && (
            <span
              className={`text-stone-400 text-sm select-none transition-transform duration-200 ${
                isExpanded ? 'rotate-45' : 'rotate-0'
              }`}
            >
              +
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
        <div className={`pl-4 border-l-2 transition-colors duration-300 ${
          isExpanded ? 'border-accent/40' : 'border-accent/20'
        }`}>
          <p className="text-stone-500 text-sm leading-relaxed">
            {item.details}
          </p>
        </div>
      </div>
    </div>
  );
};

const InitiativeItem: React.FC<{
  item: CVItem;
  id: string;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ item, id, isExpanded, onToggle }) => {
  return (
    <div className="group -mx-3 px-3 py-2 -my-2 rounded-lg transition-colors duration-150 hover:bg-stone-900/[0.02] dark:hover:bg-white/[0.03]">
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
          <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 inline-flex items-center gap-1">
            {item.companyUrl ? (
              <a
                href={item.companyUrl}
                onClick={(e) => e.stopPropagation()}
                className="link-underline hover:text-accent transition-colors inline-flex items-center gap-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.company}
                <ArrowUpRightIcon className="w-3.5 h-3.5 text-stone-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            ) : (
              item.company || item.role
            )}
          </h3>
          {item.company && (
            <p className="text-stone-500 text-sm mt-0.5">{item.role}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-stone-400 text-xs font-mono whitespace-nowrap">
            {item.period}
          </span>
          {item.details && (
            <span
              className={`text-stone-400 text-sm select-none transition-transform duration-200 ${
                isExpanded ? 'rotate-45' : 'rotate-0'
              }`}
            >
              +
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
        <div className={`pl-4 border-l-2 transition-colors duration-300 ${
          isExpanded ? 'border-accent/40' : 'border-accent/20'
        }`}>
          <p className="text-stone-500 text-sm leading-relaxed">
            {item.details}
          </p>
        </div>
      </div>
    </div>
  );
};

const Education: React.FC<{ cv: CVData }> = ({ cv }) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  return (
    <div className="space-y-12">
      {/* Education Section */}
      <section>
        <SectionTitle>{cv.education.title}</SectionTitle>
        <div className="space-y-6">
          {cv.education.items.map((item, index) => {
            const id = `edu-${index}`;
            return (
              <EducationItemComponent
                key={id}
                item={item}
                id={id}
                isExpanded={expandedItem === id}
                onToggle={() => toggleItem(id)}
              />
            );
          })}
        </div>
      </section>

      {/* Initiatives Section */}
      {cv.initiatives && (
        <section>
          <SectionTitle>{cv.initiatives.title}</SectionTitle>
          <div className="space-y-6">
            {cv.initiatives.items.map((item, index) => {
              const id = `init-${index}`;
              return (
                <InitiativeItem
                  key={id}
                  item={item}
                  id={id}
                  isExpanded={expandedItem === id}
                  onToggle={() => toggleItem(id)}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default Education;
