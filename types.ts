export type View = 'Highlights' | 'Experience' | 'Education' | 'Projects' | 'About';

export interface AboutData {
  name: string;
  bio: string;
  avatarUrl: string;
  paragraphs: string[];
  email: string;
  linkedinUrl: string;
  githubUrl: string;
}

export interface HighlightItem {
  year: string;
  description: string;
}

export interface CVItem {
  period: string;
  role: string;
  company: string;
  companyUrl: string;
  details?: string;
}

export interface EducationItem {
  period: string;
  degree: string;
  institution: string;
  institutionUrl: string;
  details?: string;
}

export interface CVData {
  experience: {
    title: string;
    items: CVItem[];
  };
  volunteering?: {
    title: string;
    items: CVItem[];
  };
  education: {
    title: string;
    items: EducationItem[];
  };
}

export interface ProjectLink {
  name: string;
  url: string;
}

export interface ProjectItem {
  id: number;
  imageUrl: string;
  title: string;
  links?: ProjectLink[];
  date: string;
  description: string;
  tags: string[];
  pinned?: boolean;
  year?: string;
}