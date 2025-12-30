import React from 'react';
import type { ProjectItem } from '../types';
import { ArrowUpRightIcon } from '../data';

const ProjectCard: React.FC<{ item: ProjectItem }> = ({ item }) => {
  return (
    <article className="group -mx-3 px-3 py-3 -my-3 rounded-xl transition-all duration-200 hover:bg-stone-900/[0.02] dark:hover:bg-white/[0.03] hover:-translate-y-0.5">
      {/* Image */}
      {item.imageUrl && (
        <div className="mb-4 overflow-hidden rounded-lg">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full aspect-[16/10] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 sm:gap-4">
        <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
          {item.title}
        </h3>
        <span className="text-xs text-stone-400 font-mono whitespace-nowrap">
          {item.date}
        </span>
      </div>

      {/* Description */}
      <p
        className="mt-2 text-stone-500 dark:text-stone-400 text-sm leading-relaxed [&_a]:text-stone-900 dark:[&_a]:text-stone-100 [&_a]:underline [&_a]:decoration-stone-300 dark:[&_a]:decoration-stone-600 [&_a]:underline-offset-2 hover:[&_a]:decoration-accent [&_a]:transition-colors"
        dangerouslySetInnerHTML={{ __html: item.description }}
      />

      {/* Links & Tags */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Links */}
        {item.links && item.links.map(link => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline text-sm font-medium text-stone-700 dark:text-stone-300 hover:text-accent transition-colors inline-flex items-center gap-1"
          >
            {link.name}
            <ArrowUpRightIcon className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        ))}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 transition-opacity duration-200 opacity-60 group-hover:opacity-100">
            {item.tags.map(tag => (
              <span
                key={tag}
                className="text-xs font-mono text-stone-400 bg-stone-100/80 dark:bg-stone-800/80 px-1.5 py-0.5 rounded"
              >
                {tag.replace('#', '')}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
};

const Projects: React.FC<{ projects: ProjectItem[] }> = ({ projects }) => {
  return (
    <div className="space-y-8">
      {projects.map(item => (
        <ProjectCard key={item.id} item={item} />
      ))}
    </div>
  );
};

export default Projects;
