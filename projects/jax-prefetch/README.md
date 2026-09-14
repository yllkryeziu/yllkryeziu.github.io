# jax-prefetch

Cost-aware predictive prefetching, measured on a real HTTP trace.

A prefetch is a bet. It spends origin capacity now to save latency later, and it is usually wrong.
This project trains a next-request predictor in JAX, prices each candidate prefetch against live
queue depth, and measures whether pricing the bet beats issuing it unconditionally.

Every number below is produced by the scripts in this repository and written to `results/`.

## Result

Origin 150 ms away (the `edge` profile), mean over 7 test seeds. The gate margin `alpha`
is selected on 5 disjoint validation seeds and never on the test seeds reported here.

Origin provisioned, 1024-entry cache and 64 workers:

| strategy | p95 (ms) | delta p95 | extra origin load |
| --- | ---: | ---: | ---: |
| no prefetch | 125.7 | baseline | baseline |
| always top-1 | 120.6 | -4.1% | +1.9% |
| always top-2 | 118.1 | -6.0% | +2.8% |
| Markov top-2 | 119.2 | -5.1% | +1.1% |
| static rule | 124.6 | -0.9% | +0.2% |
| cost-aware (JAX) | 118.5 | -5.7% | +2.3% |

Origin saturated, 256-entry cache and 16 workers:

| strategy | p95 (ms) | delta p95 | extra origin load |
| --- | ---: | ---: | ---: |
| no prefetch | 293.0 | baseline | baseline |
| always top-1 | 556.7 | +90.0% | +26.5% |
| always top-2 | 830.0 | +183.2% | +39.8% |
| Markov top-2 | 634.1 | +116.4% | +32.7% |
| static rule | 330.3 | +12.7% | +6.4% |
| cost-aware (JAX) | 293.2 | +0.0% | +0.9% |

Same predictor and same predictions in both tables. The only difference is whether each bet is priced
before it is placed. Backend cost in the gate scales with `1 + queue_depth / concurrency`, so under
saturation no candidate probability clears the threshold and the policy stops issuing.

## Predictor

August test set, 467,494 decision points, fit on July only.

| model | top-1 | top-3 | cross-entropy (nats) | ECE |
| --- | ---: | ---: | ---: | ---: |
| most frequent | 28.6% | 40.5% | 4.111 | 0.0423 |
| Markov order 1 | 34.2% | 55.9% | 2.896 | 0.0165 |
| Markov order 2 + back-off | 35.8% | 57.9% | 2.832 | 0.0158 |
| JAX MLP | 36.9% | 58.1% | 2.733 | 0.0111 |

The MLP's advantage over a second-order Markov chain sits in likelihood and calibration rather than
top-1 accuracy. That is the property the gate needs, since it consumes a probability rather than an
argmax.

## Data

Real traffic rather than synthetic. `scripts/run_all.sh` expects these files in `data/`:

- `NASA_access_log_Jul95.gz` and `NASA_access_log_Aug95.gz` from the Internet Traffic Archive
  (https://ita.ee.lbl.gov/html/contrib/NASA-HTTP.html), 1,891,715 and
  1,569,898 raw lines respectively.
- `msnbc990928.seq.gz` from the UCI Machine Learning Repository, used as a second-domain check.

Sessions use a 30-minute inactivity timeout.
13 sessions straddling the
July/August boundary are dropped rather than split, and the path vocabulary is built from the
training period only.

## Reproducing

    python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
    bash scripts/run_all.sh                          # datacenter profile
    PREFETCH_PROFILE=edge bash scripts/run_all.sh    # edge profile
    .venv/bin/python -m src.eval.regime_sweep        # cache capacity sweep
    .venv/bin/python -m src.eval.latency_sweep       # origin distance sweep

Set `VENV` to place the virtualenv outside the source tree, which matters on shared filesystems.

## What this does not show

- The origin is simulated. Only the workload is real. Service time is response size plus lognormal
  jitter through a fixed-concurrency queue. Real origins have their own caches, correlated failures,
  and per-endpoint costs that are nothing like linear in bytes.
- A 1995 trace has short sessions (median 2 requests) and long think times (median
  43 seconds). The structure of the problem
  carries over to modern traffic. The absolute latencies do not.
- `src/eval/latency_sweep.py` selects `alpha` per cell on the same seeds it reports. Treat its trend
  as the finding and its magnitudes as optimistic. The two profile experiments use a held-out split.
- A single-example forward pass costs
  49 microseconds on CPU,
  most of it dispatch overhead. On a synchronous request path that is not free.
