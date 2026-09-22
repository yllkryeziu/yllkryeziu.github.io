import { setupDatabase } from "./database.js";
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let colors = ["#1682b5", "#e78136", "#159e82"];
let plot = {};
const names = {
  static: "Static stripes",
  greedy: "CPU-only greedy",
  adaptive: "Graph + guardrails",
};
const canvas = $("#world");
const ctx = canvas.getContext("2d");
let state = null;
let selectedRegion = 38;
let ablations = {},
  results = null,
  resultScenario = "hotspot";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const format = (value, digits = 0) =>
  value == null
    ? "—"
    : Number(value).toLocaleString("en-US", { maximumFractionDigits: digits });
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
function renderMetrics() {
  if (!state) return;
  const loads = state.loads ?? [0, 0, 0];
  $("#capacity-help").title =
    `Offered commands/s divided by a ${format(state.capacity)} commands/s planning target. This is a demand estimate, not measured CPU utilization.`;
  const demandScale = Math.max(1.5, ...loads.map((load) => load / (state.capacity || 900)));
  $("#worker-loads").innerHTML = loads
    .map((load, worker) => {
      const ratio = load / (state.capacity || 900),
        percent = Math.round(ratio * 100);
      return `<div class="worker-load"><div class="worker-heading"><span class="worker-name"><i class="legend-dot ${"abc"[worker]}"></i> Worker ${"ABC"[worker]}</span><span class="percent ${ratio > 1 ? "overloaded" : ""}">${percent}%</span></div><div class="load-track"><div class="load-fill" style="width:${ratio / demandScale * 100}%;background:${colors[worker]}"></div><i class="load-target" style="left:${100 / demandScale}%" title="Planning target"></i></div><p class="worker-note">${format(load)} commands/s ${ratio > 1 ? "· above target" : "· offered demand"}</p></div>`;
    })
    .join("");
  const latency =
    !state.running && state.finalP99 != null
      ? state.finalP99
      : state.metrics?.p99;
  $("#latency-label").textContent =
    !state.running && state.finalP99 != null
      ? "p99 · full run"
      : "p99 acknowledgment";
  $("#latency").innerHTML = `${format(latency)}<small> ms</small>`;
  $("#migration-count").textContent = format(state.migrations);
  $("#pending").textContent = format(state.pending);
  $("#cross-bytes").textContent =
    `${format((state.crossBytes || 0) / 1024, 1)} KB`;
  $("#player-count").textContent = format(state.playersCount || 2400);
  const seconds = Math.floor((state.tick || 0) / 10);
  $("#elapsed").textContent =
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")} / 01:00`;
  $("#worker-pids").textContent =
    `Rust PIDs: ${(state.pids || []).join(" · ")} (recorded)`;
  const audit = state.verification;
  $("#integrity").classList.toggle(
    "failed",
    !!state.error || (!!audit && !audit.ok),
  );
  $("#integrity-detail").textContent = state.error
    ? state.error
    : audit
      ? audit.ok
        ? `${format(audit.acknowledged)} effects verified across ${audit.regions} regions`
        : audit.errors.join("; ")
      : `${format(state.acknowledged)} acknowledged · audit after drain`;
  $("#integrity .integrity-icon").textContent = audit?.ok
    ? "✓"
    : state.error || (audit && !audit.ok)
      ? "!"
      : "◎";
  $("#trace-mode").textContent = "Recorded worker responses";
  const events = (state.events || [])
    .filter((event) => event.kind === "commit")
    .slice(-3)
    .reverse();
  $("#handoff-trace").innerHTML = events.length
    ? events
        .map(
          (event) =>
            `<div class="trace-row"><time>${(event.at / 1000).toFixed(2)}s</time><strong>Region ${String(event.region).padStart(2, "0")}</strong><span><i class="legend-dot ${"abc"[event.from]}"></i>${"ABC"[event.from]} → <i class="legend-dot ${"abc"[event.to]}"></i>${"ABC"[event.to]}</span><code>epoch ${event.epoch}</code><span class="trace-detail">${escape(event.detail)}</span></div>`,
        )
        .join("")
    : "<p>No handoffs yet. Static ownership keeps the original writers.</p>";
  drawChart(state.series || []);
}
function refreshPalette() {
  const style = getComputedStyle(document.documentElement);
  const color = (name) => style.getPropertyValue(name).trim();
  colors = ["--a", "--b", "--c"].map(color);
  plot = { paper: color("--paper"), ink: color("--ink"), muted: color("--muted"),
    subtle: color("--subtle"), line: color("--line"), accent: color("--accent"), error: color("--error") };
  if (state) renderMetrics();
  if (results) renderResults();
}
function drawChart(series) {
  const svg = $("#latency-chart"), width = Math.max(280, svg.clientWidth), height = 180;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const samples = series.filter((item) => item.p99 != null);
  const largest = Math.max(150, ...samples.map((item) => item.p99)) * 1.1;
  const unit = 10 ** Math.floor(Math.log10(largest));
  const max = Math.ceil(largest / unit) * unit;
  const left = 48, right = width - 12, top = 20, bottom = 146;
  const minT = series[0]?.t || 0, maxT = Math.max(minT + 10, series.at(-1)?.t || 10);
  const x = (time) => left + ((time - minT) / (maxT - minT)) * (right - left);
  const y = (value) => bottom - (value / max) * (bottom - top);
  let path = "", connected = false;
  for (const item of series) {
    if (item.p99 == null) { connected = false; continue; }
    path += `${connected ? "L" : "M"}${x(item.t).toFixed(1)},${y(item.p99).toFixed(1)} `;
    connected = true;
  }
  const last = samples.at(-1);
  const grid = [0, max / 2, max].map((value) => `<line x1="${left}" x2="${right}" y1="${y(value)}" y2="${y(value)}" stroke="${plot.line}"/><text x="${left - 8}" y="${y(value) + 4}" text-anchor="end" fill="${plot.subtle}" font-size="11">${format(value)}</text>`).join("");
  const ticks = [0, .25, .5, .75, 1].map((fraction) => {
    const time = minT + fraction * (maxT - minT);
    return `<text x="${x(time)}" y="168" text-anchor="middle" fill="${plot.subtle}" font-size="11">${format(time)}s</text>`;
  }).join("");
  svg.innerHTML = `<title>Command p99 latency over time, in milliseconds</title>${grid}
    <text x="0" y="11" fill="${plot.subtle}" font-size="11">ms</text>
    <line x1="${left}" x2="${right}" y1="${y(100)}" y2="${y(100)}" stroke="${plot.accent}" stroke-dasharray="3 4"/>
    <text x="${right}" y="${y(100) - 6}" text-anchor="end" fill="${plot.accent}" font-size="10">100 ms target</text>
    <path d="${path}" fill="none" stroke="${colors[0]}" stroke-width="1.8" stroke-linejoin="round"/>
    ${last ? `<circle cx="${x(last.t)}" cy="${y(last.p99)}" r="2.5" fill="${colors[0]}"/>` : `<text x="${(left + right) / 2}" y="78" text-anchor="middle" fill="${plot.muted}" font-size="11">Waiting for acknowledgments</text>`}${ticks}`;
  const small = samples.slice(-25), smallMax = Math.max(1, ...small.map((item) => item.p99));
  $("#mini-spark").innerHTML = `<path d="${small.map((item, i) => `${i ? "L" : "M"}${(i / Math.max(1, small.length - 1)) * 88},${33 - (item.p99 / smallMax) * 29}`).join(" ")}" fill="none" stroke="${colors[0]}" stroke-width="1.4"/>`;
}
let size = { width: 800, height: 460 },
  smoothed = new Map();
