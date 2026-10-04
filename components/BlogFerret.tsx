import React from 'react';
import Article, { H2, H3, Note } from './post/Article';
import Figure from './post/Figure';
import Table from './post/Table';
import { M, Eq } from './post/Math';
import References, { makeCite } from './post/References';
import { GroupedBarChart } from './post/Charts';
import {
  TrigramFigure, PlanFigure, TopKFigure, WorktreeFigure, BarrierFigure, ExperimentFigure, TeamFigure, BreakEvenFigure,
} from './post/FerretFigures';
import { FERRET_REFS, FERRET_BIBTEX } from './post/refsFerret';
import { POST_BY_SLUG } from './post/posts';

const Cite = makeCite(FERRET_REFS);
const meta = POST_BY_SLUG.ferret;

const TOC = [
  { id: 'workload', label: 'Why agents search' },
  { id: 'trigrams', label: 'An index for substrings' },
  { id: 'regex', label: 'Regexes become trigram queries' },
  { id: 'topk', label: 'The best 20 files, without reading the rest' },
  { id: 'worktrees', label: 'One index for every worktree' },
  { id: 'fresh', label: 'Seeing your own edits' },
  { id: 'tool', label: 'What the agent sees' },
  { id: 'team', label: 'Four agents at once' },
  { id: 'breakeven', label: 'When an index pays for itself' },
  { id: 'limits', label: 'Limits' },
];

// Tool output as the agents received it in the team pilot (section 8), trimmed after two files.
const SearchResult: React.FC = () => (
  <div className="ferret-out" aria-label="A Ferret search result">
    <pre>
      <span className="call">search {'{"pattern": "tab hover card"}'}</span>{'\n'}
      {'35 matching lines in 23 files\n\n'}
      {'chrome/browser/ui/views/chrome_typography.h\n'}
      {'25-  CONTEXT_DIALOG_BODY_TEXT_SMALL = CHROME_TEXT_CONTEXT_START,\n26-\n'}
      <span className="hit">{'27:  // Text of the page title in the tab hover card.'}</span>{'\n'}
      {'28-  CONTEXT_TAB_HOVER_CARD_TITLE,\n29-\n\n'}
      {'chrome/browser/ui/thumbnails/thumbnail_tab_helper.h\n25-}\n26-\n'}
      <span className="hit">{'27:// Maintains the thumbnail image shown in e.g. tab hover cards. Owned by the'}</span>{'\n'}
      {"28-// tab's TabFeatures; only created when a feature that needs thumbnails is\n29-// enabled.\n"}
      <span className="more">…</span>
    </pre>
  </div>
);

const HintResult: React.FC = () => (
  <div className="ferret-out" aria-label="A Ferret search with a hint">
    <pre>
      <span className="call">{'search {"pattern": "navigateTo(route",\n        "path_glob": "chrome/browser/resources/settings/router.ts"}'}</span>{'\n'}
      {'No matches under path_glob "chrome/browser/resources/settings/router.ts";\n'}
      {'outside it: at least 172 matching lines in 81 files, first\n'}
      {'chrome/browser/resources/signin/profile_picker/navigation_mixin.ts, …'}
    </pre>
  </div>
);

// A real call from the fourth pilot (section 8), trimmed after one file.
const WidenResult: React.FC = () => (
  <div className="ferret-out" aria-label="A Ferret search that widened its scope">
    <pre>
      <span className="call">{'search {"pattern": "MediaStreamTrackProcessor",\n        "path_glob": "third_party/blink/renderer/modules/mediastream/**"}'}</span>{'\n'}
      {'No matches under path_glob "third_party/blink/renderer/modules/mediastream/**";\n'}
      {'these are the matches under "third_party/blink/renderer/modules" instead.\n'}
      {'82 matching lines in 5 files\n\n'}
      {'third_party/blink/renderer/modules/breakout_box/media_stream_track_processor.h\n'}
      {'19-class MediaStreamTrack;\n'}
      <span className="hit">{'20:class MediaStreamTrackProcessorInit;'}</span>{'\n'}
      {'21-class ReadableStream;\n'}
      <span className="more">…</span>
    </pre>
  </div>
);

