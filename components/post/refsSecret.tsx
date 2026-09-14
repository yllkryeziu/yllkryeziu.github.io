import React from 'react';
import type { Reference } from './Article';

export const SECRET_REFS: Reference[] = [
  {
    n: 1,
    text: <>Lampinen, A. K. et al. <em>Decoding Answers Before Chain-of-Thought: Evidence from Pre-CoT Probes and Activation Steering</em>. 2026.</>,
    url: 'https://arxiv.org/pdf/2603.01437',
  },
  {
    n: 2,
    text: <>Hu, E. et al. <em>No Answer Needed: Predicting LLM Answer Accuracy from Question-Only Linear Probes</em>. 2025.</>,
    url: 'https://arxiv.org/abs/2509.10625',
  },
  {
    n: 3,
    text: <>Li, K. et al. <em>Emergent World Representations: Exploring a Sequence Model Trained on a Synthetic Task</em>. ICLR, 2023.</>,
    url: 'https://arxiv.org/abs/2210.13382',
  },
  {
    n: 4,
    text: <>Xian, Y., Lampert, C. H., Schiele, B. and Akata, Z. <em>Zero-Shot Learning: A Comprehensive Evaluation of the Good, the Bad and the Ugly</em>. IEEE TPAMI, 2019. Source of the Animals with Attributes 2 matrix.</>,
    url: 'https://cvml.ista.ac.at/AwA2/',
  },
  {
    n: 5,
    text: <>Guo, C., Pleiss, G., Sun, Y. and Weinberger, K. Q. <em>On Calibration of Modern Neural Networks</em>. ICML, 2017.</>,
    url: 'https://arxiv.org/abs/1706.04599',
  },
  {
    n: 6,
    text: <>Qwen Team. <em>Qwen3.5-9B</em>. Hugging Face model card.</>,
    url: 'https://huggingface.co/Qwen/Qwen3.5-9B',
  },
];

export const SECRET_BIBTEX = `@article{kryeziu2026secret,
  title   = {Can a model keep a secret it never wrote down?},
  author  = {Kryeziu, Yll},
  journal = {yllkryeziu.github.io},
  year    = {2026},
  month   = {September},
  url     = {https://yllkryeziu.github.io/#work/secret}
}`;
