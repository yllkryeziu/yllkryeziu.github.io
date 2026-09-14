import React from 'react';
import type { Reference } from './Article';

export const JAX_REFS: Reference[] = [
  {
    n: 1,
    text: <>Padmanabhan, V. N. and Mogul, J. C. <em>Using Predictive Prefetching to Improve World Wide Web Latency</em>. ACM SIGCOMM Computer Communication Review, 1996.</>,
    url: 'https://dl.acm.org/doi/10.1145/235160.235164',
  },
  {
    n: 2,
    text: <>Dean, J. and Barroso, L. A. <em>The Tail at Scale</em>. Communications of the ACM 56(2), 2013.</>,
    url: 'https://research.google/pubs/the-tail-at-scale/',
  },
  {
    n: 3,
    text: <>Arlitt, M. and Williamson, C. <em>Internet Web Servers: Workload Characterization and Performance Implications</em>. IEEE/ACM Transactions on Networking, 1997.</>,
    url: 'https://dl.acm.org/doi/10.1109/90.649565',
  },
  {
    n: 4,
    text: <>The Internet Traffic Archive. <em>NASA-HTTP</em>: two months of HTTP requests to the NASA Kennedy Space Center server, 1995.</>,
    url: 'https://ita.ee.lbl.gov/html/contrib/NASA-HTTP.html',
  },
  {
    n: 5,
    text: <>Breslau, L., Cao, P., Fan, L., Phillips, G. and Shenker, S. <em>Web Caching and Zipf-like Distributions: Evidence and Implications</em>. IEEE INFOCOM, 1999.</>,
    url: 'https://ieeexplore.ieee.org/document/749260',
  },
  {
    n: 6,
    text: <>Guo, C., Pleiss, G., Sun, Y. and Weinberger, K. Q. <em>On Calibration of Modern Neural Networks</em>. ICML, 2017.</>,
    url: 'https://arxiv.org/abs/1706.04599',
  },
  {
    n: 7,
    text: <>Bradbury, J. et al. <em>JAX: composable transformations of Python+NumPy programs</em>.</>,
    url: 'https://github.com/jax-ml/jax',
  },
  {
    n: 8,
    text: <>DeepMind. <em>Optax: gradient processing and optimization library for JAX</em>.</>,
    url: 'https://github.com/google-deepmind/optax',
  },
  {
    n: 9,
    text: <>Heckerman, D. et al. <em>MSNBC.com Anonymous Web Data</em>. UCI Machine Learning Repository.</>,
    url: 'https://archive.ics.uci.edu/dataset/106/msnbc+com+anonymous+web+data',
  },
];

export const JAX_BIBTEX = `@article{kryeziu2026prefetch,
  title   = {A prefetch is a bet: cost-aware speculation on a real traffic trace},
  author  = {Kryeziu, Yll},
  journal = {yllkryeziu.github.io},
  year    = {2026},
  month   = {February},
  url     = {https://yllkryeziu.github.io/#work/jax}
}`;
