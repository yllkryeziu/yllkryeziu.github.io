import React from 'react';
import type { Reference } from './Article';

export const FERRET_REFS: Reference[] = [
  {
    n: 1,
    text: <>Cox, R. <em>Regular Expression Matching with a Trigram Index, or How Google Code Search Worked</em>. 2012.</>,
    url: 'https://swtch.com/~rsc/regexp/regexp4.html',
  },
  {
    n: 2,
    text: <>Sourcegraph. <em>Zoekt: fast trigram based code search</em>. See <code>doc/design.md</code>.</>,
    url: 'https://github.com/sourcegraph/zoekt',
  },
  {
    n: 3,
    text: <>Google. <em>RE2: a regular expression library with linear-time matching</em>.</>,
    url: 'https://github.com/google/re2',
  },
  {
    n: 4,
    text: <>Clem, T. <em>The technology behind GitHub’s new code search</em>. GitHub blog, 2023.</>,
    url: 'https://github.blog/engineering/architecture-optimization/the-technology-behind-githubs-new-code-search/',
  },
  {
    n: 5,
    text: <>Lemire, D., Boytsov, L. and Kurz, N. <em>SIMD Compression and the Intersection of Sorted Integers</em>. Software: Practice and Experience 46(6), 2016.</>,
    url: 'https://arxiv.org/abs/1401.6399',
  },
  {
    n: 6,
    text: <>Apple. <em>File System Events</em>. Core Services documentation.</>,
    url: 'https://developer.apple.com/documentation/coreservices/file_system_events',
  },
  {
    n: 7,
    text: <>Meta. <em>Watchman: a file watching service</em>.</>,
    url: 'https://facebook.github.io/watchman/',
  },
  {
    n: 8,
    text: <><em>Model Context Protocol</em>. Specification.</>,
    url: 'https://modelcontextprotocol.io',
  },
  {
    n: 9,
    text: <>OpenAI. <em>Codex CLI</em>. Version 0.160.0.</>,
    url: 'https://github.com/openai/codex',
  },
  {
    n: 10,
    text: <><em>Loc-Bench_V1</em>, the code localization benchmark released with LocAgent.</>,
    url: 'https://huggingface.co/datasets/czlll/Loc-Bench_V1',
  },
  {
    n: 11,
    text: <><em>The SWE-Bench Illusion: When State-of-the-Art LLMs Remember Instead of Reason</em>. arXiv:2506.12286, 2025.</>,
    url: 'https://arxiv.org/abs/2506.12286',
  },
];

export const FERRET_BIBTEX = `@misc{kryeziu2026ferret,
  title   = {How code search works, and what coding agents need from it},
  author  = {Kryeziu, Yll},
  year    = {2026},
  month   = {October},
  url     = {https://yllkryeziu.github.io/#work/ferret}
}`;