const BlogFerret: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <Article onBack={onBack} title={meta.title} date={meta.date} repo={meta.repo} toc={TOC}>
    <H2 id="workload">Why agents search</H2>
    <p>
      Coding agents find their way around a repository by searching it, about ten times per task. This post
      builds a code search engine for them from the ground up: what a trigram index is, how a regex becomes an
      index query, how to return the best 20 files without reading the rest, how many agents can share one
      index, and how every search sees the agent’s own latest edits. Each idea has a figure you can step
      through. The engine is Ferret, which I built, and the last sections test whether agents notice.
    </p>
    <p>
      A coding agent is a language model in a loop. It reads the task, calls a tool, reads what the tool
      returned and decides what to do next, until it can answer. It cannot read the repository first: Chromium
      has about 460,000 source files, far more text than fits in any model’s context. So the agent works the
      way a developer does on their first day in a codebase. It searches for a name from the bug report, opens
      the files that match, searches for the callers of what it found, and narrows down from there.
    </p>
    <p>
      Search decides whether the agent succeeds, not only how fast. In the experiment of section 7, the same
      model found the files to fix for 14% of Chromium bugs without a search tool and for about half of them
      with one.
    </p>
    <p>
      Most agents search with grep or ripgrep. ripgrep is very good at reading files quickly, but it keeps
      nothing between searches, so every search reads the tree again: a median of 2.2 seconds for Linux over
      1,000 benchmark queries, and about 10 for Chromium, on my MacBook Air M3. Agents also work in parallel more and more. Each gets its own git
      worktree, a separate checkout of the same repository, and they all search at the same time. In the experiment of section 8, an agent with
      ripgrep waited a median of 10 seconds per task for search when it worked alone, and 30 seconds when four
      agents worked at once.
    </p>
    <p>
      An index does the reading once, ahead of time, and answers each search from a structure built for it.
      Zoekt, the trigram engine behind Sourcegraph’s code search, does this and is fast <Cite ids={[2]} />.
      It indexes commits, though: an edit becomes searchable after a commit and a rebuild, and a new branch is
      indexed again. Agents edit files nobody has committed, in several checkouts at once, and read only the
      first few results. The sections below build an index for that, one idea at a time, in the order a query
      meets them.
    </p>
    <Note label="About the numbers">
      The figures run on small example data so you can step through each mechanism. Numbers from real
      repositories name their source. Those marked preliminary come from development runs on a busy laptop;
      the final benchmark, now running on a quiet machine, will replace them.
    </Note>

    <H2 id="trigrams">An index for substrings</H2>
    <p>
      Start with the index at the back of a book. It lists each word with the pages it appears on. Search
      engines keep the same structure and call it an <strong>inverted index</strong>: for every term, a sorted
      list of the documents that contain it, called its <strong>posting list</strong>. To find the documents
      that contain two terms, walk both lists side by side and keep the numbers that appear in both. That takes
      time in proportion to the two lists, which are much shorter than the corpus.
    </p>
    <p>
      Words do not work for code. An agent searches for <code>parse_req</code>, which is half an identifier,
      for <code>{'->flags'}</code>, which is mostly punctuation, or for a regex. None of these is a word that an
      index of words would have.
    </p>
    <p>
      A <strong>trigram</strong> index keys on every three-character window of the text instead.{' '}
      <code>parse_request</code> has eleven trigrams: <code className="ferret-wrap">par ars rse se_ e_r _re req equ que ues est</code>.
      Any line that contains <code>parse_request</code> contains all eleven, so intersecting their eleven
      posting lists finds every place a match can be. It can also find places where all eleven occur in a
      different order. So the index only proposes <strong>candidates</strong>, and Ferret reads each candidate
      and runs the real matcher on it. A false candidate costs a little time and never gives a wrong result.
    </p>
    <p>
      Why three characters? Pairs are so common that their posting lists cover most of the corpus and rule out
      almost nothing. Longer grams rule out more, but the index grows much bigger and cannot serve a query
      shorter than the gram. Three is the usual compromise, the one Russ Cox described for Google Code
      Search <Cite ids={[1]} />. GitHub’s code search indexes grams of varying length instead <Cite ids={[4]} />.
    </p>

    <Figure
      n={1}
      plain
      caption={
        <>
          Eight chunks, one posting matrix. Each row of the matrix is a trigram of the folded query and each
          column a chunk; a filled cell means the chunk contains that trigram. The bottom row is the
          intersection: the candidates, which the verifier then reads. <code>read_file</code> produces a false
          candidate, <code>black</code> finds a word spelled with a Kelvin sign, and <code>re</code> is too
          short for a trigram, so its candidates come from every trigram that contains it. Example data;
          matching ignores case and trigrams never cross a line break, as in Ferret.
        </>
      }
    >
      <TrigramFigure />
    </Figure>

    <p>
      Ferret’s unit of posting is a chunk: about 8 KiB of a file, cut only at line breaks, so a line never
      spans two chunks. A posting stores just the chunk’s number. Posting lists are sorted, so Ferret stores the
      gaps between numbers, packs them into as few bits as each block needs, and decodes and intersects them
      with the CPU’s vector instructions <Cite ids={[5]} />. Zoekt also stores the position of every trigram
      occurrence. That lets it check that the trigrams sit next to each other before reading any text, and
      makes its index about 2.7 times the size of the text. Ferret stores the text once and checks candidates
      by reading them. On Linux, Ferret’s index is 0.43 times the size of Zoekt’s (preliminary).
    </p>
    <p>
      Agents mostly search without regard to case, so Ferret folds case once, when it builds the index. A–Z
      become a–z, and so do two non-ASCII letters that RE2 treats as case variants of ASCII ones: U+212A KELVIN
      SIGN becomes <code>k</code> and U+017F LATIN SMALL LETTER LONG S becomes <code>s</code>. A
      case-insensitive query then needs one lookup per trigram, where Zoekt looks up every case variant, up to
      eight per trigram.
    </p>

    <H2 id="regex">Regexes become trigram queries</H2>
    <p>
      Agents use regexes often, for example to try several spellings of a name in one search. A regex has no
      single string to split into trigrams, but you can still read off what every match must contain:
    </p>
    <ul>
      <li><code>foo|bar</code>: a match contains the trigrams of <code>foo</code> or those of <code>bar</code>.</li>
      <li>
        <code>get.*Value</code>: anything can sit between the two parts, but both must appear, so the trigrams
        of <code>get</code> and of <code>value</code> are all required.
      </li>
      <li>
        <code>colou?r</code>: the match is <code>color</code> or <code>colour</code>, so it contains{' '}
        <code>col</code> and <code>olo</code>, and either <code>lor</code> or <code>our</code>.
      </li>
      <li>
        <code>a.b</code> or <code>{'\\w+'}</code>: no three characters are fixed, so the index cannot narrow the
        search and every chunk is a candidate.
      </li>
    </ul>
    <p>
      Ferret derives these conditions from the regex’s structure. It walks the parse tree that RE2 itself
      compiled <Cite ids={[3]} />, so the planner and the matcher can never disagree about what a pattern
      means. For each node it tracks either the exact strings the node can match, while there are few, or
      their possible prefixes and suffixes, plus a formula over trigrams that every match satisfies. Joining
      two nodes pairs one side’s suffixes with the other’s prefixes, which finds the trigrams that cross the
      boundary between them. The result is a tree of ANDs and ORs over trigrams, with no negation.
    </p>
    <p>
      The plan must never reject a chunk that contains a match. A property test checks exactly that on
      generated patterns and texts, with the production planner on one side and RE2 as the judge. Guards fail
      the test if RE2 matches too rarely for a pass to mean anything, and four planted planner bugs must each
      be caught.
    </p>
    <p>
      The plan also names a literal that every match contains, for a fast byte scan before the real matcher
      runs. That literal avoids <code>k</code> and <code>s</code>, because the scan reads raw bytes and those
      two letters have the non-ASCII twins from section 2. That is why <code>parse_request</code> yields{' '}
      <code>e_reque</code>.
    </p>

    <Figure
      n={2}
      plain
      caption={
        <>
          Real plans, as printed by <code>ferret plan --regex</code> for case-insensitive search. Every box is a
          necessary condition: a chunk can contain a match only if the tree is true for its trigrams. Dashed
          boxes are alternatives. The last pattern was the slowest regex of the development set before the
          fix described in section 4.
        </>
      }
    >
      <PlanFigure />
    </Figure>

    <H2 id="topk">The best 20 files, without reading the rest</H2>
    <p>
      grep prints matches in the order it meets files on disk. An agent reads the first screen of output and
      acts on it, so which files come first matters as much as finding them. The simple approach is to find
      every match, score every file and sort. For a common name in Chromium that means reading thousands of
      files to return twenty.
    </p>
    <p>
      Ferret returns the best K files, 20 by default, in a fixed order, and usually reads far fewer. Every
      document has a static rank key. A tier puts source before tests, documentation, vendored and generated
      code, and within a tier a prior combines path depth, size and file name. Segments store documents in that
      order, so candidates stream out best prior first. A file’s score for a query is its prior plus a boost of
      at most 20,480: 8,192 when a match is a whole identifier in code, 8,192 when the file name matches, and up
      to 4,096 for the number of matches.
    </p>
    <p>
      That ordering gives a safe stop, like a league table late in the season. Keep a heap of the K best files
      so far. Before verifying the next candidate, take the best score it could still reach: its prior plus the
      largest possible boost. Every later candidate has a lower prior. Once that bound falls below the worst
      file in the heap, nothing left can get in, and the heap already holds the exact top K. The answer is
      identical to reading every candidate.
    </p>
    <p>The basic bound assumes every file could earn every boost. Most cannot, and proving that cheaply moves the stop earlier:</p>
    <ul>
      <li>
        <strong>Name-aware bound.</strong> Only a file whose name can match can earn the name boost. Each
        segment keeps its file names packed together, so one scan finds those files.
      </li>
      <li>
        <strong>Code-token bound.</strong> For an identifier query, only a file where it occurs as a whole token
        in code can earn the identifier boost. The index lists those files per token, computed by the same
        lexer the verifier uses.
      </li>
      <li>
        <strong>Counting only.</strong> A file whose own bound cannot reach the heap still has its matches
        counted, because the totals depend on them, but nothing else is done with it.
      </li>
    </ul>
    <p>None of these changes a score. They only tighten the stop test.</p>

    <Figure
      n={3}
      plain
      caption={
        <>
          The top 3 of 16 candidates for <code>parse_request</code>. Each bar is a candidate file in rank order:
          its prior, then the hatched range of boosts it might still earn. The search stops once no remaining
          bar crosses the dashed line. With the basic bound the search verifies nine files, with the name-aware
          bound six and with the code-token bound four, and the top three never change. Example data with
          Ferret’s boost constants; all files share one tier.
        </>
      }
    >
      <TopKFigure />
    </Figure>

    <p>
      With several threads, workers read the heap’s worst score from one atomic word and skip documents it
      already excludes. The worst score only improves over time, so any document a worker skips early would
      also be skipped by the single ordered commit that builds the answer. Results are identical at 1, 2, 4 and
      8 threads, and a test compares them.
    </p>

    <Table
      n={1}
      caption={
        <>
          Query latency on Chromium, Zoekt against Ferret: the 99th percentile per kind of query, and the
          median and 99th percentile overall. Preliminary: the 200-query development set at 4 threads, over
          per-query medians, on a busy MacBook Air M3, with Zoekt measured in an earlier run of the same
          queries. Every Ferret result equals an exhaustive search’s.
        </>
      }
      columns={[
        { key: 'kind', label: 'Queries' },
        { key: 'count', label: 'Count', numeric: true },
        { key: 'zoekt', label: 'Zoekt', numeric: true },
        { key: 'ferret', label: 'Ferret', numeric: true },
      ]}
      rows={[
        { kind: 'Identifiers, p99', count: '80', zoekt: '25 ms', ferret: '7.6 ms' },
        { kind: 'Other literals, p99', count: '40', zoekt: '13 ms', ferret: '16 ms' },
        { kind: 'Regexes, p99', count: '40', zoekt: '1,064 ms', ferret: '6.5 ms' },
        { kind: 'Short queries, p99', count: '20', zoekt: '427 ms', ferret: '9.4 ms' },
        { kind: 'All, median', count: '200', zoekt: '2.1 ms', ferret: 'about 1.5 ms' },
        { kind: 'All, p99', count: '200', zoekt: '427 ms', ferret: 'about 10 ms', highlight: true },
      ]}
    />

    <p>
      The medians are close. The difference is in the slowest queries, which are the ones that stall an agent.
      Zoekt’s come from short queries and regexes. A query of one or two characters has no trigram, so Ferret
      answers it from the union of the trigrams that contain it, as figure 1 does for <code>re</code>. Zoekt
      narrows a regex by its literal runs of three or more characters, while Ferret uses the whole plan from
      section 3. On plain literals Zoekt is a little faster at the tail: its positions take it straight to the
      offsets where a match can start, while Ferret scans each candidate chunk. That is the price of an index
      less than half the size.
    </p>
    <p>
      The tail is also where Ferret’s own bugs hid. For an alternation such as{' '}
      <code className="ferret-wrap">(?:WindowHandler|ConvertSettingsToDictionary)</code> there is no single literal to look for in the
      file names, so the name-aware bound once tested all 461,767 Chromium file names with the regex: 37 ms for
      a query with 118 candidate chunks. Scanning once per branch of the alternation, and only among documents
      that have candidates, brought it to 2.45 ms.
    </p>

    <H2 id="worktrees">One index for every worktree</H2>
    <p>
      Agent tools increasingly run several agents on one repository at once, each in its own git worktree so
      their edits stay apart. Four worktrees of Chromium are four copies of almost the same 460,000 files. An
      index keyed by path stores each of them four times and builds each from scratch.
    </p>
    <p>
      Git already has the fix. It names each version of a file by a hash of its bytes, the{' '}
      <strong>blob ID</strong>, so the same content gets the same ID in every checkout. Ferret keys its index by
      blob ID. A blob never changes, so an edit appends a new blob to an in-memory table and repoints one entry
      in that worktree’s map from paths to blobs. Equal content is stored once, whoever writes it.
    </p>
    <p>
      Each worktree’s map, its <strong>view</strong>, is a persistent data structure. Publishing an edit copies
      only the small piece of the map it touches, so one edit takes about 3 µs at 500,000 files (median,
      micro-benchmark), and a search already running keeps the snapshot it started with. A view holds one
      reference per distinct blob. When nothing references a blob any more, it waits out a grace period of
      10 minutes, so a search still reading it can finish, and then the index drops it.
    </p>

    <Figure
      n={4}
      plain
      caption={
        <>
          Three agents, one index. Colors are blobs, the badge on a blob is its reference count, and a
          highlighted row is the entry that just changed. The index grows only when content is new. Simplified:
          real segments hold thousands of blobs, the in-memory table flushes at 8 MiB, and blob names are full
          git object IDs.
        </>
      }
    >
      <WorktreeFigure />
    </Figure>

    <p>
      On Linux (about 96,000 files), the first worktree took 30.0 s to register, about as long as building a
      fresh index, including the symbol table that <code>find_symbol</code> uses. The second and third
      worktrees at the same commit took 2.2 and 4.4 s, all of it the scan of the directory tree, and added no
      index bytes. A worktree on another branch costs work in proportion to its diff: with 479 changed files,
      about 3 s and 10 MiB of new segments. Zoekt also stores shared files once across branches, but it
      rebuilds the whole index to add one, 93 to 97 s per branch. The scan is the part that grows with the
      tree: on Chromium the first worktree took 117 s and each further one 44 s, nearly all of it the scan.
    </p>

    <H2 id="fresh">Seeing your own edits</H2>
    <p>
      An agent renames a function, then searches for the old name to find the callers it missed. If the index
      has not seen the edit yet, the search reports the file the agent just fixed as still calling the old
      name. The agent cannot tell that the answer is stale, so it trusts it and edits the file again. Ferret
      therefore promises <strong>read-your-writes</strong>: a search sees every write that finished before the
      search began.
    </p>
    <p>
      macOS reports file changes through FSEvents, a stream of change notices that arrive shortly after each
      write <Cite ids={[6]} />. Ferret’s watcher rereads each changed file and puts the new blob in the
      in-memory table from section 5. The hard part is knowing, when a search arrives, whether the stream has
      caught up with every write before it.
    </p>
    <p>
      Ferret answers that with a cookie. Before a search runs, Ferret writes a tiny file of its own into a
      directory it owns inside the worktree and waits for that file’s notice to come back. Notices arrive in
      order, so once the cookie’s notice is in, so is every write before it. Watchman synchronizes its queries
      the same way <Cite ids={[7]} />.
    </p>

    <Figure
      n={5}
      plain
      caption={
        <>
          An agent renames <code>parse_req</code>, then searches for it. Without the barrier, the search runs
          before the edit’s notice arrives and returns the old file. With it, the search waits until its own
          cookie comes back, about 12 ms, and sees the edit. Illustrative timeline; the delivery delay is the
          measured floor on this laptop.
        </>
      }
    >
      <BarrierFigure />
    </Figure>

    <p>
      The barrier costs the delivery delay itself. fseventsd delivered no notice in under 10 to 12 ms, and no
      stream setting moved that floor, so a synced search pays about that much. On Linux, an edit is searchable
      through the watcher 12.3 ms after it is written at the median and 12.6 ms at the 99th percentile. For
      Zoekt it takes a commit, a delta build and a reload: 256 ms at the median and 319 ms at the 99th. If the
      cookie does not come back within a second, the search runs anyway and marks its result{' '}
      <code>stale</code>, so the agent knows not to trust it.
    </p>
    <p>
      That mark caught a real bug. My agent experiment resets each worktree between tasks with{' '}
      <code>git clean</code>, which deleted Ferret’s cookie directory. Every search then waited out its full
      second and came back stale, and a test showed it missing the agent’s edits. Ferret now recreates the
      directory when it disappears and keeps an ignore file in it, so git leaves it alone.
    </p>

    <H2 id="tool">What the agent sees</H2>
    <p>
      An agent calls Ferret through MCP, the Model Context Protocol, a standard way for an agent to discover a
      tool and call it <Cite ids={[8]} />. A tool is a name, a description written for the model, and a JSON
      schema for its arguments. Ferret offers three: <code>search</code>, <code>find_symbol</code> for
      definitions, and <code>index_status</code>. A search returns the ranked files with two lines of context
      around each match, the total counts, and no more text than a byte budget allows, so one call cannot flood
      the agent’s context. This is a real call from one of the agents in section 8:
    </p>
    <SearchResult />

    <H3>Does the format of the results matter?</H3>
    <p>
      Ranking, context and counts cost engineering, so I tested whether the agent uses them. I pre-registered
      the protocol before the main run. One model, gpt-6-luna at medium reasoning effort, localizes the files to
      change for 120 tasks: 40 issues from small Python repositories <Cite ids={[10]} />, 40 Linux fixes and 40
      Chromium fixes. The Linux and Chromium tasks come from commits after the model’s training cutoff,
      rewritten as symptom reports, so the model cannot know the answer in advance <Cite ids={[11]} />. Every
      task ran three times per arm, 1,800 episodes in all. The arms differ only in what the search tool
      returns. Success means every file of the real fix is among the agent’s first five answers. Contrasts use
      a paired cluster bootstrap over tasks with Holm correction.
    </p>

    <Table
      n={2}
      caption="The five arms of the output-format experiment, with success and median tokens per episode."
      columns={[
        { key: 'arm', label: 'Arm' },
        { key: 'returns', label: 'Search returns' },
        { key: 'success', label: 'Success', numeric: true },
        { key: 'tokens', label: 'Median tokens', numeric: true },
      ]}
      rows={[
        { arm: 'A0', returns: 'No tools: the task text and the top-level file listing', success: '45.0%', tokens: '1.4k' },
        { arm: 'A1 raw', returns: <><code>path:line:text</code> in path order, like grep</>, success: '66.4%', tokens: '100.0k' },
        { arm: 'A2 line', returns: 'Matching lines, files ranked', success: '67.8%', tokens: '100.5k' },
        { arm: 'A3 context', returns: 'Ranked, ±2 lines of context, counts, an output budget', success: '67.8%', tokens: '109.1k' },
        { arm: 'A4 route', returns: 'A3, plus definitions first and then call sites for identifiers that match many files', success: '67.5%', tokens: '97.0k' },
      ]}
    />

    <p>
      Ranking and context made no measurable difference to success, to tokens, or to how soon the agent first
      saw a right file. The token intervals rule out the 16% reduction the run was sized to detect. Routing did
      save tokens: A4 used 8.4% fewer than A3 (95% CI −14.2% to −2.1%, Holm-adjusted p = 0.028), the only
      pre-registered contrast below 0.05, with success unchanged. The model reads raw grep output well. What
      saved tokens was sending it to the definition first.
    </p>

    <Figure
      n={6}
      plain
      caption={
        <>
          The pre-registered contrasts, 120 tasks with three samples each. Every format of search output solves
          about the same share of tasks; only routing moves tokens. Search itself matters most on Chromium,
          where the model solves 14% of tasks without tools and about half with them. Token contrasts are
          estimated on the log scale and shown as the percent change of the later arm. The small repositories
          are mostly solved without tools, so they say more about what the model remembers than about how it
          searches.
        </>
      }
    >
      <ExperimentFigure />
      <div style={{ marginTop: 28 }}>
        <GroupedBarChart
          title="Success by repository"
          sub="Percent of tasks, no tools against the lowest and highest of the four search arms"
          unit="%"
          groups={['Small Python repos', 'Linux', 'Chromium']}
          series={[
            { label: 'No tools', values: [70.8, 50.0, 14.2], displays: ['70.8', '50.0', '14.2'] },
            { label: 'Search, lowest arm', values: [85.0, 65.8, 48.3], displays: ['85.0', '65.8', '48.3'] },
            { label: 'Search, highest arm', values: [87.5, 69.2, 50.8], displays: ['87.5', '69.2', '50.8'] },
          ]}
        />
      </div>
    </Figure>

    <H3>The description is part of the interface</H3>
    <p>
      The first pilot of the experiment in section 8 showed what fewer calls means in practice. Agents with
      Ferret used 27% more tokens than agents with ripgrep, and made more than twice as many searches. With ripgrep they joined names
      into one call, as in <code>{"rg 'FooBar|foo_bar'"}</code>. With Ferret they searched one name at a time,
      and 49 of their 188 searches came back empty, mostly a single name under a path filter that missed. Every
      empty result costs a turn, and every turn re-reads the whole conversation.
    </p>
    <p>
      Three changes addressed this. The tool’s description now shows the one-call form for several names. An
      empty literal search that reads as a regex, such as <code>Open|Close</code>, is rerun as one. And an empty
      search under a path filter says where the matches are instead:
    </p>
    <HintResult />
    <p>
      On the same 8 tasks, the agents’ searches per task fell from 23.5 to 13.6, searches joining several names
      rose from 6 to 57, empty results fell from 49 to 13, and tokens fell by 22% (geometric mean), with the
      same tasks solved. Section 8 shows how much of that carried over to the test tasks.
    </p>

    <H2 id="team">Four agents at once</H2>
    <p>
      The last question is the one Ferret was built for: does it help real agents, alone and in a team? I ran
      Codex CLI, OpenAI’s coding agent, headless with gpt-6-luna <Cite ids={[9]} /> on the Linux and Chromium
      test tasks of section 7. In arm R, Codex runs as it ships and searches with ripgrep through its shell. Arm
      F adds Ferret’s MCP server and one sentence in the prompt saying to use it for search; the shell stays
      available. In the team setting, four agents work at once on 80 tasks, each on a different bug in its own
      worktree of the same repository, and the four F agents share one Ferret daemon. In the solo setting, one
      agent works at a time on 40 of the same tasks. Both arms run the same batch back to back, so they see the
      same API latency. I pre-registered two endpoints, the time an episode spends waiting for search and its
      wall time, with Holm’s correction across the four comparisons.
    </p>

    <Figure
      n={7}
      plain
      caption={
        <>
          Ferret against ripgrep, task by task. Each grey dot is one task’s F/R ratio, the blue point is the
          ratio of geometric means with its paired bootstrap 95% interval, and the line at 1× means no
          difference. Search time is the wall time inside search calls as Codex reports them: Ferret’s MCP calls,
          plus shell commands that run rg, grep, git grep, ag or ack, including through pipes. It is compared as
          1 + seconds, so an episode without searches still counts. The rows per repository are descriptive.
          Codex CLI 0.160.0, gpt-6-luna at medium effort, one episode per task and arm.
        </>
      }
    >
      <TeamFigure />
    </Figure>

    <Table
      n={3}
      caption="Medians per episode, and means for searches. Success means every file of the real fix is among the agent’s first five answers."
      columns={[
        { key: 'arm', label: 'Setting and arm' },
        { key: 'wait', label: 'Search wait', numeric: true },
        { key: 'wall', label: 'Wall time', numeric: true },
        { key: 'searches', label: 'Searches', numeric: true },
        { key: 'tokens', label: 'Tokens', numeric: true },
        { key: 'success', label: 'Success', numeric: true },
      ]}
      rows={[
        { arm: 'Four at once, ripgrep', wait: '18.8 s', wall: '94 s', searches: '11.4', tokens: '641k', success: '60.0%' },
        { arm: 'Four at once, Ferret', wait: '0.9 s', wall: '80 s', searches: '19.2', tokens: '841k', success: '56.2%', highlight: true },
        { arm: 'One at a time, ripgrep', wait: '9.7 s', wall: '76 s', searches: '9.2', tokens: '563k', success: '70.0%' },
        { arm: 'One at a time, Ferret', wait: '1.4 s', wall: '77 s', searches: '17.2', tokens: '736k', success: '57.5%' },
      ]}
    />

    <p>
      With four agents at once, F agents waited 0.14 times as long for search as R agents (95% CI 0.11 to 0.19)
      and finished their episodes in 0.85 times the wall time (0.76 to 0.95). Both pass Holm’s correction
      (adjusted p below 0.001 and 0.007). Alone, F agents waited 0.30 times as long (0.21 to 0.43), but their
      wall time did not change (0.96, 0.83 to 1.11). A single agent waits about 10 seconds per episode for
      ripgrep, too small a share of a 76-second episode to show.
    </p>
    <p>
      The difference between the settings is concurrency. On the 40 tasks that ran in both, R’s search time grew
      3.9 times when four agents ran at once (2.6 to 6.0), from a median of 9.7 to 29.8 seconds per episode:
      four ripgrep processes reading the same tree compete for the same cores and disk. F’s did not change
      (0.99 times, 0.86 to 1.14). That is the case Ferret was built for, and it is where it saves time.
    </p>
    <p>
      It did not make the agents better or cheaper. F agents found the right files about as often in the team
      setting (−4 points, −12 to +5) and somewhat less often alone (−12 points, −25 to 0). Neither difference is
      significant, but neither is a gain. They also used more tokens: 1.35 times R’s in the team setting (1.18
      to 1.55) and 1.56 times alone (1.29 to 1.90). Table 3 shows why: F agents searched about 8 more times
      per episode, and every call is a turn that re-reads the conversation.
    </p>
    <p>
      The logs show where the extra calls came from. Two thirds of R’s ripgrep commands tried several names
      at once, against 38% of F’s calls. F agents limited 85% of their searches to a path, 44% of those to a
      single file, and searched inside one named file 6.9 times per episode, where R agents did so
      4.0 times. And 18% of F’s searches came back empty, against 2% of R’s. Every one of the 235 empty
      searches under a path had matches elsewhere in the repository, yet the agent’s next call widened or
      dropped the path only 23% of the time. Mostly it tried a new name, in the same path or another narrow
      one.
    </p>

    <H3>Fewer, better searches</H3>
    <p>
      So after the main run I changed the tool once more. A call takes a list of <code>patterns</code> and
      searches them all in one pass. An empty search under a path is rerun in the nearest parent directories,
      then in the whole worktree, and the first scope with matches becomes the reply. The description now says
      to read a file already found instead of searching inside it, and to filter by directory rather than
      file. Here the agent looked in the wrong directory, and the reply found the class one directory over:
    </p>
    <WidenResult />
    <p>
      On the 8 pilot tasks, F agents’ searches per task fell from 13.6 to 7.1, below R’s 8.1. Searches limited
      to a single file fell from 42 to 4, and empty results from 13 to 0. The agents read files twice as often
      instead. Tokens did not fall: F used 1.38 times R’s. But 8 tasks cannot settle tokens. R, which did not
      change at all, moved by 0.71 times between the two pilots. Whether fewer calls also means fewer tokens
      needs a run the size of the main one.
    </p>
    <p>
      Of Ferret’s 2,213 answers, 40 (1.8%) came back marked stale: the freshness wait of section 6 ran out after
      a second, most often on a solo agent’s first search. The success gap is about the same on tasks with and
      without a stale answer.
    </p>

    <H2 id="breakeven">When an index pays for itself</H2>
    <p>
      An index costs its build before it saves anything. Let <em>B</em> be the build time, <em>W</em> the
      number of worktrees sharing the index, and <em>t</em><sub>rg</sub> and <em>t</em><sub>idx</sub> the time
      per search with ripgrep and with the index. The index has paid for itself after <M>{'Q^{*}'}</M> searches:
    </p>
    <Eq>{String.raw`Q^{*} = \frac{B}{W\,(t_{\text{rg}} - t_{\text{idx}})}`}</Eq>
    <p>
      Sharing is what divides the cost: four agents on one index pay for the build four times faster. Every term
      is measurable. <em>B</em> comes from the benchmark builds, and <em>t</em><sub>rg</sub> and{' '}
      <em>t</em><sub>idx</sub> from replaying the agents’ own logged searches against ripgrep, Zoekt and
      Ferret. That replay is pre-registered and runs with the final benchmarks, so the calculator below uses
      rough full-tree numbers to show the shape of the answer.
    </p>

    <Figure
      n={8}
      plain
      caption={
        <>
          Move the sliders; the chart shows how sharing one index across worktrees divides the break-even point.
          Illustrative until the replay runs. Linux presets come from the final benchmark: 30.0 s to register
          the first worktree, and medians over 1,000 queries of 2.2 s for ripgrep and 16 ms for the index.
          Chromium’s registration time, 117 s, is final; its 10 s for ripgrep and 10 ms per indexed search are
          preliminary. MacBook Air M3. Agents mostly scope searches with a path filter, which makes ripgrep
          faster, so the replay of their real searches will give the honest numbers. Searches per task are
          means over the search arms of the experiment.
        </>
      }
    >
      <BreakEvenFigure />
    </Figure>

    <H2 id="limits">Limits</H2>
    <ul>
      <li>
        One model in each experiment, and one agent harness, Codex, for the team experiment. The effects could
        differ for other models and harnesses.
      </li>
      <li>The task is localization: finding the files to change, not writing the fix.</li>
      <li>
        Section 8 compares Ferret with ripgrep, the search tool Codex ships with. Zoekt has no MCP server in
        this setup, so it enters only through the replay in section 9.
      </li>
      <li>
        One episode per task and arm. The intervals cover variation between tasks, not between repeated runs
        of the same task.
      </li>
      <li>
        The agents could reach the internet. In 11 of the 240 episodes of section 8, 9 of them with ripgrep, an
        agent downloaded upstream source or searched the project’s commits, which can reveal the fix. Without
        those tasks every estimate moves by at most 0.01 times for search and wall time, and the team’s wall
        time still passes Holm’s correction.
      </li>
      <li>Ferret runs on macOS only: it watches files with FSEvents and its kernels use NEON.</li>
      <li>
        The Chromium latency table and the index size are preliminary. The quiet-machine run on the frozen
        1,000-query sets for Chromium and Linux replaces them.
      </li>
    </ul>

    <References refs={FERRET_REFS} bibtex={FERRET_BIBTEX} />
  </Article>
);

export default BlogFerret;
