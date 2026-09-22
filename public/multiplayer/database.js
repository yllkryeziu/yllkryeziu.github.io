const $ = (id) => document.getElementById(id);
const number = (value, digits = 0) => Number(value).toLocaleString("en-US", { maximumFractionDigits: digits });
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

function render(report, live) {
  $("database-source").textContent = live ? "LIVE RUST WORKER RESULTS" : "RECORDED RUST EXPERIMENT";
  $("database-races").innerHTML = report.races.map((race) => `<tr>
    <td>${race.isolation === "blind" ? "Blind writes" : "Snapshot isolation"}<small>read version ${number(race.readVersion)}</small></td>
    <td><span class="ledger-before">${number(race.before.bank)} → </span>${number(race.after.bank)}</td>
    <td>${number(race.after.alice)}<small>${escape(race.alice.status)}</small></td>
    <td>${number(race.after.bob)}<small>${escape(race.bob.status)}</small></td>
    <td><strong>${number(race.after.total)}</strong><small>${race.after.total === 100 ? "CONSERVED" : "60 EXTRA COINS"}</small></td></tr>`).join("");
  const snapshot = report.races.find((race) => race.isolation === "snapshot");
  $("database-snapshot").textContent = `Stable snapshot: a reader at version ${snapshot.readVersion} still sees ${snapshot.oldSnapshot.bank} in the bank, after version ${snapshot.finalVersion} commits.`;
  $("database-skew").textContent = `Write skew: both guards commit changes to different keys. Guards left on duty: ${report.writeSkew.guardsOnDuty}. Snapshot isolation is not serializable.`;
  const recovery = report.recovery;
  $("database-recovery").innerHTML = recovery ? `<strong>Recovered from disk · audit ${recovery.audit.ok ? "PASS" : "FAIL"}</strong>
    <dl><dt>Ownership handoff</dt><dd>${"ABC"[recovery.from]} → ${"ABC"[recovery.to]} · epoch ${number(recovery.epoch)}</dd>
    <dt>Killed PID → new PID</dt><dd>${number(recovery.oldPid)} → ${number(recovery.newPid)}</dd>
    <dt>Coins before → after</dt><dd>${number(recovery.before.total)} → ${number(recovery.after.total)}</dd>
    <dt>Checkpoint / records replayed</dt><dd>LSN ${number(recovery.storage.checkpointLsn)} / ${number(recovery.storage.replayedRecords)}</dd>
    <dt>Storage replay time</dt><dd>${number(recovery.storage.recoveryMs, 2)} ms</dd>
    <dt>Winning withdrawal retried</dt><dd>${recovery.duplicateRetry ? "DEDUPLICATED" : "FAILED"}</dd>
    <dt>Old owner write</dt><dd>${escape(recovery.oldOwner)}</dd></dl>` : "The transactions are committed. Next: move their region, kill its new owner, and recover from disk.";
}

export function setupDatabase() {
  fetch("./benchmarks/database-demo.json").then((response) => {
    if (!response.ok) throw new Error("No recording");
    return response.json();
  }).then((report) => {
    render(report, false);
    $("database-status").textContent = "Recorded transaction races and worker recovery, verified against independent state audits.";
  }).catch(() => {
    $("database-status").textContent = "The recording could not load. Reload the page to try again.";
  });
  fetch("./benchmarks/storage.json").then((response) => {
    if (!response.ok) throw new Error("No measurements");
    return response.json();
  }).then((data) => {
    const rows = ["memory", "sync", "group"].map((mode) => {
      const runs = data.runs.filter((run) => run.mode === mode);
      const label = { memory: "Memory only", sync: "Sync every commit", group: "Group commit" }[mode];
      return `<tr><td>${label}</td><td>${number(median(runs.map((r) => r.throughput)), 0)}</td><td>${number(median(runs.map((r) => r.p99)), 2)}</td><td>${number(median(runs.map((r) => r.syncs)))}</td></tr>`;
    });
    $("storage-results").innerHTML = `<div class="database-table-scroll"><table class="database-table"><caption>Same transaction stream, different acknowledgment rule</caption><thead><tr><th>Mode</th><th>Commits / s</th><th>p99 ms</th><th>Syncs</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
    const durable = data.runs.filter((r) => r.mode !== "memory");
    $("storage-note").textContent = `Medians across ${data.seeds.length} seeds; ${number(data.transactions)} two-key transactions per run, ${data.window} outstanding per batch. One worker on one shared host; filesystem ${data.filesystem}. Checkpoint-assisted recovery replays ${number(median(durable.map((r) => r.checkpointRecovery.replayedRecords)))} records versus ${number(median(durable.map((r) => r.fullRecovery.replayedRecords)))} for full-log recovery. Raw results include both recovery times. Memory mode provides no crash durability. This bounded concurrency experiment measures storage, separately from the open-loop placement benchmarks.`;
  }).catch(() => { $("storage-results").textContent = "The storage measurements could not load. Reload the page to try again."; });
}
