import React from 'react';
import type { AboutData, HighlightItem, CVData, ProjectItem } from './types';
import * as yaml from 'js-yaml';
import dataYaml from './data.yaml?raw';

export const ArrowUpRightIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={`inline-block ml-1 opacity-70 ${className}`}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
  </svg>
);

export const MailIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

export const LinkedInIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.25 6.5 1.75 1.75 0 016.5 8.25zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93-.91 0-1.38.61-1.38 1.93V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.28.93 3.28 4.3v4.84z"></path>
  </svg>
);

export const GitHubIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.168 6.839 9.492.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
  </svg>
);

export const SunIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
);

export const ChevronDownIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

// Load and parse YAML data
const data = yaml.load(dataYaml) as any;

const processMarkdown = (text: string) => {
  if (!text) return "";
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-gray-900 underline decoration-gray-400 hover:decoration-gray-900 transition-colors">${label}</a>`;
  });
};

export const aboutData: AboutData = {
  name: data.name,
  bio: data.bio,
  avatarUrl: data.avatarUrl,
  email: data.email,
  linkedinUrl: data.linkedinUrl,
  githubUrl: data.githubUrl,
  paragraphs: data.about.paragraphs
};

export const highlightsData: HighlightItem[] = data.highlights.map((item: any) => ({
  year: item.year,
  description: processMarkdown(item.description)
}));

export const cvData: CVData = {
  experience: {
    title: data.cv.experience.title,
    items: data.cv.experience.items.map((item: any) => ({
      period: item.period,
      role: item.role,
      company: item.company,
      companyUrl: item.companyUrl,
      details: item.details
    }))
  },
  initiatives: data.cv.initiatives ? {
    title: data.cv.initiatives.title,
    items: data.cv.initiatives.items.map((item: any) => ({
      period: item.period,
      role: item.role,
      company: item.company,
      companyUrl: item.companyUrl,
      details: item.details
    }))
  } : undefined,
  education: {
    title: data.cv.education.title,
    items: data.cv.education.items.map((item: any) => ({
      period: item.period,
      degree: item.degree,
      institution: item.institution,
      institutionUrl: item.institutionUrl,
      details: item.details
    }))
  }
};

export const projectsData: ProjectItem[] = data.projects.map((project: any) => ({
  id: project.id,
  imageUrl: project.imageUrl,
  title: project.title,
  links: project.links || [],
  date: project.date,
  description: processMarkdown(project.description),
  tags: project.tags,
  pinned: project.pinned || false,
  year: project.year
}));
