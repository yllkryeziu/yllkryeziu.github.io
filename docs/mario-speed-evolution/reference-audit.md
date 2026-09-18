# Mario article reference audit — September 18, 2026

Scope: every reference in `components/post/refsBlj.tsx`, its use in the article, both code
excerpts, the article's BibTeX and the TAS comparison provenance. Checked original publisher,
author and source-code pages, not third-party summaries. No experiments were rerun for this audit.

| Ref | Primary source checked | Outcome |
| --- | --- | --- |
| 1 | [TASVideos movie 2016M](https://tasvideos.org/2016M) | Corrected runtime from 06:20.55 to 05:02.25. Credits now match the page: snark, Kaylee, sonicpacker, MICKEY_Vis11189, ToT. Published April 14, 2012; movie number is an identifier, not a year. The saved experiment's historical aliases remain in the source extract. |
| 2 | [Pinned decompilation, mario.c](https://github.com/n64decomp/sm64/blob/9921382a68bb0c865e5e45eb594d9c64db59b1af/src/game/mario.c#L861-L873) | Verified full commit via GitHub API and the launch excerpt against raw source. Multiplier 1.5 and positive cap 48 are correct; linked the specific lines. |
| 3 | [Pinned libsm64 controller code](https://github.com/libsm64/libsm64/blob/fd11813208272b4271d92bd92feb8f3fdbe61be5/src/libsm64.c#L230-L243) | Corrected the excerpt: X scales by −64, Y by +64. Added a citation beside the input-scaling claim. |
| 4 | [Pinned sm64-port](https://github.com/sm64-port/sm64-port/tree/2b17d081c9798b31b91dc71f37994b0da28cffc9) | Commit verified by GitHub API and the renderer checkout. Replaced “only as a renderer”: this port also supplies the reference replay. Local patches are identified separately. |
| 5 | [PPO preprint](https://arxiv.org/abs/1707.06347) | Title, all five authors and 2017 date correct. Supports the algorithm attribution; the blog's hyperparameters are its own experiment. |
| 6 | [SB3 in JMLR](https://jmlr.org/papers/v22/20-1364.html) | Verified all six authors, title, 2021, volume 22, article 268, pages 1–8. |
| 7 | [Author-hosted shaping paper](https://people.eecs.berkeley.edu/~russell/papers/icml99-shaping.pdf) | Fixed `ml99-shaping.pdf` to `icml99-shaping.pdf`. Authors/title/ICML 1999 verified. Narrowed the prose to potential-based shaping and its policy-invariance conditions; it does not establish guarantees for this blog's capped bonuses. |
| 8 | [DeepMind specification-gaming article](https://deepmind.google/blog/specification-gaming-the-flip-side-of-ai-ingenuity/) | Title, Krakovna et al., April 21, 2020, and Coast Runners example verified. Replaced the redirected URL with the canonical URL. |
| 9 | [OpenAI CoastRunners article](https://openai.com/index/faulty-reward-functions/) | Title, Clark and Amodei, December 21, 2016 verified. Replaced “turbo pads” with respawning targets, as described by the original report. This is an analogy, not evidence for the Mario measurements. |
| 10 | [AAAI proceedings](https://ojs.aaai.org/index.php/AAAI/article/view/11694) | Six authors, title and 2018 conference publication verified. Linked the proceedings rather than the 2017 preprint. The paper supports concern about variability and reporting, not the blog's particular seed results. |
| 11 | [Go-Explore in Nature](https://www.nature.com/articles/s41586-020-03157-9) | Corrected the wrong DOI suffix `-8` to `-9`. Verified five authors, February 24, 2021, volume 590, pages 580–586. Replaced an overbroad description with “Introduces Go-Explore.” The publisher abstract supports the hard-exploration description used here. |
| 12 | [Gymnasium in NeurIPS](https://proceedings.neurips.cc/paper_files/paper/2025/hash/d7ff1795e8527f6443371c3933bdb52b-Abstract-Datasets_and_Benchmarks_Track.html) | Updated to the 2025 published version, NeurIPS 38 Datasets and Benchmarks Track. Retained 2024 as the first-preprint date, confirmed by arXiv history. |
| 13 | [Local project data extract](../../public/blj-study/validation.json) | Added a separate reference for the author's measurements. Selected fields are copied from `results/tas_validation.json` at measurement commit `d300897dfbb0ddfaa452781b97a8002454ccb85a`; source SHA-256 is included. Public readers can access the extract without access to the private measurement repository. |

The 45/45 bit-exact result is for the longest **castle-area-1** chain, using per-frame
camera-relative input alignment. It is not a whole-game fidelity guarantee or a result for every
chain: the other comparisons include numerical differences and a basement level-transition
divergence. The article now states that scope explicitly. The extract contains the detailed
comparison fields and known gaps; it omits the original report's broader verdict summary.

The self-citation uses the actual article title from `POST_BY_SLUG.blj.title`, preventing another
stale-title mismatch, and puts the article URL in BibTeX's `url` field.

An adjacent media audit found that the old exporter counts escapes during its 45 warmup frames
as well as 450 filmed frames. Old panel captions and fallback speed labels now account for that
16.5-second counting window. The new 17-clip study uses zero warmup, so its counts correspond to
exactly the 15 seconds shown. Neither set's counts are success percentages.
