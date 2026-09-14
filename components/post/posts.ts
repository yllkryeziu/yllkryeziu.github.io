export type PostSlug = 'thesis' | 'jax' | 'simd';

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
    slug: 'thesis',
    kicker: 'Machine Learning · LLM Reasoning · Distillation',
    title: 'On-policy self-distillation for adaptive compute',
    dek: 'Reasoning models overthink. I let a model rewrite its own reasoning to the right length, then distill that behavior back in — no reward model, no difficulty labels, just the model itself.',
    date: 'February 2026',
    sortDate: 202602,
    readingMinutes: 18,
  },
  {
    slug: 'jax',
    kicker: 'Systems · Machine Learning · JAX',
    title: 'A prefetch is a bet: cost-aware speculation on a real traffic trace',
    dek: 'Every speculative fetch spends origin capacity to buy latency that may never be needed. I trained a JAX next-request predictor on 3.4M real HTTP requests and priced each bet against live queue depth. Unconditional prefetching raises p95 by 183% when the origin saturates. The priced version leaves it unchanged and keeps the upside.',
    date: 'September 2026',
    sortDate: 202609,
    readingMinutes: 22,
    repo: { label: 'jax-prefetch', url: `${REPO_ROOT}/jax-prefetch` },
  },
  {
    slug: 'simd',
    kicker: 'Performance Engineering · JVM × Native',
    title: 'What crossing the JNI boundary actually costs',
    dek: 'A SIMD JSON parser reached from Java runs 5.2x faster than the best JVM parser and allocates about a million times less heap. The boundary everyone worries about costs 10 nanoseconds. What costs is crossing it often.',
    date: 'September 2026',
    sortDate: 202609,
    readingMinutes: 19,
    repo: { label: 'simdjson-jni', url: `${REPO_ROOT}/simdjson-jni` },
  },
];

export const POST_BY_SLUG: Record<PostSlug, PostMeta> = POSTS.reduce(
  (acc, post) => ({ ...acc, [post.slug]: post }),
  {} as Record<PostSlug, PostMeta>,
);
