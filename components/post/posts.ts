export type PostSlug = 'thesis' | 'jax' | 'simd' | 'secret' | 'blj';

export interface PostMeta {
  slug: PostSlug;
  kicker: string;
  title: string;
  dek: string;
  date: string;
  sortDate: number;
  readingMinutes: number;
  repo?: { label: string; url: string };
}

const REPO_ROOT = 'https://github.com/yllkryeziu/yllkryeziu.github.io/tree/main/projects';

export const POSTS: PostMeta[] = [
  {
    slug: 'blj',
    kicker: 'Reinforcement Learning · Reward Design · Exploration',
    title: 'How much help does reinforcement learning need to break Super Mario 64?',
    dek: "I trained 24 PPO agents to climb Mario's endless stairs using four different rewards. All six agents rewarded for backward speed reached the landing; none rewarded for height did. One found the backwards long jump with only a reward for finishing. Here is what the runs reveal about reward design and what the policies learned.",
    date: 'September 2026',
    sortDate: 202610,
    readingMinutes: 20,
    repo: { label: 'mario-blj', url: 'https://github.com/yllkryeziu/mario-blj' },
  },
  {
    slug: 'secret',
    kicker: 'Interpretability · LLM Evaluation · Games',
    title: 'Can a model keep a secret it never wrote down?',
    dek: 'Asked to think of an animal and not reveal it, Qwen3.5-9B contradicts itself in 99.5% of games. Naming the animal in the prompt restores 15 points of self-consistency, so most of the inconsistency comes from failing to hold the referent rather than from unstable beliefs about animals.',
    date: 'September 2026',
    sortDate: 202609,
    readingMinutes: 16,
    repo: { label: 'latent-commitment', url: `${REPO_ROOT}/latent-commitment` },
  },
  {
    slug: 'thesis',
    kicker: 'Machine Learning · LLM Reasoning · Distillation',
    title: 'On-policy self-distillation for adaptive compute',
    dek: 'Reasoning models overthink. I let a model rewrite its own reasoning to a length that matches the problem, then distilled that behaviour back into the weights, using no reward model, no difficulty labels and no ground-truth answers.',
    date: 'February 2026',
    sortDate: 202602,
    readingMinutes: 18,
  },
  {
    slug: 'jax',
    kicker: 'Systems · Machine Learning · JAX',
    title: 'A prefetch is a bet: cost-aware speculation on a real traffic trace',
    dek: 'Every speculative fetch spends origin capacity to buy latency that may never be needed. I trained a JAX next-request predictor on 3.4M real HTTP requests and priced each bet against live queue depth. Unconditional prefetching raises p95 by 183% when the origin saturates. The priced version leaves it unchanged and keeps the upside.',
    date: 'February 2026',
    sortDate: 202602,
    readingMinutes: 22,
    repo: { label: 'jax-prefetch', url: `${REPO_ROOT}/jax-prefetch` },
  },
  {
    slug: 'simd',
    kicker: 'Performance Engineering · JVM × Native',
    title: 'What crossing the JNI boundary actually costs',
    dek: 'A SIMD JSON parser reached from Java runs 5.2x faster than the best JVM parser and allocates about a million times less heap. One crossing of the JNI boundary costs 10 nanoseconds, so what matters is not the boundary itself but how many times a design makes you cross it.',
    date: 'October 2025',
    sortDate: 202510,
    readingMinutes: 19,
    repo: { label: 'simdjson-jni', url: `${REPO_ROOT}/simdjson-jni` },
  },
];

export const POST_BY_SLUG: Record<PostSlug, PostMeta> = POSTS.reduce(
  (acc, post) => ({ ...acc, [post.slug]: post }),
  {} as Record<PostSlug, PostMeta>,
);