const observer = new ResizeObserver(() => {
  const rect = canvas.getBoundingClientRect(),
    ratio = Math.min(2, devicePixelRatio || 1);
  size = { width: rect.width, height: rect.height };
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
});
observer.observe(canvas);
function geometry() {
  const padding = size.width < 500 ? 20 : 26;
  return { x: padding, y: 42, width: size.width - padding * 2, height: size.height - 82 };
}
function draw() {
  const { width, height } = size;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = plot.paper;
  ctx.fillRect(0, 0, width, height);
  const g = geometry(), cellW = g.width / 12, cellH = g.height / 8;
  const owners = state?.owners || Array.from({ length: 96 }, (_, r) => Math.floor((r % 12) / 4));
  ctx.save();
  ctx.beginPath();
  ctx.rect(g.x, g.y, g.width, g.height);
  ctx.clip();
  for (let region = 0; region < 96; region++) {
    const x = g.x + (region % 12) * cellW, y = g.y + Math.floor(region / 12) * cellH;
    const color = colors[owners[region]];
    ctx.fillStyle = color + "12";
    ctx.fillRect(x, y, cellW, cellH);
    ctx.strokeStyle = plot.line;
    ctx.lineWidth = .6;
    ctx.strokeRect(x, y, cellW, cellH);
    const phase = state?.phases?.[region];
    if (phase && phase !== "ACTIVE") {
      ctx.strokeStyle = phase === "FAILED" ? plot.error : plot.accent;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(x + 3, y + 3, cellW - 6, cellH - 6);
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    if (region % 12 < 11 && owners[region] !== owners[region + 1]) {
      ctx.beginPath(); ctx.moveTo(x + cellW, y); ctx.lineTo(x + cellW, y + cellH); ctx.stroke();
    }
    if (region < 84 && owners[region] !== owners[region + 12]) {
      ctx.beginPath(); ctx.moveTo(x, y + cellH); ctx.lineTo(x + cellW, y + cellH); ctx.stroke();
    }
  }
  for (const player of state?.players || []) {
    let position = smoothed.get(player.id);
    if (!position || reducedMotion) position = { x: player.x, y: player.y };
    else { position.x += (player.x - position.x) * .16; position.y += (player.y - position.y) * .16; }
    smoothed.set(player.id, position);
    const region = Math.max(0, Math.min(95, Math.floor(position.y) * 12 + Math.floor(position.x)));
    ctx.fillStyle = colors[owners[region]] + "b3";
    ctx.beginPath();
    ctx.arc(g.x + position.x / 12 * g.width, g.y + position.y / 8 * g.height, width < 500 ? .85 : 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  const selectedX = g.x + selectedRegion % 12 * cellW, selectedY = g.y + Math.floor(selectedRegion / 12) * cellH;
  ctx.strokeStyle = plot.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(selectedX + 1, selectedY + 1, cellW - 2, cellH - 2);
  const target = state?.target || { x: 2, y: 4 };
  const tx = g.x + target.x / 12 * g.width, ty = g.y + target.y / 8 * g.height;
  // A small flag and cross mark the exact target; the map contains only workload data.
  ctx.strokeStyle = plot.ink; ctx.fillStyle = plot.ink; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(tx - 4, ty); ctx.lineTo(tx + 4, ty); ctx.moveTo(tx, ty + 4); ctx.lineTo(tx, ty - 21); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tx, ty - 21); ctx.lineTo(tx + 15, ty - 17); ctx.lineTo(tx, ty - 12); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.font = "10px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = plot.subtle;
  for (let i = 0; i < 12; i++) ctx.fillText(String(i), g.x + (i + .5) * cellW, g.y - 10);
  for (let i = 0; i < 8; i++) ctx.fillText(String(i), g.x - 12, g.y + (i + .5) * cellH + 3);
  ctx.strokeStyle = plot.line; ctx.lineWidth = 1;
  ctx.strokeRect(g.x, g.y, g.width, g.height);
  $("#selected-region").textContent = `Region ${String(selectedRegion).padStart(2, "0")} · worker ${"ABC"[owners[selectedRegion]]} · epoch ${state?.epochs?.[selectedRegion] || 1}`;
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
// Inspect the recorded ownership map without changing the recorded rally flag.
canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect(), g = geometry();
  const x = Math.min(11, Math.max(0, Math.floor((event.clientX - rect.left - g.x) / g.width * 12)));
  const y = Math.min(7, Math.max(0, Math.floor((event.clientY - rect.top - g.y) / g.height * 8)));
  selectedRegion = y * 12 + x;
});
const steps = [
  [
    "Copy the state. Keep accepting commands.",
    "B receives the state through sequence 102. A is still the only writer. New effects go into a tail alongside the source state.",
    "COPYING · epoch 7",
    "STAGING · read-only",
    "snapshot →",
    "writable owners = { A@7 }",
  ],
  [
    "Capture every effect after the snapshot.",
    "Commands 103 and 104 apply at A and enter its tail with their computed values. B has no authority to accept player writes yet.",
    "TAIL · [103, 104]",
    "SNAPSHOT · seq 102",
    "state deltas →",
    "acknowledged effects ⊆ snapshot + tail",
  ],
  [
    "Fence the source. Buffer new arrivals.",
    "A freezes at executed sequence 104. Its queued command 105 has no receipt. B replays effects 103 and 104; the coordinator retains 105 for forwarding.",
    "FROZEN · epoch 7",
    "REPLAY · through 104",
    "seal + tail →",
    "writable owners = { } during cutover",
  ],
  [
    "Publish the new epoch. Release the buffer.",
    "B is active at epoch 8 before the directory changes. Unacknowledged commands are forwarded in sequence. A retry of 104 is deduplicated; 105 executes at B.",
    "FROZEN · no writes",
    "ACTIVE · epoch 8",
    "route to B →",
    "writable owners = { B@8 }",
  ],
];
$$("[data-step]").forEach((button) =>
  button.addEventListener("click", () => {
    const index = Number(button.dataset.step),
      step = steps[index];
    $$("[data-step]").forEach((item) => {
      item.classList.toggle("active", item === button);
      item.setAttribute("aria-pressed", String(item === button));
    });
    $("#step-counter").textContent = `0${index + 1}`;
    $("#step-title").textContent = step[0];
    $("#step-description").textContent = step[1];
    $("#source-state").textContent = step[2];
    $("#destination-state").textContent = step[3];
    $("#transfer-label").textContent = step[4];
    $("#protocol-invariant").textContent = step[5];
    $("#source-node").classList.toggle("frozen", index >= 2);
  }),
);
function median(values) {
  const sorted = values.filter((value) => value != null).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
}
function renderResults() {
  if (!results) return;
  const runs = results.runs.filter((run) => run.scenario === resultScenario);
  if (!runs.length) {
    $("#result-headline").textContent =
      "This workload has no recorded runs yet.";
    $("#results-body").innerHTML = "";
    $("#result-bars").innerHTML = "";
    return;
  }
  const summaries = Object.keys(names).map((policy) => {
    const subset = runs.filter((run) => run.policy === policy);
    return {
      policy,
      n: subset.length,
      p99: median(subset.map((run) => run.p99)),
      migrations: median(subset.map((run) => run.migrations)),
      cross: median(subset.map((run) => run.crossBytes)),
      cut: median(subset.map((run) => run.cutIntegral)),
      low: Math.min(...subset.map((run) => run.p99)),
      high: Math.max(...subset.map((run) => run.p99)),
      valid:
        subset.length > 0 &&
        subset.every((run) => run.verification.ok && run.refused === 0),
    };
  });
  const baseline = summaries[0],
    adaptive = summaries[2];
  if (baseline.p99 && adaptive.p99) {
    const change = (1 - adaptive.p99 / baseline.p99) * 100;
    $("#result-headline").innerHTML =
      change >= 0
        ? `<strong>${change.toFixed(1)}%</strong> lower p99 with graph + guardrails than static stripes on this workload.`
        : `<strong>${Math.abs(change).toFixed(1)}%</strong> higher p99 with graph + guardrails. Migration loses on this workload.`;
  }
  if (resultScenario === "uniform") {
    $("#result-headline").textContent =
      "Uniform demand needs little migration. Similar ownership with different timings exposes shared-host variability.";
  } else if (resultScenario === "indivisible") {
    $("#result-headline").innerHTML =
      `<strong>${format(adaptive.p99 / 1000, 1)} seconds</strong> p99 remains with graph + guardrails. Moving one hot region does not split its execution.`;
  }
  const max = Math.max(1, ...summaries.map((run) => run.high || 0));
  const width = Math.max(280, $("#result-bars").clientWidth);
  const scale = (value) => Math.max(0, value || 0) / max * (width - 2);
  $("#result-bars").innerHTML = `<svg viewBox="0 0 ${width} 168" role="img" aria-label="Median p99 latency and min–max range for each placement policy">
    ${summaries.map((run, index) => {
      const y = 14 + index * 48;
      return `<g><title>${names[run.policy]}: median ${format(run.p99, 1)} ms; range ${format(run.low, 1)} to ${format(run.high, 1)} ms</title>
        <text y="${y}" font-size="12" fill="${plot.ink}">${names[run.policy]}</text>
        <text x="${width}" y="${y}" text-anchor="end" font-size="12" fill="${plot.subtle}">${format(run.p99)} ms</text>
        <rect y="${y + 9}" width="${scale(run.p99)}" height="10" fill="${colors[index]}" opacity=".75"/>
        <path d="M${scale(run.low)},${y + 14}H${scale(run.high)} M${scale(run.low)},${y + 9}v10 M${scale(run.high)},${y + 9}v10" fill="none" stroke="${plot.ink}" stroke-width="1"/></g>`;
    }).join("")}
    <text y="163" font-size="10" fill="${plot.subtle}">0</text>
    <text x="${width}" y="163" text-anchor="end" font-size="10" fill="${plot.subtle}">${format(max)} ms</text></svg>
    <p class="figure-key">Bar: median p99 · line: min–max across ${summaries[0].n} runs</p>`;
  $("#results-body").innerHTML = summaries
    .map(
      (run) =>
        `<tr><td>${names[run.policy]}</td><td>${format(run.p99, 1)} ms<small class="run-range">${format(run.low)}–${format(run.high)} across runs</small></td><td>${format(run.migrations)}</td><td>${format(run.cut)}</td><td>${format((run.cross || 0) / 1024, 1)} KB</td><td><span class="audit-check">${run.valid ? "✓ PASS" : "NOT VERIFIED"}</span></td></tr>`,
    )
    .join("");
  const greedy = summaries[1];
  const paired = runs
    .filter((run) => run.policy === "adaptive")
    .map((run) => ({
      run,
      baseline: runs.find(
        (other) => other.policy === "greedy" && other.seed === run.seed,
      ),
    }))
    .filter((pair) => pair.baseline);
  const wins = paired.filter((pair) => pair.run.p99 < pair.baseline.p99).length;
  $("#result-interpretation").textContent =
    resultScenario === "uniform"
      ? `The greedy controller made a median ${format(greedy.migrations)} handoffs; the guarded controller made ${format(adaptive.migrations)}. A controller can create work even when the initial distribution needs little help. Timing variation prevents treating identical ownership as a causal latency improvement.`
      : `The stronger greedy baseline reaches ${format(greedy.p99)} ms p99 with ${format(greedy.migrations)} handoffs. Graph + guardrails reaches ${format(adaptive.p99)} ms with ${format(adaptive.migrations)} handoffs, and has lower observed p99 in ${wins} of ${paired.length} matching-seed comparisons. Static ownership keeps more interactions local; spreading the crowd buys CPU headroom at a communication cost.`;
  const count = Math.min(...summaries.map((run) => run.n));
  $("#results-note").textContent =
    `Medians of ${count} seeded run${count !== 1 ? "s" : ""} per policy · ${runs[0].config.seconds}s of arrivals per run · ${results.rust} · generated ${results.generatedAt.slice(0, 10)}. Ranges show min–max across seeds. Remote payload excludes migrations; skipped proximity rounds are recorded in the raw results.`;
}
function renderAblations() {
  if (!results) return;
  const spec = [
    {
      key: "fifo",
      scenario: "hotspot",
      metric: "handoffP99",
      unit: "ms",
      title: "Scheduling under a crowded flag",
      baseline: "Global FIFO",
      target: "Fair mailboxes + prefix cutover",
    },
    {
      key: "no-locality",
      scenario: "hotspot",
      metric: "cutIntegral",
      unit: "weighted cut × s",
      title: "The locality term",
      baseline: "Same search, λ = 0",
      target: "Same search, λ = 0.65",
    },
    {
      key: "no-guards",
      scenario: "oscillating",
      metric: "migrations",
      unit: "handoffs",
      title: "Guardrails under oscillation",
      baseline: "No stability controls",
      target: "With stability controls",
    },
  ];
  $("#ablation-results").innerHTML =
    spec
      .map((item) => {
        const raw = ablations[item.key];
        if (!raw) return `<p>${item.title}: measurements unavailable.</p>`;
        if (raw.runtimeSourceHash !== results.runtimeSourceHash)
          return `<p>${item.title}: runtime versions differ. Run ./scripts/benchmark.sh to refresh the complete comparison.</p>`;
        const before = raw.runs.filter((r) => r.scenario === item.scenario),
          after = results.runs.filter(
            (r) => r.scenario === item.scenario && r.policy === "adaptive",
          );
        const a = median(before.map((r) => r[item.metric])),
          b = median(after.map((r) => r[item.metric]));
        const change = a ? (1 - b / a) * 100 : null;
        return `<div class="ablation-row"><div><h4>${item.title}</h4><p>${item.baseline} → ${item.target}</p></div><div><strong>${format(a, 1)} → ${format(b, 1)}</strong><span>${item.unit}${change == null ? "" : ` · ${format(Math.abs(change), 1)}% ${change >= 0 ? "lower" : "higher"}`}</span></div></div>`;
      })
      .join("") +
    '<p class="ablation-note">Medians across three seeds. Scheduling and guardrails are package ablations; the locality comparison changes only λ. Main runs inject no transport delay.</p>';
}
$$("[data-result]").forEach((button) =>
  button.addEventListener("click", () => {
    resultScenario = button.dataset.result;
    $$("[data-result]").forEach((item) => {
      item.classList.toggle("active", item === button);
      item.setAttribute("aria-pressed", String(item === button));
    });
    renderResults();
  }),
);
const sections = $$(".prose-section");
function updateContents() {
  let active = sections[0]?.id;
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= innerHeight * .35) active = section.id;
  }
  if (scrollY > 0 && scrollY + innerHeight >= document.documentElement.scrollHeight - 2) active = sections.at(-1)?.id;
  $$(".article-nav nav a").forEach((link) => {
    const selected = link.hash === `#${active}`;
    link.classList.toggle("active", selected);
    if (selected) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
const sectionObserver = new IntersectionObserver(updateContents, { rootMargin: "-35% 0px -60% 0px" });
sections.forEach((section) => sectionObserver.observe(section));
window.addEventListener("scroll", updateContents, { passive: true });
updateContents();
refreshPalette();
document.addEventListener("themechange", refreshPalette);
let figureWidth = 0;
new ResizeObserver(([entry]) => {
  if (entry.contentRect.width === figureWidth) return;
  figureWidth = entry.contentRect.width;
  if (state) drawChart(state.series || []);
  if (results) renderResults();
}).observe($("#result-bars"));
setupDatabase();
await Promise.allSettled([
  fetch("./benchmarks/demo-state.json")
    .then((response) => {
      if (!response.ok) throw new Error();
      return response.json();
    })
    .then((data) => {
      state = data;
      renderMetrics();
    })
    .catch(() => {
      $("#connection-label").textContent = "RECORDING UNAVAILABLE";
      $("#lab-note").textContent =
        "The recorded map could not load. Reload the page to try again.";
    }),
  fetch("./benchmarks/results.json")
    .then((response) => {
      if (!response.ok) throw new Error();
      return response.json();
    })
    .then((data) => {
      results = data;
      renderResults();
      renderAblations();
    })
    .catch(() => {
      $("#result-headline").textContent =
        "The measurements could not load. Reload the page to try again.";
    }),
]);
await Promise.allSettled(
  ["fifo", "no-locality", "no-guards"].map(async (key) => {
    const response = await fetch(`./benchmarks/${key}.json`);
    if (response.ok) ablations[key] = await response.json();
  }),
);
renderAblations();
