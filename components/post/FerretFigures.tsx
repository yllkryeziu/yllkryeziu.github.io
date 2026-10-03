import React, { useMemo, useState } from 'react';
import { usePlotWidth } from './Charts';
import './FerretFigures.css';

const fmt = (n: number) => n.toLocaleString('en-US');

/* ---------- Figure 1: a trigram index over eight chunks ---------- */

const CORPUS = [
  { path: 'src/http/parse_request.c', text: 'int parse_request(struct conn *c) {\n  struct request *req = read_header(c);\n  return parse_body(req);\n}' },
  { path: 'src/http/server.c · 1', text: 'static void on_readable(struct conn *c) {\n  if (parse_request(c) < 0)\n    close_conn(c);\n}' },
  { path: 'src/http/server.c · 2', text: '/* Requests are parsed in place; see\n   parse_request.c for the grammar. */\nvoid serve(int fd) { loop(fd); }' },
  { path: 'src/util/fields.c', text: 'void spread_fields(struct row *r) {\n  /* hot path, see profile */\n  copy_field(r, 0);\n}' },
  { path: 'src/util/timing.c', text: '/* time each read_file call */\nlong read_file_ns(const char *path) {\n  return elapsed(open_file(path));\n}' },
  { path: 'src/ui/theme.c', text: '/* U+212A KELVIN SIGN, not K */\nconst char *label = "BLACK";\nvoid set_color(int c) { paint(c); }' },
  { path: 'README.md', text: 'Ferret routes each request after\nparse_request() has read it.' },
  { path: 'tests/parse_test.c', text: 'TEST(Parse, Request) {\n  EXPECT_EQ(parse_request(&fake), 0);\n}' },
];

// Ferret folds case at index time: A-Z, plus the two non-ASCII letters RE2 treats as case
// variants of ASCII ones. Each maps to one UTF-16 unit, so offsets survive folding.
function fold(s: string): string {
  let out = '';
  for (const ch of s) {
    if (ch >= 'A' && ch <= 'Z') out += ch.toLowerCase();
    else if (ch === 'K') out += 'k';
    else if (ch === 'ſ') out += 's';
    else out += ch;
  }
  return out;
}

// Trigrams never cross a line break, as in Ferret.
const POSTINGS = new Map<string, number[]>();
CORPUS.forEach((chunk, id) => {
  const seen = new Set<string>();
  for (const line of fold(chunk.text).split('\n')) {
    for (let i = 0; i + 3 <= line.length; i++) seen.add(line.slice(i, i + 3));
  }
  for (const tri of seen) {
    if (!POSTINGS.has(tri)) POSTINGS.set(tri, []);
    POSTINGS.get(tri)!.push(id);
  }
});

const Highlighted: React.FC<{ text: string; query: string }> = ({ text, query }) => (
  <>
    {text.split('\n').map((line, li) => {
      const parts: React.ReactNode[] = [];
      const folded = fold(line);
      let i = 0;
      let at: number;
      while (query && (at = folded.indexOf(query, i)) !== -1) {
        parts.push(line.slice(i, at), <mark key={at}>{line.slice(at, at + query.length)}</mark>);
        i = at + query.length;
      }
      parts.push(line.slice(i));
      return <React.Fragment key={li}>{li > 0 && '\n'}{parts}</React.Fragment>;
    })}
  </>
);

const PRESETS = ['parse_request', 'read_file', 'black', 're'];

