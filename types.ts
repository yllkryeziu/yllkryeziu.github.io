export interface LinkItem {
  label: string;
  url: string;
}

export interface TimelineItem {
  year: string;
  text: string;
}

export interface HomeData {
  name: string;
  role: string;
  about: string[];
  links: LinkItem[];
  timeline: TimelineItem[];
}
