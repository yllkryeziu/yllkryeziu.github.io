export type PostSlug = 'thesis' | 'simd' | 'blj' | 'ferret';

export interface PostMeta {
  slug: PostSlug;
  preview: string;
  // Short lowercase name for the card on the home page.
  label: string;
  title: string;
  dek: string;
  date: string;
  sortDate: number;
  href?: string;
  repo?: { label: string; url: string };
}

export const POSTS: PostMeta[] = [
  {
    slug: 'ferret',
    preview: 'work/ferret.jpg',
    label: 'code search for coding agents',
    title: 'How code search works, and what coding agents need from it',
    dek: 'Coding agents search a repository about ten times per task, often four at once in separate worktrees. I built a trigram search engine for them and explain its parts with interactive figures: posting lists, regex plans, an exact early stop for the top 20 files, one index shared by every worktree, and searches that see the edit made a moment ago.',
    date: 'October 2026',
    sortDate: 202610,
    repo: { label: 'ferret', url: 'https://github.com/yllkryeziu/ferret' },
  },
  {
    slug: 'blj',
    preview: 'work/mario.jpg',
    label: 'breaking super mario 64 with rl',
    title: 'How much help does reinforcement learning need to break Super Mario 64?',
    dek: "I trained 24 PPO agents to climb Mario's endless stairs using four different rewards. All six agents rewarded for backward speed reached the landing; none rewarded for height did. One found the backwards long jump with only a reward for finishing. Here is what the runs reveal about reward design and what the policies learned.",
    date: 'September 2026',
    sortDate: 202610,
    repo: { label: 'mario-blj', url: 'https://github.com/yllkryeziu/mario-blj' },
  },
  {
    slug: 'thesis',
    preview: 'work/distillation.jpg',
    label: 'models teaching themselves to reason adaptively',
    title: 'On-policy self-distillation for adaptive compute',
    dek: 'Reasoning models overthink. I let a model rewrite its own reasoning to a length that matches the problem, then distilled that behaviour back into the weights, using no reward model, no difficulty labels and no ground-truth answers.',
    date: 'February 2026',
    sortDate: 202602,
  },
  {
    slug: 'simd',
    preview: 'work/jni.jpg',
    label: 'what crossing jni actually costs',
    title: 'What crossing the JNI boundary actually costs',
    dek: 'A SIMD JSON parser reached from Java runs 5.2x faster than the best JVM parser and allocates about a million times less heap. One crossing of the JNI boundary costs 10 nanoseconds, so what matters is not the boundary itself but how many times a design makes you cross it.',
    date: 'October 2025',
    sortDate: 202510,
    repo: { label: 'simdjson-jni', url: 'https://github.com/yllkryeziu/simdjson-jni' },
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
