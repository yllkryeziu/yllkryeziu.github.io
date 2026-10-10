import type { HomeData } from './types';
import * as yaml from 'js-yaml';
import dataYaml from './data.yaml?raw';

const data = yaml.load(dataYaml) as HomeData;

// Turns [label](url) into a link; links that leave the site open in a new tab.
const processMarkdown = (text: string) =>
  text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) =>
    url.startsWith('#')
      ? `<a href="${url}">${label}</a>`
      : `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`);

export const homeData: HomeData = {
  ...data,
  about: data.about.map(processMarkdown),
  timeline: data.timeline.map(item => ({ year: item.year, text: processMarkdown(item.text) })),
};
