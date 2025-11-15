import React from 'react';
import type { ProjectItem } from '../types';
import { ArrowUpRightIcon } from '../data';

const ProjectCard: React.FC<{ item: ProjectItem }> = ({ item }) => {
  return (
    <div className="relative py-4">
      {item.year && (
        <div className="absolute left-full ml-8 top-4 hidden xl:block">
            <span className="text-gray-400 font-mono text-sm transform-gpu -rotate-90 origin-top-left whitespace-nowrap">
                {item.year}
            </span>
        </div>
      )}
      
      <div className="space-y-3">
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.title} className="w-full rounded-xl object-cover aspect-[16/10]" />
        )}

        <div className="flex justify-between items-baseline">
          <h3 className="text-lg font-semibold text-gray-900">
            {item.title}
          </h3>
          <span className="text-sm text-gray-500 font-mono">{item.date}</span>
        </div>

        <p className="text-gray-700 leading-relaxed">{item.description}</p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
          {item.links && item.links.map(link => (
            <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-800 hover:underline inline-flex items-center">
              {link.name}
              <ArrowUpRightIcon className="w-3.5 h-3.5" />
            </a>
          ))}
          {item.tags && item.tags.map(tag => (
            <span key={tag} className="text-gray-500 text-sm font-mono">{tag}</span>
          ))}
        </div>
      </div>
    </div>
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