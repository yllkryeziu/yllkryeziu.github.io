export type PostSlug = 'thesis' | 'simd' | 'blj';

export interface PostMeta {
  slug: PostSlug;
  preview: string;
  previewKind?: 'game' | 'diagram';
  title: string;
  dek: string;
  date: string;
  sortDate: number;
  repo?: { label: string; url: string };
}

const REPO_ROOT = 'https://github.com/yllkryeziu/yllkryeziu.github.io/tree/main/projects';

export const POSTS: PostMeta[] = [
  {
    slug: 'blj',
    preview: 'blog-previews/mario.jpg',
    previewKind: 'game',
    title: 'How much help does reinforcement learning need to break Super Mario 64?',
    dek: "I trained 24 PPO agents to climb Mario's endless stairs using four different rewards. All six agents rewarded for backward speed reached the landing; none rewarded for height did. One found the backwards long jump with only a reward for finishing. Here is what the runs reveal about reward design and what the policies learned.",
    date: 'September 2026',
    sortDate: 202610,
    repo: { label: 'mario-blj', url: 'https://github.com/yllkryeziu/mario-blj' },
  },
  {
    slug: 'thesis',
    preview: 'blog-previews/distillation.png',
    title: 'On-policy self-distillation for adaptive compute',
    dek: 'Reasoning models overthink. I let a model rewrite its own reasoning to a length that matches the problem, then distilled that behaviour back into the weights, using no reward model, no difficulty labels and no ground-truth answers.',
    date: 'February 2026',
    sortDate: 202602,
  },
  {
    slug: 'simd',
    preview: 'blog-previews/jni.png',
    title: 'What crossing the JNI boundary actually costs',
    dek: 'A SIMD JSON parser reached from Java runs 5.2x faster than the best JVM parser and allocates about a million times less heap. One crossing of the JNI boundary costs 10 nanoseconds, so what matters is not the boundary itself but how many times a design makes you cross it.',
    date: 'October 2025',
    sortDate: 202510,
    repo: { label: 'simdjson-jni', url: `${REPO_ROOT}/simdjson-jni` },
  },
];

export const POST_BY_SLUG: Record<PostSlug, PostMeta> = POSTS.reduce(
  (acc, post) => ({ ...acc, [post.slug]: post }),
  {} as Record<PostSlug, PostMeta>,
);

export function postSlugFromHash(hash: string): PostSlug | null {
  const match = hash.match(/^#(?:work|blog)\/([a-z]+)$/i);
  return POSTS.find(post => post.slug === match?.[1].toLowerCase())?.slug ?? null;
}
