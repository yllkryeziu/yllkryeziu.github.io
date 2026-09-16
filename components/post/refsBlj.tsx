import React from 'react';
import type { Reference } from './Article';

export const BLJ_REFS: Reference[] = [
  {
    n: 1,
    text: <>Snark, Kyman, sonicpacker, Mickey-VIS and ToT. <em>Super Mario 64 "0 star" in 06:20.55</em>. TASVideos movie 2016M. The reference input stream used to validate the simulator.</>,
    url: 'https://tasvideos.org/2016M',
  },
  {
    n: 2,
    text: <>n64decomp. <em>sm64</em>: a byte-matching decompilation of Super Mario 64. Commit <code>9921382a</code> is the diff baseline for the long-jump chain.</>,
    url: 'https://github.com/n64decomp/sm64',
  },
  {
    n: 3,
    text: <>libsm64: the decompilation's Mario compiled as a shared library, stepped one frame at a time by <code>sm64_mario_tick</code>.</>,
    url: 'https://github.com/libsm64/libsm64',
  },
  {
    n: 4,
    text: <>sm64-port: a native port of the decompilation. Used here only as a renderer.</>,
    url: 'https://github.com/sm64-port/sm64-port',
  },
  {
    n: 5,
    text: <>Schulman, J., Wolski, F., Dhariwal, P., Radford, A. and Klimov, O. <em>Proximal Policy Optimization Algorithms</em>. 2017.</>,
    url: 'https://arxiv.org/abs/1707.06347',
  },
  {
    n: 6,
    text: <>Raffin, A. et al. <em>Stable-Baselines3: Reliable Reinforcement Learning Implementations</em>. JMLR, 2021.</>,
    url: 'https://jmlr.org/papers/v22/20-1364.html',
  },
  {
    n: 7,
    text: <>Ng, A. Y., Harada, D. and Russell, S. <em>Policy Invariance Under Reward Transformations: Theory and Application to Reward Shaping</em>. ICML, 1999.</>,
    url: 'https://people.eecs.berkeley.edu/~russell/papers/ml99-shaping.pdf',
  },
  {
    n: 8,
    text: <>Krakovna, V. et al. <em>Specification Gaming: The Flip Side of AI Ingenuity</em>. DeepMind, 2020.</>,
    url: 'https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/',
  },
  {
    n: 9,
    text: <>Clark, J. and Amodei, D. <em>Faulty Reward Functions in the Wild</em>. OpenAI, 2016. The CoastRunners boat that farms turbo pads instead of finishing the race.</>,
    url: 'https://openai.com/index/faulty-reward-functions/',
  },
  {
    n: 10,
    text: <>Henderson, P., Islam, R., Bachman, P., Pineau, J., Precup, D. and Meger, D. <em>Deep Reinforcement Learning That Matters</em>. AAAI, 2018. On seed variance and what it does to reported results.</>,
    url: 'https://arxiv.org/abs/1709.06560',
  },
  {
    n: 11,
    text: <>Ecoffet, A., Huizinga, J., Lehman, J., Stanley, K. O. and Clune, J. <em>First Return, Then Explore</em>. Nature, 2021. The archive-based answer to hard-exploration problems.</>,
    url: 'https://www.nature.com/articles/s41586-020-03157-8',
  },
  {
    n: 12,
    text: <>Towers, M. et al. <em>Gymnasium: A Standard Interface for Reinforcement Learning Environments</em>. 2024.</>,
    url: 'https://arxiv.org/abs/2407.17032',
  },
];

export const BLJ_BIBTEX = `@misc{kryeziu2026blj,
  title  = {Discovery cost: teaching PPO to break Super Mario 64},
  author = {Kryeziu, Yll},
  year   = {2026},
  note   = {https://yllkryeziu.github.io/#work/blj}
}`;
