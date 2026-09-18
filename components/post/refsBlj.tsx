import React from 'react';
import type { Reference } from './Article';
import { POST_BY_SLUG } from './posts';

export const BLJ_REFS: Reference[] = [
  {
    n: 1,
    text: <>snark, Kaylee, sonicpacker, MICKEY_Vis11189 and ToT. <em>N64 Super Mario 64 "0 stars" in 05:02.25</em>. TASVideos movie 2016M, 2012. Reference input stream for the simulator comparison.</>,
    url: 'https://tasvideos.org/2016M',
  },
  {
    n: 2,
    text: <>n64decomp. <em>sm64</em>. Long-jump launch code in <code>src/game/mario.c</code>, commit <code>9921382a</code>.</>,
    url: 'https://github.com/n64decomp/sm64/blob/9921382a68bb0c865e5e45eb594d9c64db59b1af/src/game/mario.c#L861-L873',
  },
  {
    n: 3,
    text: <>libsm64 contributors. <em>libsm64</em>. Mario physics as a shared library; <code>sm64_mario_tick</code> and controller scaling in <code>src/libsm64.c</code>, commit <code>fd118132</code>.</>,
    url: 'https://github.com/libsm64/libsm64/blob/fd11813208272b4271d92bd92feb8f3fdbe61be5/src/libsm64.c#L230-L243',
  },
  {
    n: 4,
    text: <>sm64-port contributors. <em>sm64-port</em>. Native game port, commit <code>2b17d081</code>. Locally patched for reference replay and rendering recorded states.</>,
    url: 'https://github.com/sm64-port/sm64-port/tree/2b17d081c9798b31b91dc71f37994b0da28cffc9',
  },
  {
    n: 5,
    text: <>Schulman, J., Wolski, F., Dhariwal, P., Radford, A. and Klimov, O. <em>Proximal Policy Optimization Algorithms</em>. arXiv:1707.06347, 2017.</>,
    url: 'https://arxiv.org/abs/1707.06347',
  },
  {
    n: 6,
    text: <>Raffin, A., Hill, A., Gleave, A., Kanervisto, A., Ernestus, M. and Dormann, N. <em>Stable-Baselines3: Reliable Reinforcement Learning Implementations</em>. JMLR 22(268):1–8, 2021.</>,
    url: 'https://jmlr.org/papers/v22/20-1364.html',
  },
  {
    n: 7,
    text: <>Ng, A. Y., Harada, D. and Russell, S. <em>Policy Invariance Under Reward Transformations: Theory and Application to Reward Shaping</em>. ICML, 1999.</>,
    url: 'https://people.eecs.berkeley.edu/~russell/papers/icml99-shaping.pdf',
  },
  {
    n: 8,
    text: <>Krakovna, V. et al. <em>Specification Gaming: The Flip Side of AI Ingenuity</em>. DeepMind, 2020.</>,
    url: 'https://deepmind.google/blog/specification-gaming-the-flip-side-of-ai-ingenuity/',
  },
  {
    n: 9,
    text: <>Clark, J. and Amodei, D. <em>Faulty Reward Functions in the Wild</em>. OpenAI, 2016. A CoastRunners agent repeatedly hits respawning targets instead of finishing the race.</>,
    url: 'https://openai.com/index/faulty-reward-functions/',
  },
  {
    n: 10,
    text: <>Henderson, P., Islam, R., Bachman, P., Pineau, J., Precup, D. and Meger, D. <em>Deep Reinforcement Learning That Matters</em>. AAAI, 2018. On seed variance and what it does to reported results.</>,
    url: 'https://ojs.aaai.org/index.php/AAAI/article/view/11694',
  },
  {
    n: 11,
    text: <>Ecoffet, A., Huizinga, J., Lehman, J., Stanley, K. O. and Clune, J. <em>First Return, Then Explore</em>. Nature 590:580–586, 2021. Introduces Go-Explore.</>,
    url: 'https://www.nature.com/articles/s41586-020-03157-9',
  },
  {
    n: 12,
    text: <>Towers, M. et al. <em>Gymnasium: A Standard Interface for Reinforcement Learning Environments</em>. NeurIPS 38, Datasets and Benchmarks Track, 2025. First preprint, 2024.</>,
    url: 'https://proceedings.neurips.cc/paper_files/paper/2025/hash/d7ff1795e8527f6443371c3933bdb52b-Abstract-Datasets_and_Benchmarks_Track.html',
  },
  {
    n: 13,
    text: <>Kryeziu, Y. <em>Mario BLJ: TAS comparison results</em>. Project measurements from <code>results/tas_validation.json</code>, commit <code>d300897d</code>. Includes the compared chains, camera alignment and known simulator gaps.</>,
    url: 'blj-study/validation.json',
  },
];

export const BLJ_BIBTEX = `@misc{kryeziu2026blj,
  title  = {${POST_BY_SLUG.blj.title}},
  author = {Kryeziu, Yll},
  year   = {2026},
  url    = {https://yllkryeziu.github.io/#work/blj}
}`;
