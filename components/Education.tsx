import React, { useState } from 'react';
import type { CVData, CVItem, EducationItem } from '../types';
import { ArrowUpRightIcon, ChevronDownIcon } from '../data';

interface CVSectionProps<T> {
  title: string;
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}

const CVSection = <T,>({ title, items, renderItem }: CVSectionProps<T>) => (
  <section>
    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">{title}</h2>
    <div className="space-y-6 sm:space-y-8">
      {items.map((item, index) => renderItem(item, index))}
    </div>
  </section>
);

const Education: React.FC<{ cv: CVData }> = ({ cv }) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  const renderExperienceItem = (item: CVItem, index: number) => {
    const id = `vol-${index}`;
    const isExpanded = expandedItem === id;

    return (
      <div key={id}>
        <div
          className={`flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 ${item.details ? 'cursor-pointer' : ''}`}
          onClick={() => item.details && toggleItem(id)}
          role="button"
          aria-expanded={isExpanded}
          aria-controls={`details-${id}`}
        >
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              {item.company ? (
                <a href={item.companyUrl} onClick={(e) => e.stopPropagation()} className="hover:underline inline-flex items-center">
                  {item.company}
                  <ArrowUpRightIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                </a>
              ) : (
                item.role
              )}
            </h3>
            {item.company && <p className="text-sm sm:text-lg text-gray-800 mt-1">{item.role}</p>}
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <p className="text-gray-500 text-xs sm:text-sm whitespace-nowrap">{item.period}</p>
            {item.details && (
              <ChevronDownIcon className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
            )}
          </div>
        </div>
        {isExpanded && item.details && (
          <div id={`details-${id}`} className="mt-4 pl-4 border-l-2 border-gray-200 text-gray-600 leading-relaxed">
            <p>{item.details}</p>
          </div>
        )}
      </div>
    );
  };

  const renderEducationItem = (item: EducationItem, index: number) => {
     const id = `edu-${index}`;
     const isExpanded = expandedItem === id;

     return (
       <div key={id}>
         <div
           className={`flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 ${item.details ? 'cursor-pointer' : ''}`}
           onClick={() => item.details && toggleItem(id)}
           role="button"
           aria-expanded={isExpanded}
           aria-controls={`details-${id}`}
         >
           <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
               <a href={item.institutionUrl} onClick={(e) => e.stopPropagation()} className="hover:underline inline-flex items-center">
                   {item.institution}
                   <ArrowUpRightIcon className="w-3 h-3 sm:w-4 sm:h-4" />
               </a>
            </h3>
            <p className="text-sm sm:text-lg text-gray-800 mt-1">{item.degree}</p>
          </div>
           <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <p className="text-gray-500 text-xs sm:text-sm whitespace-nowrap">{item.period}</p>
            {item.details && (
              <ChevronDownIcon className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
            )}
          </div>
         </div>
         {isExpanded && item.details && (
           <div id={`details-${id}`} className="mt-4 pl-4 border-l-2 border-gray-200 text-gray-600 leading-relaxed">
             <p>{item.details}</p>
           </div>
         )}
       </div>
     );
  };

  return (
    <div className="space-y-16">
      <CVSection title={cv.education.title} items={cv.education.items} renderItem={renderEducationItem} />
      {cv.initiatives && (
        <CVSection title={cv.initiatives.title} items={cv.initiatives.items} renderItem={renderExperienceItem} />
      )}
    </div>
  );
};

export default Education;