export const TrigramFigure: React.FC = () => {
  const [raw, setRaw] = useState('parse_request');
  const q = fold(raw.trim());
  const ids = CORPUS.map((_, i) => i);
  let mode: 'tri' | 'short' | 'scan';
  let rows: { t: string; ids: Set<number> }[] = [];
  let candidates: Set<number>;
  if (q.length >= 3) {
    mode = 'tri';
    const tris: string[] = [];
    for (let i = 0; i + 3 <= q.length; i++) {
      const t = q.slice(i, i + 3);
      if (!tris.includes(t)) tris.push(t);
    }
    rows = tris.map(t => ({ t, ids: new Set(POSTINGS.get(t) ?? []) }));
    candidates = new Set(ids.filter(id => rows.every(r => r.ids.has(id))));
  } else if (q.length === 2) {
    // Ferret's short-query path: the union of every trigram that contains the query.
    mode = 'short';
    rows = [...POSTINGS.keys()].filter(t => t.includes(q)).sort().map(t => ({ t, ids: new Set(POSTINGS.get(t)) }));
    candidates = new Set(ids.filter(id => rows.some(r => r.ids.has(id))));
  } else {
    mode = 'scan';
    candidates = new Set(ids);
  }
  const shown = rows.slice(0, 12);
  const hits = CORPUS.map((chunk, i) =>
    candidates.has(i) && q.length > 0 && fold(chunk.text).split('\n').some(line => line.includes(q)));
  const matches = hits.filter(Boolean).length;
  const lead = mode === 'tri' ? `${rows.length} trigrams` : mode === 'short' ? `${rows.length} trigrams contain “${q}”` : 'Shorter than two characters';
  const total = mode === 'tri' ? 'all of them' : mode === 'short' ? 'any of them' : 'every chunk';

  return (
    <div className="ferret-fig">
      <div className="ferret-controls">
        <label htmlFor="ferret-query">Query</label>
        <input id="ferret-query" type="text" value={raw} autoComplete="off" spellCheck={false}
          onChange={event => setRaw(event.target.value)} />
        <span className="hint">Try</span>
        {PRESETS.map(p => (
          <button key={p} type="button" className="mono" aria-pressed={raw === p} onClick={() => setRaw(p)}>{p}</button>
        ))}
      </div>
      <div className="ferret-tri">
        <div>
          <div className="ferret-matrix-wrap">
            <table className="ferret-matrix">
              <thead>
                <tr><th />{CORPUS.map((_, i) => <th key={i}>{i}</th>)}</tr>
              </thead>
              <tbody>
                {shown.map(r => (
                  <tr key={r.t}>
                    <td className="tri">{r.t}</td>
                    {CORPUS.map((_, i) => (
                      <td key={i}><span className={`ferret-cell${r.ids.has(i) ? ' on' : ''}`} title={r.ids.has(i) ? 'contains' : 'does not contain'} /></td>
                    ))}
                  </tr>
                ))}
                {rows.length > shown.length && (
                  <tr><td className="more" colSpan={CORPUS.length + 1}>+ {rows.length - shown.length} more trigrams</td></tr>
                )}
                <tr className="total">
                  <td className="tri">{total}</td>
                  {CORPUS.map((_, i) => <td key={i}><span className={`ferret-cell${candidates.has(i) ? ' all' : ''}`} /></td>)}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="ferret-readout" aria-live="polite">
            {lead} · <strong>{candidates.size}</strong> of {CORPUS.length} chunks are candidates · <strong>{matches}</strong> contain a match.
          </p>
        </div>
        <div className="ferret-chunks">
          {CORPUS.map((chunk, i) => {
            const isCandidate = candidates.has(i);
            const cls = !isCandidate ? 'dim' : hits[i] ? 'match' : 'false';
            return (
              <div key={chunk.path} className={`ferret-chunk ${cls}`}>
                <div className="path">
                  <span>{i} · {chunk.path}</span>
                  {!isCandidate
                    ? <span className="ferret-tag none">not a candidate</span>
                    : hits[i] ? <span className="ferret-tag match">match</span> : <span className="ferret-tag false">false candidate</span>}
                </div>
                <pre><Highlighted text={chunk.text} query={isCandidate ? q : ''} /></pre>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ---------- Figure 2: regex plans, as printed by `ferret plan --regex` ---------- */

const PLANS = [
  { pat: 'parse_request', query: '"_re" & "ars" & "e_r" & "equ" & "est" & "par" & "que" & "req" & "rse" & "se_" & "ues"', literal: 'e_reque',
    note: 'A literal is the simplest regex: every trigram is required. The prefilter literal is the longest run without k or s, between the two s’s.' },
  { pat: 'handle_(read|write)', query: '"and" & "dle" & "han" & "le_" & "ndl" & (("ead" & "rea") | ("ite" & "rit" & "wri")) & (("_re" & "e_r") | ("_wr" & "e_w"))', literal: 'handle_',
    note: 'The alternation becomes an OR. The last group comes from joining the suffix “e_” of handle_ with the prefixes of read and write: trigrams that span the boundary.' },
  { pat: 'colou?r', query: '"col" & "olo" & ("lor" | "our")', literal: 'colo',
    note: 'The optional u gives two exact strings, color and colour. Their shared trigrams are required, and the ones that differ become an OR.' },
  { pat: 'Item.*path', query: '"ath" & "ite" & "pat" & "tem"', literal: 'item',
    note: '.* can match anything, including nothing, so it contributes no trigrams. Both sides must still appear, so their trigrams are ANDed.' },
  { pat: 'test\\w*Headers', query: '"ade" & "der" & "ead" & "ers" & "est" & "hea" & "tes"', literal: 'header',
    note: '\\w* is like .* for the planner. The literal header comes from headers with its final s dropped.' },
  { pat: '(?:WindowHandler|ConvertSettingsToDictionary)', query: '("and" & "dle" & "dow" & "han" & "ind" & "ler" & "ndl" & "ndo" & "owh" & "wha" & "win") | ("ary" & "con" & "cti" & "dic" & "ert" & "ett" & "gst" & "ict" & "ing" & "ion" & "nar" & "ngs" & "nve" & "odi" & "ona" & "onv" & "rts" & "set" & "sto" & "tin" & "tio" & "tod" & "tse" & "tti" & "ver")', literal: 'none',
    note: 'No single literal is shared by both branches, so there is none for the prefilter. The trigram plan is fine; the cost was in the file-name scan of section 4, now done once per branch.' },
];

type PlanNode = { t: 'tri'; v: string } | { t: 'and' | 'or'; xs: PlanNode[] };

function parsePlan(s: string): PlanNode {
  let i = 0;
  const ws = () => { while (s[i] === ' ') i++; };
  const atom = (): PlanNode => {
    ws();
    if (s[i] === '(') { i++; const e = expr(); ws(); i++; return e; }
    const j = s.indexOf('"', i + 1);
    const v = s.slice(i + 1, j);
    i = j + 1;
    return { t: 'tri', v };
  };
  const and = (): PlanNode => {
    const xs = [atom()];
    ws();
    while (s[i] === '&') { i++; xs.push(atom()); ws(); }
    return xs.length === 1 ? xs[0] : { t: 'and', xs };
  };
  const expr = (): PlanNode => {
    const xs = [and()];
    ws();
    while (s[i] === '|') { i++; xs.push(and()); ws(); }
    return xs.length === 1 ? xs[0] : { t: 'or', xs };
  };
  return expr();
}

const PlanTree: React.FC<{ node: PlanNode }> = ({ node }) => {
  if (node.t === 'tri') return <span className="ferret-chip">{node.v}</span>;
  return (
    <div className={`ferret-node ${node.t}`}>
      <div className="ferret-node-label">{node.t === 'and' ? 'all of' : 'any of'}</div>
      <div className="ferret-node-kids">{node.xs.map((x, i) => <PlanTree key={i} node={x} />)}</div>
    </div>
  );
};

export const PlanFigure: React.FC = () => {
  const [k, setK] = useState(1);
  const plan = PLANS[k];
  const tree = useMemo(() => {
    const parsed = parsePlan(plan.query);
    return parsed.t === 'tri' ? { t: 'and' as const, xs: [parsed] } : parsed;
  }, [plan.query]);
  return (
    <div className="ferret-fig">
      <div className="ferret-controls">
        {PLANS.map((p, i) => (
          <button key={p.pat} type="button" className="mono" aria-pressed={i === k} onClick={() => setK(i)}>
            {p.pat.length > 24 ? `${p.pat.slice(0, 22)}…` : p.pat}
          </button>
        ))}
      </div>
      <dl className="ferret-plan-meta">
        <dt>pattern</dt><dd>{plan.pat}</dd>
        <dt>literal</dt><dd>{plan.literal}</dd>
      </dl>
      <PlanTree node={tree} />
      <p className="ferret-plan-note">{plan.note}</p>
    </div>
  );
};

/* ---------- Figure 3: the safe early stop ---------- */

const K = 3;
const SCALE = 50000;
const DOCS = ([
  ['src/http/router.c', 30000, 0, 1, 2], ['src/http/server.c', 29500, 0, 1, 1],
  ['src/http/parse_request.c', 29000, 1, 1, 6], ['src/core/conn.c', 27000, 0, 0, 1],
  ['src/util/log.c', 26500, 0, 0, 2], ['src/proxy/forward.c', 25000, 0, 1, 3],
  ['src/http/client.c', 24000, 0, 1, 1], ['src/http/parse_request.h', 23000, 1, 1, 2],
  ['src/api/handlers.c', 20000, 0, 1, 4], ['src/legacy/old_parse.c', 19000, 0, 0, 2],
  ['src/cli/main.c', 17000, 0, 0, 1], ['src/http/tls.c', 15000, 0, 1, 1],
  ['src/support/fakes.c', 13000, 0, 1, 1], ['src/ws/upgrade.c', 11000, 0, 0, 1],
  ['src/admin/parse_request_stats.c', 9000, 1, 0, 1], ['src/misc/notes.c', 7000, 0, 0, 1],
] as [string, number, number, number, number][]).map(([path, prior, n, t, count]) => ({ path, prior, N: !!n, T: !!t, count }));

type Doc = typeof DOCS[number];
type DocState = 'pending' | 'verified' | 'counted' | 'skipped';
interface Sim { mode: number; i: number; heap: { s: number; i: number }[]; state: DocState[]; stopped: boolean; msg: string }

const countBoost = (c: number) => Math.min(4096, 1024 * (1 + Math.floor(Math.log2(c))));
const score = (d: Doc) => d.prior + (d.N ? 8192 : 0) + (d.T ? 8192 : 0) + countBoost(d.count);
function ceiling(d: Doc, mode: number) {
  if (mode === 0) return 20480;
  if (mode === 1) return d.N ? 20480 : 12288;
  return (d.N ? 8192 : 0) + (d.T ? 8192 : 0) + 4096;
}
const freshSim = (mode: number): Sim => ({
  mode, i: 0, heap: [], state: DOCS.map(() => 'pending'), stopped: false,
  msg: 'The heap fills with the first three files. Press Step.',
});
const worstOf = (sim: Sim) => (sim.heap.length >= K ? Math.min(...sim.heap.map(h => h.s)) : null);

function stepSim(sim: Sim): Sim {
  if (sim.stopped) return sim;
  const next: Sim = { ...sim, heap: [...sim.heap], state: [...sim.state] };
  const d = DOCS[next.i];
  const worst = worstOf(next);
  if (worst !== null) {
    let best = -1;
    let bestJ = -1;
    for (let j = next.i; j < DOCS.length; j++) {
      const bound = DOCS[j].prior + ceiling(DOCS[j], next.mode);
      if (bound > best) { best = bound; bestJ = j; }
    }
    if (best < worst) {
      for (let j = next.i; j < DOCS.length; j++) next.state[j] = 'skipped';
      next.stopped = true;
      next.msg = `Stop. The best any remaining file could score is ${fmt(best)} (${DOCS[bestJ].path}), below the heap’s worst, ${fmt(worst)}. ${DOCS.length - next.i} files are never read, and the top three are exact.`;
      return next;
    }
    const own = d.prior + ceiling(d, next.mode);
    if (own < worst) {
      next.state[next.i] = 'counted';
      next.msg = `${d.path} can reach at most ${fmt(own)}, below the heap’s worst ${fmt(worst)}, so its matches are only counted. The search cannot stop yet: ${DOCS[bestJ].path} could still reach ${fmt(best)}.`;
      next.i++;
      return next;
    }
  }
  const s = score(d);
  next.state[next.i] = 'verified';
  next.heap.push({ s, i: next.i });
  next.heap.sort((a, b) => b.s - a.s);
  let entered = true;
  if (next.heap.length > K) entered = next.heap.pop()!.i !== next.i;
  const parts = [`prior ${fmt(d.prior)}`, d.N ? 'name 8,192' : '', d.T ? 'identifier 8,192' : '', `count ${fmt(countBoost(d.count))}`].filter(Boolean);
  next.msg = `Verified ${d.path}: score ${fmt(s)} = ${parts.join(' + ')}. ${next.heap.length < K ? 'The heap is filling.' : entered ? 'It enters the top three.' : 'It does not beat the top three.'}`;
  next.i++;
  if (next.i >= DOCS.length) { next.stopped = true; next.msg += ' Every file was read.'; }
  return next;
}

const MODES = ['Basic', '+ name-aware', '+ code-token'];

export const TopKFigure: React.FC = () => {
  const [sim, setSim] = useState<Sim>(() => freshSim(0));
  const worst = worstOf(sim);
  const top = new Set(sim.heap.map(h => h.i));
  const pct = (v: number) => `${(100 * Math.min(v, SCALE) / SCALE).toFixed(2)}%`;
  const count = (k: DocState) => sim.state.filter(x => x === k).length;
  const runToStop = () => {
    let s = sim;
    for (let guard = 0; !s.stopped && guard < 64; guard++) s = stepSim(s);
    setSim(s);
  };
  return (
    <div className="ferret-fig">
      <div className="ferret-controls">
        <span className="hint">Bound</span>
        {MODES.map((label, mode) => (
          <button key={label} type="button" aria-pressed={sim.mode === mode} onClick={() => setSim(freshSim(mode))}>{label}</button>
        ))}
        <span className="spacer" />
        <button type="button" disabled={sim.stopped} onClick={() => setSim(stepSim(sim))}>Step</button>
        <button type="button" disabled={sim.stopped} onClick={runToStop}>Run to the stop</button>
        <button type="button" onClick={() => setSim(freshSim(sim.mode))}>Reset</button>
      </div>
      <div className="ferret-stats">
        <div className="ferret-stat ver"><div className="k">Verified</div><div className="v">{count('verified')}</div></div>
        <div className="ferret-stat cnt"><div className="k">Counted only</div><div className="v">{count('counted')}</div></div>
        <div className="ferret-stat skp"><div className="k">Never read</div><div className="v">{count('skipped')}</div></div>
        <div className="ferret-stat top"><div className="k">Heap’s worst</div><div className="v">{worst === null ? '–' : fmt(worst)}</div></div>
      </div>
      <div className="ferret-axis">
        <div />
        <div className="ferret-ticks">
          {[0, 10000, 20000, 30000, 40000, 50000].map(v => <span key={v} style={{ left: `${(100 * v) / SCALE}%` }}>{v / 1000}k</span>)}
        </div>
        <div />
      </div>
      <div className="ferret-rows">
        {DOCS.map((d, i) => {
          const st = sim.state[i];
          const isTop = top.has(i) && st === 'verified';
          const label = st === 'pending' ? '' : st === 'verified' ? (isTop ? 'top 3' : 'verified') : st === 'counted' ? 'counted' : 'never read';
          const c = ceiling(d, sim.mode);
          return (
            <div key={d.path} className={`ferret-row${!sim.stopped && i === sim.i ? ' next' : ''}${isTop ? ' top3' : ''}${st === 'skipped' ? ' skipped' : ''}`}>
              <div className="lbl" title={d.path}><span className="flags">{d.N ? 'N' : '·'}{d.T ? 'T' : '·'}</span> {d.path}</div>
              <div className="ferret-track track">
                <div className="ferret-prior" style={{ width: pct(d.prior) }} />
                <div className="ferret-ceil" style={{ left: pct(d.prior), width: `${(100 * Math.min(c, SCALE - d.prior) / SCALE).toFixed(2)}%` }} />
                {st === 'verified' && <div className="ferret-dot" style={{ left: pct(score(d)) }} title={`score ${fmt(score(d))}`} />}
                {worst !== null && <div className="ferret-worst" style={{ left: pct(worst) }} />}
              </div>
              <div className={`ferret-state ${isTop ? 'top' : st}`}>{label}</div>
            </div>
          );
        })}
      </div>
      <p className="ferret-log" aria-live="polite">{sim.msg}</p>
      <div className="ferret-legend">
        <span><i style={{ background: 'var(--series-mute)' }} />prior</span>
        <span><i style={{ background: 'repeating-linear-gradient(135deg, color-mix(in srgb, var(--series-1) 30%, transparent) 0 3px, transparent 3px 6px)' }} />boosts it might still earn</span>
        <span><i style={{ background: 'var(--series-1)', borderRadius: '50%', width: 9, height: 9 }} />verified score</span>
        <span><i style={{ background: 'var(--series-3)', borderRadius: '50%', width: 9, height: 9 }} />in the top 3</span>
        <span><i style={{ borderTop: '2px dashed var(--series-2)', height: 0 }} />heap’s worst score</span>
        <span className="mono">N = name can match · T = whole token in code</span>
      </div>
    </div>
  );
};

/* ---------- Figure 4: three worktrees, one index ---------- */

const BLOB_COLOR: Record<string, string> = {
  a1f: '#2a78d6', '3c9': '#1a9e72', '77b': '#c98500', e01: '#8a837a', '9d4': '#d95926', b52: '#8a5cc4', c08: '#3f7a5e',
};
const PATHS = ['src/parse.c', 'src/server.c', 'include/req.h', 'README.md'];
const BASE: Record<string, string> = { 'src/parse.c': 'a1f', 'src/server.c': '3c9', 'include/req.h': '77b', 'README.md': 'e01' };
const V = (o: Record<string, string> = {}) => ({ ...BASE, ...o });
const STEPS: {
  title: string; text: string; views: Record<string, string>[]; segs: string[][]; mem: string[]; changed: [number, string][]; fresh: string[];
}[] = [
  { title: 'Three worktrees at one commit', text: 'Three agents check out the same commit. Their views name the same four blobs, so the index stores each file once. Each blob has one reference per worktree.',
    views: [V(), V(), V()], segs: [['a1f', '3c9', '77b', 'e01']], mem: [], changed: [], fresh: [] },
  { title: 'Agent 2 edits src/parse.c', text: 'The new content is a new blob, 9d4. It goes into the in-memory table and is searchable at once. Only agent 2’s view changes; agents 1 and 3 still see a1f.',
    views: [V(), V({ 'src/parse.c': '9d4' }), V()], segs: [['a1f', '3c9', '77b', 'e01']], mem: ['9d4'], changed: [[1, 'src/parse.c']], fresh: ['9d4'] },
  { title: 'Agent 3 writes the same change', text: 'Same bytes, same object ID. Ferret already has 9d4, so nothing is indexed again; agent 3’s view just points at it.',
    views: [V(), V({ 'src/parse.c': '9d4' }), V({ 'src/parse.c': '9d4' })], segs: [['a1f', '3c9', '77b', 'e01']], mem: ['9d4'], changed: [[2, 'src/parse.c']], fresh: [] },
  { title: 'Agent 1 checks out a branch', text: 'Two files differ on the branch, so two new blobs enter the in-memory table. The index grows by the size of the diff, not the size of the repository.',
    views: [V({ 'src/server.c': 'b52', 'include/req.h': 'c08' }), V({ 'src/parse.c': '9d4' }), V({ 'src/parse.c': '9d4' })], segs: [['a1f', '3c9', '77b', 'e01']], mem: ['9d4', 'b52', 'c08'], changed: [[0, 'src/server.c'], [0, 'include/req.h']], fresh: ['b52', 'c08'] },
  { title: 'The in-memory table flushes', text: 'The table becomes an immutable segment on disk. Views name blobs, not positions in files, so no view changes and no search notices.',
    views: [V({ 'src/server.c': 'b52', 'include/req.h': 'c08' }), V({ 'src/parse.c': '9d4' }), V({ 'src/parse.c': '9d4' })], segs: [['a1f', '3c9', '77b', 'e01'], ['9d4', 'b52', 'c08']], mem: [], changed: [], fresh: [] },
  { title: 'Agent 1 switches back', text: 'Agent 1’s view points at the original blobs again. b52 and c08 have no references left, but a search that started earlier may still read them, so they wait out the grace period.',
    views: [V(), V({ 'src/parse.c': '9d4' }), V({ 'src/parse.c': '9d4' })], segs: [['a1f', '3c9', '77b', 'e01'], ['9d4', 'b52', 'c08']], mem: [], changed: [[0, 'src/server.c'], [0, 'include/req.h']], fresh: [] },
  { title: 'Compaction drops the dead blobs', text: 'After the grace period, compaction merges the segments without b52 and c08. Every view is unchanged.',
    views: [V(), V({ 'src/parse.c': '9d4' }), V({ 'src/parse.c': '9d4' })], segs: [['a1f', '3c9', '77b', 'e01', '9d4']], mem: [], changed: [], fresh: [] },
];

const Blob: React.FC<{ id: string; refs: Record<string, number>; fresh?: boolean }> = ({ id, refs, fresh }) => {
  const rc = refs[id] ?? 0;
  return (
    <span className={`ferret-blob${rc === 0 ? ' dead' : ''}${fresh ? ' fresh' : ''}`} style={{ background: BLOB_COLOR[id] }}>
      {id}<span className="rc" title="references">{rc}</span>
    </span>
  );
};

export const WorktreeFigure: React.FC = () => {
  const [step, setStep] = useState(0);
  const st = STEPS[step];
  const refs: Record<string, number> = {};
  st.views.forEach(view => new Set(Object.values(view)).forEach(b => { refs[b] = (refs[b] ?? 0) + 1; }));
  const stored = st.segs.flat().length + st.mem.length;
  const dead = [...st.segs.flat(), ...st.mem].filter(b => !refs[b]).length;
  return (
    <div className="ferret-fig">
      <div className="ferret-controls">
        <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
        <button type="button" disabled={step === STEPS.length - 1} onClick={() => setStep(step + 1)}>Next</button>
        {STEPS.map((_, i) => (
          <button key={i} type="button" className="mono" aria-pressed={i === step} aria-label={`Step ${i + 1}`} onClick={() => setStep(i)}>{i + 1}</button>
        ))}
      </div>
      <div className="ferret-step-text" aria-live="polite">
        <strong>{step + 1} / {STEPS.length} · {st.title}</strong>
        {st.text}
      </div>
      <div className="ferret-wt">
        <div className="ferret-panel">
          <h4><span>Index</span><span>{stored} blobs</span></h4>
          {st.segs.map((seg, i) => (
            <div key={i} className="ferret-seg">
              <div className="ferret-seg-name">segment {i + 1}{st.segs.length === 1 && step === STEPS.length - 1 ? ' (merged)' : ''}</div>
              <div className="ferret-blobs">{seg.map(b => <Blob key={b} id={b} refs={refs} fresh={st.fresh.includes(b)} />)}</div>
            </div>
          ))}
          <div className="ferret-seg mem">
            <div className="ferret-seg-name">in-memory table</div>
            <div className="ferret-blobs">
              {st.mem.length ? st.mem.map(b => <Blob key={b} id={b} refs={refs} fresh={st.fresh.includes(b)} />) : <span className="hint">empty</span>}
            </div>
          </div>
          <div className="ferret-meter">
            Stored: {stored} blobs for 3 worktrees × 4 files{dead ? `, ${dead} waiting out the grace period` : ''}. Keyed by path: 12.
            <div className="bar"><span style={{ width: `${(100 * stored) / 12}%` }} /></div>
          </div>
        </div>
        <div className="ferret-views">
          {st.views.map((view, w) => (
            <div key={w} className="ferret-panel">
              <h4><span>Agent {w + 1}</span><span>view</span></h4>
              {PATHS.map(p => (
                <div key={p} className={`ferret-wt-row${st.changed.some(([cw, cp]) => cw === w && cp === p) ? ' changed' : ''}`}>
                  <span>{p}</span><Blob id={view[p]} refs={refs} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ---------- Figure 5: read-your-writes ---------- */

type Lane = 'agent' | 'fsevents' | 'ferret';
const LANE: Record<Lane, string> = { agent: 'Agent', fsevents: 'FSEvents', ferret: 'Ferret' };
const TIMELINES: { rows: [number, Lane, string, ('bad' | 'good')?][]; outcome: React.ReactNode }[] = [
  {
    rows: [
      [0.0, 'agent', 'Saves the renamed function in src/parse.c.'],
      [0.4, 'agent', 'Searches for parse_req to find the callers it missed.'],
      [0.4, 'ferret', 'Searches at once. The index still holds the old src/parse.c.'],
      [0.9, 'ferret', 'Answers that src/parse.c still calls parse_req.', 'bad'],
      [11.2, 'fsevents', 'The notice for src/parse.c arrives. Ferret rereads the file, too late for this search.'],
    ],
    outcome: <><span className="bad">Stale.</span> The agent is told to fix a file it has already fixed, and has no way to know the answer is wrong.</>,
  },
  {
    rows: [
      [0.0, 'agent', 'Saves the renamed function in src/parse.c.'],
      [0.4, 'agent', 'Searches for parse_req to find the callers it missed.'],
      [0.4, 'ferret', 'Writes its cookie file and waits for the cookie’s notice.'],
      [11.2, 'fsevents', 'The notice for src/parse.c arrives. Ferret rereads the file and indexes the new blob.'],
      [11.6, 'fsevents', 'The cookie’s notice arrives. Every write before it is in.'],
      [12.1, 'ferret', 'Searches. src/parse.c no longer matches, and the answer lists only the callers still to fix.', 'good'],
    ],
    outcome: <><span className="good">Fresh.</span> The answer includes the agent’s own edit, about 12 ms after the search was asked.</>,
  },
];

export const BarrierFigure: React.FC = () => {
  const [k, setK] = useState(1);
  const timeline = TIMELINES[k];
  return (
    <div className="ferret-fig">
      <div className="ferret-controls">
        <button type="button" aria-pressed={k === 0} onClick={() => setK(0)}>Without the cookie</button>
        <button type="button" aria-pressed={k === 1} onClick={() => setK(1)}>With the cookie</button>
      </div>
      <ol className="ferret-tl">
        {timeline.rows.map(([t, lane, what, mark], i) => (
          <li key={`${k}-${i}`} className={mark}>
            <span className="t">{t.toFixed(1)} ms</span>
            <span className={`lane ${lane}`}>{LANE[lane]}</span>
            <span className="what">{what}</span>
          </li>
        ))}
      </ol>
      <p className="ferret-outcome" aria-live="polite">{timeline.outcome}</p>
    </div>
  );
};

/* ---------- Figure 6: the output-format experiment ---------- */

interface CiRow { label: string; v: number; lo: number; hi: number; color?: string }

export const CiChart: React.FC<{
  title: string; sub: string; rows: CiRow[]; min: number; max: number; ticks: number[];
  tick: (v: number) => string; value: (v: number) => string; zero?: boolean; band?: { at: number; label: string };
}> = ({ title, sub, rows, min, max, ticks, tick, value, zero, band }) => {
  const { ref, width } = usePlotWidth();
  const left = 92;
  const right = 56;
  const top = band ? 22 : 8;
  const rowH = 32;
  const bottom = 26;
  const height = top + rows.length * rowH + bottom;
  const x = (v: number) => left + ((v - min) / (max - min)) * (width - left - right);
  return (
    <div className="chart">
      <div className="chart-title">{title}</div>
      <div className="chart-sub">{sub}</div>
      <div ref={ref} className="chart-plot">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
          {ticks.map(t => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={top - 4} y2={height - bottom + 4}
                stroke={zero && t === 0 ? 'var(--color-text-subtle)' : 'var(--series-grid)'} strokeWidth={zero && t === 0 ? 0.8 : 1} strokeDasharray={zero && t === 0 ? undefined : '2 3'} />
              <text className="chart-axis" x={x(t)} y={height - 8} textAnchor="middle">{tick(t)}</text>
            </g>
          ))}
          {band && (
            <g>
              <line x1={x(band.at)} x2={x(band.at)} y1={top - 4} y2={height - bottom + 4} stroke="var(--series-4)" strokeWidth="1.5" strokeDasharray="4 3" />
              <text className="chart-axis" x={x(band.at) + 5} y={12}>{band.label}</text>
            </g>
          )}
          {rows.map((r, i) => {
            const y = top + i * rowH + rowH / 2;
            const color = r.color ?? 'var(--series-1)';
            return (
              <g key={r.label}>
                <text className="chart-label" x={0} y={y + 4}>{r.label}</text>
                <line x1={x(r.lo)} x2={x(r.hi)} y1={y} y2={y} stroke={color} strokeWidth="2" strokeLinecap="round" />
                <circle cx={x(r.v)} cy={y} r="5" fill={color} stroke="var(--color-bg)" strokeWidth="1.5" />
                <text className="chart-value" x={width - right + 8} y={y + 4}>{value(r.v)}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

const signedPct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;

export const ExperimentFigure: React.FC = () => (
  <div className="ferret-charts two">
    <CiChart
      title="Success by arm"
      sub="All files of the fix in the first five answers, 95% CI"
      rows={[
        { label: 'A0 no tools', v: 45.0, lo: 36.4, hi: 53.3, color: 'var(--series-mute)' },
        { label: 'A1 raw', v: 66.4, lo: 58.3, hi: 74.2 },
        { label: 'A2 line', v: 67.8, lo: 60.0, hi: 75.6 },
        { label: 'A3 context', v: 67.8, lo: 60.0, hi: 75.6 },
        { label: 'A4 route', v: 67.5, lo: 59.7, hi: 75.3 },
      ]}
      min={30} max={80} ticks={[30, 40, 50, 60, 70, 80]}
      tick={t => `${t}%`} value={v => `${v.toFixed(1)}%`}
    />
    <CiChart
      title="Change in total tokens"
      sub="Each arm against the one before it, 95% CI"
      rows={[
        { label: 'A2 − A1', v: -0.4, lo: -6.6, hi: 6.6, color: 'var(--series-mute)' },
        { label: 'A3 − A2', v: 6.0, lo: -0.8, hi: 13.3, color: 'var(--series-mute)' },
        { label: 'A4 − A3', v: -8.4, lo: -14.2, hi: -2.1, color: 'var(--series-2)' },
      ]}
      min={-20} max={20} ticks={[-20, -10, 0, 10, 20]} zero
      band={{ at: -16, label: '−16%: the effect the run was sized for' }}
      tick={t => `${t > 0 ? '+' : ''}${t}%`} value={signedPct}
    />
  </div>
);

/* ---------- Figure 7: four Codex agents at once (pilot) ---------- */

const TEAM = [
  { label: 'Chromium 1', R: [26.96, 76.8], F: [0.96, 34.4] },
  { label: 'Chromium 2', R: [84.13, 312.3], F: [1.28, 140.8] },
  { label: 'Chromium 3', R: [148.95, 163.4], F: [2.53, 110.7] },
  { label: 'Chromium 4', R: [210.21, 217.1], F: [1.01, 49.5] },
  { label: 'Linux 1', R: [0.49, 86.2], F: [0.83, 47.7] },
  { label: 'Linux 2', R: [1.61, 42.5], F: [0.83, 22.9] },
  { label: 'Linux 3', R: [23.5, 110.3], F: [0.74, 113.0] },
  { label: 'Linux 4', R: [25.99, 59.1], F: [0.31, 80.7] },
];

const Dumbbell: React.FC<{ title: string; sub: string; k: 0 | 1; log: boolean; min: number; max: number; ticks: number[] }> = ({
  title, sub, k, log, min, max, ticks,
}) => {
  const { ref, width } = usePlotWidth();
  const left = 82;
  const right = 14;
  const top = 8;
  const rowH = 28;
  const bottom = 26;
  const height = top + TEAM.length * rowH + bottom;
  const f = log ? Math.log10 : (v: number) => v;
  const x = (v: number) => left + ((f(v) - f(min)) / (f(max) - f(min))) * (width - left - right);
  return (
    <div className="chart">
      <div className="chart-title">{title}</div>
      <div className="chart-sub">{sub}</div>
      <div ref={ref} className="chart-plot">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
          {ticks.map(t => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={top - 4} y2={height - bottom + 4} stroke="var(--series-grid)" strokeDasharray="2 3" />
              <text className="chart-axis" x={x(t)} y={height - 8} textAnchor="middle">{t} s</text>
            </g>
          ))}
          <line x1={0} x2={width - right} y1={top + 4 * rowH} y2={top + 4 * rowH} stroke="var(--series-grid)" />
          {TEAM.map((r, i) => {
            const y = top + i * rowH + rowH / 2;
            return (
              <g key={r.label}>
                <text className="chart-label" x={0} y={y + 4}>{r.label}</text>
                <line x1={x(r.R[k])} x2={x(r.F[k])} y1={y} y2={y} stroke="var(--series-mute)" strokeWidth="2" />
                <circle cx={x(r.R[k])} cy={y} r="5" fill="var(--series-2)" stroke="var(--color-bg)" strokeWidth="1.5">
                  <title>{`ripgrep: ${r.R[k]} s`}</title>
                </circle>
                <circle cx={x(r.F[k])} cy={y} r="5" fill="var(--series-1)" stroke="var(--color-bg)" strokeWidth="1.5">
                  <title>{`Ferret: ${r.F[k]} s`}</title>
                </circle>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export const TeamFigure: React.FC = () => (
  <div>
    <div className="ferret-charts two">
      <Dumbbell title="Time spent waiting for search" sub="Seconds per episode, log scale" k={0} log min={0.2} max={300} ticks={[1, 10, 100]} />
      <Dumbbell title="Episode wall time" sub="Seconds per episode" k={1} log={false} min={0} max={320} ticks={[0, 100, 200, 300]} />
    </div>
    <div className="chart-legend">
      <span><i style={{ background: 'var(--series-2)' }} />R: Codex with ripgrep</span>
      <span><i style={{ background: 'var(--series-1)' }} />F: Codex with Ferret</span>
    </div>
  </div>
);

/* ---------- Figure 8: when an index pays for itself ---------- */

const CALC_PRESETS = {
  linux: { B: 29, rg: 3.0, idx: 10, W: 1, searches: 8.4, name: 'Linux' },
  chromium: { B: 60, rg: 10.0, idx: 10, W: 1, searches: 11.9, name: 'Chromium' },
};
type PresetKey = keyof typeof CALC_PRESETS;
const rgFromSlider = (v: number) => +(0.1 * Math.pow(150, v / 100)).toFixed(2);
const sliderFromRg = (s: number) => Math.round((100 * Math.log(s / 0.1)) / Math.log(150));
const niceStep = (raw: number) => {
  const unit = Math.pow(10, Math.floor(Math.log10(raw)));
  return ([1, 2, 2.5, 5, 10].find(m => m * unit >= raw) ?? 10) * unit;
};
const breakEven = (B: number, rg: number, idx: number, W: number) => {
  const save = W * (rg - idx / 1000);
  return save > 0 ? B / save : Infinity;
};

export const BreakEvenFigure: React.FC = () => {
  const [preset, setPreset] = useState<PresetKey>('chromium');
  const [B, setB] = useState(CALC_PRESETS.chromium.B);
  const [rg, setRg] = useState(CALC_PRESETS.chromium.rg);
  const [idx, setIdx] = useState(CALC_PRESETS.chromium.idx);
  const [W, setW] = useState(CALC_PRESETS.chromium.W);
  const { ref, width } = usePlotWidth();
  const P = CALC_PRESETS[preset];
  const Q = breakEven(B, rg, idx, W);
  const choose = (key: PresetKey) => {
    const p = CALC_PRESETS[key];
    setPreset(key); setB(p.B); setRg(p.rg); setIdx(p.idx); setW(p.W);
  };
  const qs = Array.from({ length: 10 }, (_, k) => breakEven(B, rg, idx, k + 1));
  const finite = qs.filter(Number.isFinite);
  const step = niceStep(Math.max(P.searches * 1.3, ...finite.map(v => v * 1.1), 1) / 3);
  const maxQ = step * Math.ceil(Math.max(P.searches * 1.3, ...finite, 1) / step);
  const yTicks = Array.from({ length: Math.round(maxQ / step) + 1 }, (_, k) => k * step);
  const h = 170;
  const left = 40;
  const right = 12;
  const top = 12;
  const bottom = 28;
  const px = (w: number) => left + ((w - 1) / 9) * (width - left - right);
  const py = (v: number) => top + (1 - Math.min(v, maxQ) / maxQ) * (h - top - bottom);
  const shortNum = (v: number) => (v < 10 ? v.toFixed(1) : fmt(Math.round(v)));
  return (
    <div className="ferret-fig">
      <div className="ferret-controls">
        <span className="hint">Preset</span>
        {(Object.keys(CALC_PRESETS) as PresetKey[]).map(key => (
          <button key={key} type="button" aria-pressed={preset === key} onClick={() => choose(key)}>{CALC_PRESETS[key].name}, full-tree scan</button>
        ))}
      </div>
      <div className="ferret-calc">
        <div>
          <div className="ferret-slider">
            <label htmlFor="ferret-b">Build time B</label><output htmlFor="ferret-b">{B} s</output>
            <input id="ferret-b" type="range" min={5} max={150} step={1} value={B} onChange={e => setB(+e.target.value)} />
          </div>
          <div className="ferret-slider">
            <label htmlFor="ferret-rg">ripgrep per search</label><output htmlFor="ferret-rg">{rg < 1 ? `${Math.round(rg * 1000)} ms` : `${rg.toFixed(1)} s`}</output>
            <input id="ferret-rg" type="range" min={0} max={100} step={1} value={sliderFromRg(rg)} onChange={e => setRg(rgFromSlider(+e.target.value))} />
          </div>
          <div className="ferret-slider">
            <label htmlFor="ferret-idx">Index per search</label><output htmlFor="ferret-idx">{idx} ms</output>
            <input id="ferret-idx" type="range" min={1} max={200} step={1} value={idx} onChange={e => setIdx(+e.target.value)} />
          </div>
          <div className="ferret-slider">
            <label htmlFor="ferret-w">Worktrees sharing the index W</label><output htmlFor="ferret-w">{W}</output>
            <input id="ferret-w" type="range" min={1} max={10} step={1} value={W} onChange={e => setW(+e.target.value)} />
          </div>
        </div>
        <div>
          <div className="hint">Break-even</div>
          <div className="ferret-big">{Number.isFinite(Q) ? `${shortNum(Q)} searches` : 'never'}</div>
          <p className="ferret-readout">
            {Number.isFinite(Q)
              ? `Agents in the experiment ran about ${P.searches} searches per task on ${P.name}. At these numbers the build ${Q <= P.searches ? 'is paid back within one task.' : `takes about ${(Q / P.searches).toFixed(1)} tasks to pay back.`}`
              : 'The index is not faster than ripgrep at these numbers, so it never pays back.'}
          </p>
          <div ref={ref} className="chart-plot">
            <svg viewBox={`0 0 ${width} ${h}`} role="img" aria-label="Break-even searches against the number of worktrees sharing the index">
              {yTicks.map(v => (
                <g key={v}>
                  <line x1={left} x2={width - right} y1={py(v)} y2={py(v)} stroke="var(--series-grid)" strokeDasharray="2 3" />
                  <text className="chart-axis" x={left - 6} y={py(v) + 4} textAnchor="end">{Number.isInteger(v) ? fmt(v) : v.toFixed(1)}</text>
                </g>
              ))}
              {qs.map((_, k) => <text key={k} className="chart-axis" x={px(k + 1)} y={h - 8} textAnchor="middle">{k + 1}</text>)}
              <line x1={left} x2={width - right} y1={py(P.searches)} y2={py(P.searches)} stroke="var(--series-4)" strokeWidth="1.5" strokeDasharray="4 3" />
              <text className="chart-axis" x={width - right} y={py(P.searches) - 6} textAnchor="end">searches per task</text>
              {finite.length === qs.length && (
                <>
                  <polyline points={qs.map((v, k) => `${px(k + 1)},${py(v)}`).join(' ')} fill="none" stroke="var(--series-2)" strokeWidth="2" />
                  {qs.map((v, k) => <circle key={k} cx={px(k + 1)} cy={py(v)} r={k + 1 === W ? 4.5 : 2.5} fill="var(--series-2)" />)}
                </>
              )}
            </svg>
          </div>
          <div className="hint">Break-even searches (y) against worktrees sharing the index (x)</div>
        </div>
      </div>
    </div>
  );
};
