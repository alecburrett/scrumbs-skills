#!/usr/bin/env node
// Scrumbs conformance checks. No dependencies, no config, no network.
//
//   node scripts/check.mjs              run the checks
//   node scripts/check.mjs --self-test  prove every check can actually fail
//
// Checks operate on an in-memory snapshot of the repo, which is what lets
// --self-test mutate a copy and assert the relevant category goes red. A check
// that has never failed is not evidence of anything. See CONTRIBUTING.md.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const rel = (p) => p.replace(ROOT + "/", "");

// The lifecycle needs all seven. A missing one is a deletion, not a smaller team.
const REQUIRED_PERSONAS = ["dex", "iris", "pablo", "quinn", "rex", "stella", "viktor"];

// Bullets that must be byte-identical in every skill. `short` is what the
// maintainer comment cites (comments name bullets, they don't repeat them).
const CANONICAL_BULLETS = [
  { label: "Explicit, never silent.", short: "Explicit, never silent" },
  { label: "Closed means closed.", short: "Closed means closed" },
  { label: "Record the gate, not just the outcome.", short: "Record the gate" },
  { label: "Gate mechanics:", short: "Gate mechanics" },
];

// Vocabulary for a hosted runtime this plugin does not have.
const ABSENT_MACHINERY = [
  "Sprint Ledger",
  "the harness fills",
  "the app derives",
  "app-generated",
  "Connect card",
  "update_story_status",
  "Managed Agent",
  "Outcome grader",
  "always-ask permission policy",
];

// ───────────────────────────────────────────────────────────────── snapshot
function loadRepo() {
  const files = {};
  const add = (p) => (files[rel(p)] = readFileSync(p, "utf8"));
  for (const f of readdirSync(join(ROOT, "plugin", "commands")))
    if (f.endsWith(".md")) add(join(ROOT, "plugin", "commands", f));
  add(join(ROOT, "README.md"));
  add(join(ROOT, "CONTRIBUTING.md"));
  for (const d of readdirSync(join(ROOT, "plugin", "skills"), { withFileTypes: true }))
    if (d.isDirectory()) add(join(ROOT, "plugin", "skills", d.name, "SKILL.md"));
  for (const f of readdirSync(join(ROOT, "personas")))
    if (f.endsWith(".md")) add(join(ROOT, "personas", f));
  for (const m of [
    join(ROOT, "plugin", ".claude-plugin", "plugin.json"),
    join(ROOT, ".claude-plugin", "marketplace.json"),
  ])
    add(m);
  return files;
}

const skillKey = (p) => `plugin/skills/${p}/SKILL.md`;
const skillNames = (repo) =>
  Object.keys(repo)
    .map((k) => k.match(/^plugin\/skills\/([^/]+)\/SKILL\.md$/)?.[1])
    .filter(Boolean)
    .sort();

// ────────────────────────────────────────────────────────── markdown helpers
/** Body of the section introduced by `heading`, ending at the next same-or-higher heading. */
function section(text, heading) {
  const lines = text.split("\n");
  const level = (l) => l.match(/^(#{1,6})\s/)?.[1].length ?? 0;
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start === -1) return null;
  const depth = level(lines[start]);
  for (let i = start + 1; i < lines.length; i++) {
    const d = level(lines[i]);
    if (d > 0 && d <= depth) return lines.slice(start + 1, i).join("\n");
  }
  return lines.slice(start + 1).join("\n");
}

/** Top-level `- **Label…` bullets of a section → {bullets: Map(label→body), duplicates: []}. */
function siblingBullets(sectionText) {
  const out = new Map();
  const duplicates = [];
  if (sectionText == null) return { bullets: out, duplicates };
  const lines = sectionText.split("\n");
  let label = null;
  let buf = [];
  const flush = () => {
    if (label === null) return;
    // A duplicate label would overwrite the first, hiding drift behind a clean copy.
    // Normalized, so "Closed means closed." and "Closed means closed:" collide.
    const key = norm(label);
    if ([...out.keys()].some((k) => norm(k) === key)) duplicates.push(label);
    else out.set(label, buf.join("\n"));
  };
  for (const line of lines) {
    const m = line.match(/^- \*\*(.+?)\*\*/);
    if (m) {
      flush();
      label = m[1];
      buf = [line];
    } else if (label !== null) {
      buf.push(line);
    }
  }
  flush();
  return { bullets: out, duplicates };
}

const norm = (label) => label.replace(/[.:]\s*$/, "").trim();

/** Every scrumbs header template in a file, flow and multiline, as raw bodies. */
function scrumbsHeaders(text) {
  const out = [];
  for (const m of text.matchAll(/scrumbs:\s*\{([^}]*)\}/g)) out.push(m[1]);
  for (const m of text.matchAll(/^(\s*)scrumbs:\s*$\n((?:\1\s+\S.*\n?)+)/gm)) out.push(m[2]);
  return out;
}

/** Markdown emphasis stripped, so `Sprint **Ledger**` reads as `Sprint Ledger`. */
const plain = (line) => line.replace(/[*_`]/g, "");

/**
 * Damerau-Levenshtein distance, capped — used to spot a mistyped persona name.
 * Transposition counts as ONE edit, not two: "vikotr" for "viktor" is the single
 * most common way a name gets typed wrong, and plain Levenshtein scores it 2.
 */
function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

/**
 * Markdown table parsing, strict enough to be trusted.
 * Handles optional outer pipes and escaped \| ; locates columns by header name
 * rather than by index, so inserting a Notes column doesn't break the checks.
 */
function splitRow(line) {
  const body = line.trim().replace(/^\|/, "").replace(/\|\s*$/, "");
  const cells = [];
  let cur = "";
  for (let i = 0; i < body.length; i++) {
    if (body[i] === "\\" && body[i + 1] === "|") { cur += "|"; i++; continue; }
    if (body[i] === "|") { cells.push(cur); cur = ""; continue; }
    cur += body[i];
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

const normHeader = (h) => h.replace(/[`*_]/g, "").trim().toLowerCase();

/**
 * Which lines are live Markdown — outside HTML comments and fenced code. A table
 * that has been commented out or kept as a fenced example is not the normative
 * one, and must not satisfy a check about the normative one.
 */
function liveLines(lines) {
  const live = new Array(lines.length).fill(true);
  let inComment = false;
  let fence = null;
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!inComment && fence === null) {
      const f = trimmed.match(/^(```+|~~~+)/);
      if (f) { fence = f[1][0].repeat(f[1].length); live[i] = false; return; }
    } else if (fence !== null) {
      live[i] = false;
      if (new RegExp(`^${fence[0]}{${fence.length},}\\s*$`).test(trimmed)) fence = null;
      return;
    }
    if (inComment) {
      live[i] = false;
      if (line.includes("-->")) inComment = false;
      return;
    }
    if (line.includes("<!--") && !line.includes("-->")) { live[i] = false; inComment = true; return; }
    if (/<!--.*-->/.test(line) && trimmed.startsWith("<!--")) live[i] = false;
  });
  return live;
}

/** Blank out non-live lines, preserving line count so offsets stay meaningful. */
const liveOnly = (text) => {
  const lines = text.split("\n");
  const live = liveLines(lines);
  return lines.map((l, i) => (live[i] ? l : "")).join("\n");
};

/**
 * Find a table by the columns it declares, not by prose. Looking for a phrase
 * anywhere in the file matches a sentence that merely mentions it — a real false
 * rejection, since the sentence then gets parsed as a header with no delimiter.
 * Returns the header line index, or -1 / -2 for none / ambiguous.
 */
function findTable(lines, ...requiredCols) {
  const live = liveLines(lines);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    if (!live[i] || !live[i + 1]) continue;
    if (!lines[i].includes("|")) continue;
    const header = splitRow(lines[i]).map(normHeader);
    if (!requiredCols.every((c) => header.includes(c))) continue;
    const sep = lines[i + 1] === undefined ? [] : splitRow(lines[i + 1]);
    if (sep.length !== header.length || !sep.every((c) => /^:?-{3,}:?$/.test(c.trim()))) continue;
    hits.push(i);
  }
  return hits.length === 1 ? hits[0] : hits.length === 0 ? -1 : -2;
}

function parseTable(lines, headerIdx) {
  const header = splitRow(lines[headerIdx]);
  const errors = [];
  // Markdown requires a delimiter row, one cell per column, three hyphens up.
  const sep = lines[headerIdx + 1] === undefined ? [] : splitRow(lines[headerIdx + 1]);
  const validSep =
    sep.length === header.length && sep.every((c) => /^:?-{3,}:?$/.test(c.trim()));
  if (!validSep) errors.push("table has no valid delimiter row beneath its header");

  const rows = [];
  for (let i = headerIdx + (validSep ? 2 : 1); i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "" || !line.includes("|")) break;
    const cells = splitRow(line);
    if (cells.every((c) => c === "" || /^:?-+:?$/.test(c))) continue;
    rows.push(cells);
  }
  // Exact normalized header names — "Decision notes" must not be mistaken for
  // "required last decision type", and an ambiguous duplicate is an error, not
  // a coin toss.
  const col = (name) => {
    const hits = header.map((h, i) => [normHeader(h), i]).filter(([h]) => h === name);
    if (hits.length > 1) {
      errors.push(`table has ${hits.length} columns named "${name}"`);
      return -1;
    }
    return hits.length ? hits[0][1] : -1;
  };
  return { header, rows, col, errors };
}

/**
 * A canonical status cell is EXACTLY one or more backticked tokens, optionally
 * separated by "·". Anything annotated (`escalated` *(TBD)*) is malformed, not a
 * status to be harvested out of the noise.
 */
function statusCell(cell) {
  if (!/^`[a-z-]+`(\s*·\s*`[a-z-]+`)*$/.test(cell.trim())) return null;
  return [...cell.matchAll(/`([a-z-]+)`/g)].map((m) => m[1]);
}

const RITUALS = "## Team rituals (all personas)";

// ─────────────────────────────────────────────────────────────────── checks
// Each returns an array of failure strings.
const CHECKS = {
  "shared-bullets"(repo) {
    const f = [];
    const perSkill = new Map();
    for (const p of skillNames(repo)) {
      const sec = section(repo[skillKey(p)], RITUALS);
      if (sec === null) {
        f.push(`${p}: no "${RITUALS}" section`);
        continue;
      }
      const { bullets, duplicates } = siblingBullets(sec);
      for (const d of duplicates)
        f.push(`${p}: duplicate ritual bullet "${d}" — a second copy hides drift in the first`);
      perSkill.set(p, bullets);
    }
    for (const { label } of CANONICAL_BULLETS) {
      const key = norm(label);
      const variants = new Map();
      for (const [p, bullets] of perSkill) {
        const match = [...bullets.entries()].find(([l]) => norm(l) === key);
        if (!match) {
          f.push(`${p}: missing shared bullet "${label}"`);
          continue;
        }
        if (!variants.has(match[1])) variants.set(match[1], []);
        variants.get(match[1]).push(p);
      }
      if (variants.size > 1)
        f.push(
          `"${label}" has ${variants.size} variants: ` +
            [...variants.values()].map((g) => `[${g.join(" ")}]`).join(" vs "),
        );
    }
    return f;
  },

  // An undeclared fifth shared bullet is drift too: it looks canonical, nothing
  // says it is, and the next edit desyncs it silently.
  "shared-bullets-declared"(repo) {
    const names = skillNames(repo);
    if (names.length < 2) return [];
    const perSkill = names.map((p) => siblingBullets(section(repo[skillKey(p)], RITUALS)).bullets);
    const declared = new Set(CANONICAL_BULLETS.map((b) => norm(b.label)));
    const f = [];
    for (const [label, body] of perSkill[0]) {
      const identicalEverywhere = perSkill.every((m) => m.get(label) === body);
      const isDeclared = declared.has(norm(label));
      if (identicalEverywhere && !isDeclared)
        f.push(
          `"${label}" is byte-identical in all ${names.length} skills but not in ` +
            `CANONICAL_BULLETS — declare it (and name it in the maintainer comment) ` +
            `or make it persona-scoped`,
        );
    }
    return f;
  },

  "maintainer-comment"(repo) {
    const f = [];
    for (const p of skillNames(repo)) {
      const m = repo[skillKey(p)].match(/<!-- Maintainers:([\s\S]*?)-->/);
      if (!m) {
        f.push(`${p}: no maintainer comment`);
        continue;
      }
      const cited = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
      const expected = CANONICAL_BULLETS.map((b) => b.short);
      const missing = expected.filter((e) => !cited.includes(e));
      const extra = cited.filter((c) => !expected.includes(c));
      if (missing.length) f.push(`${p}: comment omits ${missing.map((x) => `"${x}"`).join(", ")}`);
      if (extra.length) f.push(`${p}: comment cites unknown ${extra.map((x) => `"${x}"`).join(", ")}`);
    }
    return f;
  },

  "status-vocabulary"(repo) {
    const heading = "### The status vocabulary (canonical — skills use these exact words)";
    // Live document only: a section commented out or fenced as an example is not
    // the canonical one, and section() alone would happily slice it out of a
    // comment because the opener sits above the heading it looks for.
    const sec = section(liveOnly(repo["plugin/commands/next.md"]), heading);
    if (sec === null) return [`next.md: no "${heading}" section — status table moved or renamed`];
    const secLines = sec.split("\n");
    const hi = findTable(secLines, "status");
    if (hi === -1) return ["next.md: status vocabulary table not found"];
    if (hi === -2) return ["next.md: more than one candidate status vocabulary table"];
    const { rows, col, errors } = parseTable(secLines, hi);
    if (errors.length) return errors.map((e) => `next.md: status vocabulary ${e}`);
    const sc = col("status");
    if (sc === -1) return ["next.md: status vocabulary table has no `status` column"];
    // Derived purely from the live table — never pre-seeded. Seeding "draft"
    // would mean deleting its row goes unnoticed while every skill still writes
    // it. (The mapping check separately exempts `draft` from needing a decision
    // type; that is a different question from whether it is declared at all.)
    const known = new Set();
    const bad = [];
    for (const r of rows) {
      const cell = (r[sc] ?? "").trim();
      if (/^`status`$/i.test(cell)) continue; // header repeated
      const parsed = statusCell(cell);
      if (parsed === null) bad.push(cell);
      else for (const s of parsed) known.add(s);
    }
    // An annotated status cell is malformed, not something to harvest a name out
    // of: the mapping check reads the same cells, and a row it can't parse is a
    // status that silently never gets mapped.
    if (bad.length)
      return bad.map(
        (c) =>
          `next.md: status vocabulary row "${c}" is not a plain status cell — ` +
          `put annotations in another column`,
      );
    if (known.size < 5) return [`next.md: parsed only ${known.size} statuses — table shape changed`];
    const f = [];
    for (const p of skillNames(repo)) {
      const text = repo[skillKey(p)];
      const seen = new Set();
      // Standalone `status: x`, plus status inside every header form. Case is
      // significant: the front door matches the canonical lowercase words.
      // Capture the WHOLE scalar, quoted or bare, so `approved_pending` cannot be
      // read as `approved`. Quotes are ordinary YAML and must not slip past either.
      const STATUS = /\bstatus:\s*(?:"([^"\n]*)"|'([^'\n]*)'|([^,}\n|`]*))/g;
      const grab = (src) => {
        for (const m of src.matchAll(STATUS)) {
          let value = m[1] ?? m[2] ?? m[3] ?? "";
          // A bare scalar may carry a trailing YAML comment; a quoted one may not.
          if (m[3] !== undefined) value = value.replace(/\s+#.*$/, "");
          value = value.trim();
          if (value && !/^<.*>$/.test(value)) seen.add(value);
        }
      };
      for (const m of text.matchAll(/`status:[^`]*`/g)) grab(m[0].replace(/`/g, ""));
      for (const h of scrumbsHeaders(text)) grab(h);
      // Unbackticked instructions too — dropping the code span is ordinary
      // editing. A short stoplist keeps ordinary sentences out: "the artifact's
      // status: it depends on the verdict" is prose, not an instruction.
      const NOT_A_STATUS = new Set([
        "it", "its", "the", "a", "an", "this", "that", "they", "we", "you",
        "what", "which", "whether", "when", "how", "and", "or", "but", "not",
        "one", "each", "every", "any", "some", "no", "yes", "there", "here",
      ]);
      for (const m of text.matchAll(/\bstatus:\s*([a-z][a-z-]*)(?=[\s.,;)`"']|$)/gm))
        if (!NOT_A_STATUS.has(m[1])) seen.add(m[1]);
      for (const s of seen)
        if (!known.has(s))
          f.push(
            `${p}: writes status "${s}", which next.md cannot route` +
              (known.has(s.toLowerCase()) ? " (casing must match exactly)" : ""),
          );
    }
    return f;
  },

  // Every status must ALSO have a row in the status→required-decision mapping,
  // or be explicitly exempt. A status the vocabulary defines but the mapping
  // omits produces artifacts the validator rejects — which is exactly how the
  // shape-change path shipped an artifact its own validator refused.
  "status-decision-mapping"(repo) {
    const next = liveOnly(repo["plugin/commands/next.md"]);
    const vocab = section(
      next,
      "### The status vocabulary (canonical — skills use these exact words)",
    );
    if (vocab === null) return ["next.md: status vocabulary section not found"];
    const vLines = vocab.split("\n");
    const vhi = findTable(vLines, "status");
    if (vhi === -1) return ["next.md: status vocabulary table not found"];
    if (vhi === -2) return ["next.md: more than one candidate status vocabulary table"];
    const v = parseTable(vLines, vhi);
    if (v.errors.length) return v.errors.map((e) => `next.md: status vocabulary ${e}`);
    const vsc = v.col("status");
    if (vsc === -1) return ["next.md: status vocabulary table has no `status` column"];
    const statuses = new Set();
    for (const r of v.rows) {
      const cell = (r[vsc] ?? "").trim();
      if (/^`status`$/i.test(cell)) continue;
      for (const s of statusCell(cell) ?? []) statuses.add(s);
    }
    if (statuses.size < 5) return ["next.md: parsed too few statuses — vocabulary shape changed"];

    const lines = next.split("\n");
    const head = findTable(lines, "status", "required last decision type");
    if (head === -1) return ["next.md: status→decision mapping table not found"];
    if (head === -2) return ["next.md: more than one candidate status→decision mapping table"];
    const m = parseTable(lines, head);
    if (m.errors.length) return m.errors.map((e) => `next.md: status→decision mapping ${e}`);
    const msc = m.col("status");
    const mdc = m.col("required last decision type");
    if (msc === -1) return ["next.md: mapping table has no `status` column"];
    if (mdc === -1)
      return ['next.md: mapping table has no "required last decision `type`" column'];

    const f = [];
    const covered = new Set(["draft"]); // never a chosen outcome
    const assignedBy = new Map(); // status -> the row that mapped it
    for (const r of m.rows) {
      const left = statusCell(r[msc] ?? "");
      if (left === null) {
        if ((r[msc] ?? "").trim())
          f.push(`next.md: mapping row "${r[msc]}" is not a plain status cell`);
        continue;
      }
      const right = (r[mdc] ?? "").trim();
      // Exactly an exemption marker, or a backticked decision type drawn from the
      // status vocabulary (optionally with a parenthetical note). Anything else —
      // a placeholder, prose, a negated "not exempt" — maps nothing.
      // A narrow, exact exemption syntax. "(exemption TBD)", "(exempted pending
      // review)" and "(exempt — not exempt pending approval)" are placeholders,
      // and a placeholder must not exempt anything.
      const exempt = /^\*\(exempt(?: — see below)?\)\*$/.test(right);
      const typed = right.match(/^`([a-z-]+)`(\s*\(.*\))?$/);
      const known = typed !== null && statuses.has(typed[1]);
      if (!exempt && !known) {
        f.push(
          `next.md: mapping row for ${left.map((s) => `"${s}"`).join(", ")} has no valid ` +
            `required decision type (found ${right ? `"${right}"` : "an empty cell"}) — ` +
            `an artifact with that status has nothing to validate against`,
        );
        continue;
      }
      for (const s of left) {
        // Bidirectional, like skill↔spec pairing: a mapping row for a status the
        // vocabulary no longer declares is stale documentation, and keeps
        // validation instructions alive for something no longer permitted.
        if (!statuses.has(s))
          f.push(
            `next.md: mapping row maps "${s}", which the status vocabulary does not ` +
              `declare — retire it from both, or re-declare it`,
          );
        if (assignedBy.has(s))
          f.push(
            `next.md: status "${s}" is mapped by two rows ("${assignedBy.get(s)}" and ` +
              `"${right}") — the validator would have contradictory instructions`,
          );
        assignedBy.set(s, right);
        covered.add(s);
      }
    }
    for (const s of statuses)
      if (!covered.has(s))
        f.push(
          `next.md: status "${s}" has no row in the status→decision mapping — ` +
            `an artifact written with it is malformed by its own validator`,
        );
    return f;
  },

  // Every command a user is told to type must exist. This has now been wrong
  // twice — once on the README's front page, once in the marketplace listing —
  // and in both cases it was the FIRST thing a new user would try.
  "documented-commands"(repo) {
    const f = [];
    const pluginName = (() => {
      try {
        return JSON.parse(repo["plugin/.claude-plugin/plugin.json"]).name;
      } catch {
        return null;
      }
    })();
    if (!pluginName) return ["plugin.json: unreadable, cannot verify documented commands"];

    // Plugin commands and skills are both invoked as /plugin:name.
    const available = new Set([
      ...Object.keys(repo)
        .map((k) => k.match(/^plugin\/commands\/(.+)\.md$/)?.[1])
        .filter(Boolean),
      ...skillNames(repo),
    ]);

    for (const [path, text] of Object.entries(repo)) {
      if (!/\.(md|json)$/.test(path)) continue;
      const lines = text.split("\n");
      const inFence = new Array(lines.length).fill(false);
      let fence = null;
      lines.forEach((line, i) => {
        const m = line.trim().match(/^(```+|~~~+)/);
        if (fence === null && m) { fence = m[1]; inFence[i] = true; return; }
        if (fence !== null) {
          inFence[i] = true;
          if (line.trim().startsWith(fence[0].repeat(fence.length))) fence = null;
        }
      });

      lines.forEach((line, i) => {
        // Capture the WHOLE token, including characters that aren't valid in a
        // command name, so `/scrumbs:next_extra` fails rather than matching the
        // valid `next` and stopping. Trailing sentence punctuation is stripped —
        // "run /scrumbs:next." is fine, "/scrumbs:next.foo" is not. A `<name>`
        // metavariable never matches, so generic notation in docs is safe.
        for (const m of line.matchAll(new RegExp(`/${pluginName}:([A-Za-z0-9_.-]+)`, "g"))) {
          const token = m[1].replace(/[.,;:!?)]+$/, "");
          if (token && !available.has(token))
            f.push(`${path}:${i + 1}: documents /${pluginName}:${token}, which doesn't exist`);
        }

        // A bare /plugin with no :name isn't a real command — plugin commands are
        // always namespaced. Flag it where a user would read it as an
        // instruction: inside a code block, or anywhere in the JSON manifests.
        // Inline prose may legitimately mention it (e.g. explaining how to make
        // a personal shortcut of your own).
        const bare = new RegExp(`/${pluginName}(?![:\\w-])`);
        if (bare.test(line) && (inFence[i] || path.endsWith(".json")))
          f.push(
            `${path}:${i + 1}: tells the user to run /${pluginName}, but plugin ` +
              `commands are always namespaced — use /${pluginName}:next`,
          );
      });
    }
    return f;
  },

  // Every `invoke …` must resolve to a real persona. Anything this cannot parse
  // is itself a failure — an unreadable handoff is exactly where a typo hides.
  // Handoffs have one written form: invoke `persona`. That is the grammar, and
  // it is what makes this checkable at all.
  //
  //   invoke `dex`                       a handoff — must resolve
  //   invoke `next` / `deploybot`        a handoff to nobody — fails
  //   invoke Vicktor / **Vicktor agent** looks like a handoff, wrong form — fails
  //   never invoke the deployment tool   lowercase prose about a tool — ignored
  //
  // Emphasised or Capitalised targets fail rather than being ignored, because
  // that is exactly how a misspelled persona would be written by hand.
  handoffs(repo) {
    const names = skillNames(repo);
    const f = [];
    const clean = (s) =>
      s
        .replace(/[`*_]/g, "")
        .replace(/\b(the|skill|agent|persona)\b/gi, "")
        .replace(/[,.;:)"'\u2014]/g, "")
        .trim();
    for (const p of names) {
      // Frontmatter says "Invoke ONLY when…" in every skill; that is not a handoff.
      const body = repo[skillKey(p)].replace(/^---\n[\s\S]*?\n---\n/, "");
      // The keyword is case-insensitive (a sentence may start with "Invoke");
      // the TARGET's casing is what carries meaning, so it stays case-sensitive.
      const RE = /\b[Ii]nvoke\b\s+(?:[Tt]he\s+)?(`[^`]+`|\*\*[^*]+\*\*|[A-Z][A-Za-z-]*|[a-z][a-z-]*)/g;
      for (const m of body.matchAll(RE)) {
        const raw = m[1];
        const emphasised = /^[`*]/.test(raw);
        const capitalised = /^[A-Z]/.test(raw);
        const target = clean(raw).toLowerCase();
        if (names.includes(target)) continue;

        if (emphasised) {
          // A code span or bold run after "invoke" is always meant as a target.
          // Multi-word ones are prose only when they clearly describe a rule.
          if (/\s/.test(target) && !/vicktor|agent|bot|persona/i.test(raw) &&
              /named|column|row|listed|option|selected|chose/i.test(raw))
            continue;
          f.push(`${p}: "invoke ${raw}" — "${target}" is not a persona`);
        } else if (capitalised) {
          f.push(
            `${p}: "invoke ${raw}" — write handoffs as \`invoke \`persona\`\`` +
              (target ? ` ("${target}" is not a persona)` : ""),
          );
        } else {
          // Bare lowercase words are ordinary prose ("never invoke the deployment
          // tool", "invoke nobody") — except one that is a near-miss for a real
          // persona, which is what a hand-typed mistake actually looks like.
          const near = names.find((n) => editDistance(target, n) === 1);
          if (near)
            f.push(
              `${p}: "invoke ${raw}" — did you mean \`${near}\`? ` +
                `(and write handoffs as \`invoke \`${near}\`\`)`,
            );
        }
      }
    }
    return f;
  },

  "header-schema"(repo) {
    const f = [];
    let anyFound = 0;
    for (const p of skillNames(repo)) {
      const text = repo[skillKey(p)];
      const headers = scrumbsHeaders(text);
      anyFound += headers.length;
      for (const body of headers) {
        // Extract actual KEYS. Searching for the word "schema" would be satisfied
        // by a comment ("# TODO: add schema") or a value ("note: schema"), which
        // is a mention, not a key.
        const keys = new Set();
        if (body.includes("\n")) {
          // Indentation matters: a `schema` nested under another key is not the
          // top-level `scrumbs.schema` the front door requires.
          let topIndent = null;
          for (const line of body.split("\n")) {
            const noComment = line.replace(/\s+#.*$/, "");
            if (!noComment.trim() || noComment.trimStart().startsWith("#")) continue;
            const k = noComment.match(/^(\s*)([A-Za-z_][\w-]*)\s*:/);
            if (!k) continue;
            const indent = k[1].length;
            if (topIndent === null) topIndent = indent;
            if (indent === topIndent) keys.add(k[2]);
          }
        } else {
          for (const part of body.split(",")) {
            const bare = part.trim();
            if (!bare) continue;
            // Either `key: value` or a bare key in a key-list template.
            const k = bare.match(/^([A-Za-z_][\w-]*)\s*(:|$)/);
            if (k) keys.add(k[1]);
          }
        }
        if (!keys.has("schema"))
          f.push(`${p}: header template has no schema KEY — ${body.trim().slice(0, 60)}`);
      }
    }
    if (anyFound === 0) f.push("no scrumbs headers found at all — did the format change?");
    return f;
  },

  // Hosted vocabulary is allowed only inside a blockquote explicitly marked with
  // the sentinel below on the line before it. Prose cannot spoof a marker, and
  // every occurrence is judged on its own line — one quoted mention must never
  // shelter a live requirement further down the file.
  "absent-machinery"(repo) {
    const MARKER = "<!-- hosted-port-note -->";
    const f = [];
    for (const [path, text] of Object.entries(repo)) {
      if (!path.endsWith(".md")) continue;
      const lines = text.split("\n");
      const quarantined = new Array(lines.length).fill(false);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() !== MARKER) continue;
        quarantined[i] = true; // the marker sits in the quote's own paragraph
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === "") j++;
        while (j < lines.length && lines[j].trimStart().startsWith(">")) quarantined[j++] = true;
      }
      // Search whole paragraphs, not physical lines: reflowing prose must not be
      // able to hide a phrase by wrapping between its words.
      let i = 0;
      while (i < lines.length) {
        if (lines[i].trim() === "") { i++; continue; }
        const start = i;
        while (i < lines.length && lines[i].trim() !== "") i++;
        const block = lines.slice(start, i);
        if (block.every((_, k) => quarantined[start + k])) continue;
        const haystack = plain(block.join(" ")).replace(/\s+/g, " ").toLowerCase();
        for (const phrase of ABSENT_MACHINERY)
          if (haystack.includes(phrase.toLowerCase()))
            f.push(
              `${path}:${start + 1}: "${phrase}" outside a hosted-port note ` +
                `(mark the blockquote with ${MARKER} if it genuinely is one)`,
            );
      }
    }
    return f;
  },

  packaging(repo) {
    const f = [];
    const skills = skillNames(repo);
    const specs = Object.keys(repo)
      .map((k) => k.match(/^personas\/([a-z]+)\.md$/)?.[1])
      .filter((n) => n && n !== "README");
    for (const p of REQUIRED_PERSONAS) {
      if (!skills.includes(p)) f.push(`required persona "${p}" has no skill`);
      if (!specs.includes(p)) f.push(`required persona "${p}" has no spec`);
    }
    for (const p of skills)
      if (!specs.includes(p)) f.push(`skill "${p}" has no spec in personas/`);
    for (const p of specs)
      if (!skills.includes(p)) f.push(`spec "${p}" has no skill in plugin/skills/`);
    for (const p of skills) {
      const fm = repo[skillKey(p)].match(/^---\n([\s\S]*?)\n---/);
      if (!fm) f.push(`${p}: no YAML frontmatter`);
      else if (!new RegExp(`^name:\\s*${p}\\s*$`, "m").test(fm[1]))
        f.push(`${p}: frontmatter name disagrees with its directory`);
    }
    for (const m of ["plugin/.claude-plugin/plugin.json", ".claude-plugin/marketplace.json"]) {
      try {
        JSON.parse(repo[m]);
      } catch (e) {
        f.push(`${m}: invalid JSON — ${e.message}`);
      }
    }
    return f;
  },
};

// ───────────────────────────────────────────────────────────────── self-test
// Each mutation must turn its category red. Anything that stays green here is a
// check that cannot fail, which is worse than no check because it reassures.
const MUTATIONS = [
  {
    name: "a shared bullet drifts in one skill",
    category: "shared-bullets",
    apply: (r) => (r[skillKey("iris")] = r[skillKey("iris")].replace(
      "- **Closed means closed.** Before inferring any stage",
      "- **Closed means closed.** Before inferring ANY stage",
    )),
  },
  {
    name: "a fifth bullet becomes shared without being declared",
    category: "shared-bullets-declared",
    apply: (r) => {
      for (const p of REQUIRED_PERSONAS)
        r[skillKey(p)] = r[skillKey(p)].replace(
          "- **Explicit, never silent.**",
          "- **Undeclared ritual.** Identical everywhere on purpose.\n- **Explicit, never silent.**",
        );
    },
  },
  {
    name: "the maintainer comment stops naming a shared bullet",
    category: "maintainer-comment",
    apply: (r) => (r[skillKey("rex")] = r[skillKey("rex")].replace('"Record the gate"', '"Recording gates"')),
  },
  {
    name: "a skill invents a status",
    category: "status-vocabulary",
    apply: (r) => (r[skillKey("rex")] = r[skillKey("rex")].replace("`status: draft`", "`status: rubber-stamped`")),
  },
  {
    name: "the status table is renamed away",
    category: "status-vocabulary",
    apply: (r) => (r["plugin/commands/next.md"] = r["plugin/commands/next.md"].replace(
      "### The status vocabulary (canonical — skills use these exact words)",
      "### Statuses",
    )),
  },
  {
    name: "a handoff names a persona that doesn't exist",
    category: "handoffs",
    apply: (r) => (r[skillKey("quinn")] = r[skillKey("quinn")].replace("invoke `dex`", "invoke `deploybot`")),
  },
  {
    name: "a handoff is misspelled without backticks",
    category: "handoffs",
    apply: (r) => (r[skillKey("quinn")] = r[skillKey("quinn")].replace("invoke `dex`", "invoke Vicktor")),
  },
  {
    name: "a header template loses its schema key",
    category: "header-schema",
    apply: (r) => (r[skillKey("pablo")] = r[skillKey("pablo")].replace(
      "scrumbs: {schema, stage, status, sprint}",
      "scrumbs: {stage, status, sprint}",
    )),
  },
  {
    name: "a header template uses a lookalike key",
    category: "header-schema",
    apply: (r) => (r[skillKey("pablo")] = r[skillKey("pablo")].replace(
      "scrumbs: {schema, stage, status, sprint}",
      "scrumbs: {schemaVersion, stage, status, sprint}",
    )),
  },
  {
    name: "absent machinery returns in prose",
    category: "absent-machinery",
    apply: (r) => (r["personas/stella.md"] = r["personas/stella.md"].replace(
      "- **Retro receives:**",
      "- **Retro receives:** the Sprint Ledger, and",
    )),
  },
  {
    name: "absent machinery returns in a non-hosted blockquote",
    category: "absent-machinery",
    apply: (r) => (r["personas/stella.md"] += "\n> Stella must read the Sprint Ledger before the retro.\n"),
  },
  {
    name: "a persona's skill is deleted",
    category: "packaging",
    apply: (r) => delete r[skillKey("pablo")],
  },
  {
    name: "a spec loses its skill",
    category: "packaging",
    apply: (r) => delete r["personas/dex.md"],
  },
  {
    name: "frontmatter disagrees with its directory",
    category: "packaging",
    apply: (r) => (r[skillKey("stella")] = r[skillKey("stella")].replace("name: stella", "name: stela")),
  },
  // ── the six an adversarial pass proved were slipping through ──────────────
  {
    name: "a status is retired from the vocabulary but left in the mapping",
    category: "status-decision-mapping",
    apply: (r) => {
      r["plugin/commands/next.md"] = r["plugin/commands/next.md"].replace(
        /^\| `authorized` \|.*\n/m,
        "",
      );
      for (const p of REQUIRED_PERSONAS)
        r[skillKey(p)] = r[skillKey(p)].replace(/`status: authorized`/g, "`status: approved`");
    },
  },
  {
    name: "the canonical `draft` row is deleted from the vocabulary",
    category: "status-vocabulary",
    apply: (r) => (r["plugin/commands/next.md"] = r["plugin/commands/next.md"].replace(
      /^\| `draft` \|.*\n/m,
      "",
    )),
  },
  {
    name: "the whole status vocabulary section is commented out",
    category: "status-vocabulary",
    apply: (r) => {
      const h = "### The status vocabulary (canonical — skills use these exact words)";
      const lines = r["plugin/commands/next.md"].split("\n");
      const i = lines.findIndex((l) => l.trim() === h);
      let end = i + 1;
      while (end < lines.length && !/^#{1,3}\s/.test(lines[end])) end++;
      lines.splice(end, 0, "-->");
      lines.splice(i, 0, "<!--");
      r["plugin/commands/next.md"] = lines.join("\n");
    },
  },
  {
    name: "the whole status vocabulary section is fenced as an example",
    category: "status-vocabulary",
    apply: (r) => {
      const h = "### The status vocabulary (canonical — skills use these exact words)";
      const lines = r["plugin/commands/next.md"].split("\n");
      const i = lines.findIndex((l) => l.trim() === h);
      let end = i + 1;
      while (end < lines.length && !/^#{1,3}\s/.test(lines[end])) end++;
      lines.splice(end, 0, "```");
      lines.splice(i, 0, "```markdown");
      r["plugin/commands/next.md"] = lines.join("\n");
    },
  },
  {
    name: "the only mapping table is commented out",
    category: "status-decision-mapping",
    apply: (r) => {
      const lines = r["plugin/commands/next.md"].split("\n");
      const h = lines.findIndex((l) => l.includes("required last decision"));
      let end = h + 1;
      while (end < lines.length && lines[end].trimStart().startsWith("|")) end++;
      lines.splice(end, 0, "-->");
      lines.splice(h, 0, "<!--");
      r["plugin/commands/next.md"] = lines.join("\n");
    },
  },
  {
    name: "the only mapping table is inside a fenced example",
    category: "status-decision-mapping",
    apply: (r) => {
      const lines = r["plugin/commands/next.md"].split("\n");
      const h = lines.findIndex((l) => l.includes("required last decision"));
      let end = h + 1;
      while (end < lines.length && lines[end].trimStart().startsWith("|")) end++;
      lines.splice(end, 0, "```");
      lines.splice(h, 0, "```markdown");
      r["plugin/commands/next.md"] = lines.join("\n");
    },
  },
  {
    name: "the README tells you to run a bare /scrumbs",
    category: "documented-commands",
    apply: (r) => (r["README.md"] = r["README.md"].replace("/scrumbs:next\n```", "/scrumbs\n```")),
  },
  {
    name: "the marketplace listing advertises a bare /scrumbs",
    category: "documented-commands",
    apply: (r) => (r[".claude-plugin/marketplace.json"] = r[".claude-plugin/marketplace.json"].replace(
      "/scrumbs:next", "/scrumbs")),
  },
  {
    name: "a documented command has a numeric suffix",
    category: "documented-commands",
    apply: (r) => (r["README.md"] = r["README.md"].replace("/scrumbs:next", "/scrumbs:next2")),
  },
  {
    name: "a documented command has an underscore suffix",
    category: "documented-commands",
    apply: (r) => (r["README.md"] = r["README.md"].replace("/scrumbs:next", "/scrumbs:next_extra")),
  },
  {
    name: "a documented command has a dotted suffix",
    category: "documented-commands",
    apply: (r) => (r["README.md"] = r["README.md"].replace("/scrumbs:next", "/scrumbs:next.foo")),
  },
  {
    name: "a documented command is miscapitalised",
    category: "documented-commands",
    apply: (r) => (r["README.md"] = r["README.md"].replace("/scrumbs:next", "/scrumbs:Next")),
  },
  {
    name: "the README documents a command that doesn't exist",
    category: "documented-commands",
    apply: (r) => (r["README.md"] = r["README.md"].replace("/scrumbs:next", "/scrumbs:start")),
  },
  {
    name: "an exemption marker is a placeholder",
    category: "status-decision-mapping",
    apply: (r) => (r["plugin/commands/next.md"] = r["plugin/commands/next.md"].replace(
      "   | `abandoned` | `abandoned` |", "   | `abandoned` | *(exemption TBD)* |")),
  },
  {
    name: "an exemption marker is negated inline",
    category: "status-decision-mapping",
    apply: (r) => (r["plugin/commands/next.md"] = r["plugin/commands/next.md"].replace(
      "   | `abandoned` | `abandoned` |",
      "   | `abandoned` | *(exempt — not exempt pending approval)* |")),
  },
  {
    name: "two rows map the same status to different types",
    category: "status-decision-mapping",
    apply: (r) => (r["plugin/commands/next.md"] = r["plugin/commands/next.md"].replace(
      "   | `abandoned` | `abandoned` |",
      "   | `abandoned` | `abandoned` |\n   | `abandoned` | `approved` |")),
  },
  {
    name: "the mapping table loses its delimiter row",
    category: "status-decision-mapping",
    apply: (r) => (r["plugin/commands/next.md"] = r["plugin/commands/next.md"].replace(
      "   | `status` | required last decision `type` |\n   |---|---|",
      "   | `status` | required last decision `type` |")),
  },
  {
    name: "a nested schema key stands in for the top-level one",
    category: "header-schema",
    apply: (r) => (r[skillKey("pablo")] = r[skillKey("pablo")].replace(
      "`scrumbs: {schema, stage, status, sprint}`",
      "a header of the form:\n\nscrumbs:\n  metadata:\n    schema: 2\n  stage: prd\n  status: draft\n")),
  },
  {
    name: "a mapping right cell is a backticked placeholder",
    category: "status-decision-mapping",
    apply: (r) => (r["plugin/commands/next.md"] = r["plugin/commands/next.md"].replace(
      "   | `abandoned` | `abandoned` |",
      "   | `abandoned` | `tbd` |",
    )),
  },
  {
    name: "a mapping right cell negates the exemption",
    category: "status-decision-mapping",
    apply: (r) => (r["plugin/commands/next.md"] = r["plugin/commands/next.md"].replace(
      "   | `abandoned` | `abandoned` |",
      "   | `abandoned` | not exempt; TBD |",
    )),
  },
  {
    name: "a mapping right cell is prose mentioning a type",
    category: "status-decision-mapping",
    apply: (r) => (r["plugin/commands/next.md"] = r["plugin/commands/next.md"].replace(
      "   | `abandoned` | `abandoned` |",
      "   | `abandoned` | status `approved` is pending |",
    )),
  },
  {
    name: "an annotated status cell in the vocabulary table",
    category: "status-vocabulary",
    apply: (r) => (r["plugin/commands/next.md"] = r["plugin/commands/next.md"].replace(
      "| `held` | Dex verified a build",
      "| `escalated` *(TBD)* | pushed to a human | no | owner |\n| `held` | Dex verified a build",
    )),
  },
  {
    name: "a header comment merely mentions schema",
    category: "header-schema",
    apply: (r) => (r[skillKey("pablo")] = r[skillKey("pablo")].replace(
      "`scrumbs: {schema, stage, status, sprint}`",
      "a header of the form:\n\nscrumbs:\n  # TODO: add schema\n  stage: prd\n  status: draft\n",
    )),
  },
  {
    name: "a header VALUE merely mentions schema",
    category: "header-schema",
    apply: (r) => (r[skillKey("pablo")] = r[skillKey("pablo")].replace(
      "`scrumbs: {schema, stage, status, sprint}`",
      "a header of the form:\n\nscrumbs:\n  note: schema\n  stage: prd\n  status: draft\n",
    )),
  },
  {
    name: "a mapping row names a status but no decision type",
    category: "status-decision-mapping",
    apply: (r) => (r["plugin/commands/next.md"] = r["plugin/commands/next.md"].replace(
      "   | `abandoned` | `abandoned` |",
      "   | `abandoned` |  |",
    )),
  },
  {
    name: "a mapping row says TBD instead of a decision type",
    category: "status-decision-mapping",
    apply: (r) => (r["plugin/commands/next.md"] = r["plugin/commands/next.md"].replace(
      "   | `abandoned` | `abandoned` |",
      "   | `abandoned` | TBD |",
    )),
  },
  {
    name: "a status is mentioned only in a mapping row's right column",
    category: "status-decision-mapping",
    apply: (r) => (r["plugin/commands/next.md"] = r["plugin/commands/next.md"]
      .replace("| `held` | Dex verified a build", "| `escalated` | pushed to a human owner | no | that owner |\n| `held` | Dex verified a build")
      .replace("   | `abandoned` | `abandoned` |", "   | `abandoned` | `abandoned` or `escalated` |")),
  },
  {
    name: "a status is defined but missing from the decision mapping",
    category: "status-decision-mapping",
    apply: (r) => (r["plugin/commands/next.md"] = r["plugin/commands/next.md"].replace(
      "   | `superseded` | *(exempt — see below)* |\n",
      "",
    )),
  },
  {
    name: "a bad status hides inside a full header template",
    category: "status-vocabulary",
    apply: (r) => (r[skillKey("pablo")] = r[skillKey("pablo")].replace(
      "status: draft, sprint: N",
      "status: rubber-stamped, sprint: N",
    )),
  },
  {
    name: "a code-formatted handoff names a non-persona",
    category: "handoffs",
    apply: (r) => (r[skillKey("quinn")] = r[skillKey("quinn")].replace("invoke `dex`", "invoke `next`")),
  },
  {
    name: "a bold-formatted handoff is misspelled",
    category: "handoffs",
    apply: (r) => (r[skillKey("quinn")] = r[skillKey("quinn")].replace("invoke `dex`", "invoke **the Vicktor skill**")),
  },
  {
    name: "a multiline header omits schema",
    category: "header-schema",
    apply: (r) => (r[skillKey("pablo")] = r[skillKey("pablo")].replace(
      "`scrumbs: {schema, stage, status, sprint}`",
      "a header of the form:\n\nscrumbs:\n  stage: prd\n  status: draft\n",
    )),
  },
  {
    name: "absent machinery hides behind a blockquote that denies being one",
    category: "absent-machinery",
    apply: (r) => (r["personas/stella.md"] +=
      "\n> This is not a hosted-port note.\n> Stella must read the Sprint Ledger before starting.\n"),
  },
  {
    name: "absent machinery returns in a different case",
    category: "absent-machinery",
    apply: (r) => (r["personas/stella.md"] = r["personas/stella.md"].replace(
      "- **Retro receives:**",
      "- **Retro receives:** the sprint ledger, and",
    )),
  },
  {
    name: "an undeclared shared bullet borrows a declared label's prefix",
    category: "shared-bullets-declared",
    apply: (r) => {
      for (const p of REQUIRED_PERSONAS)
        r[skillKey(p)] = r[skillKey(p)].replace(
          "- **Explicit, never silent.**",
          "- **Gate mechanics follow-up.** Identical everywhere, undeclared.\n- **Explicit, never silent.**",
        );
    },
  },
  {
    name: "a duplicate ritual label conceals drift in the first copy",
    category: "shared-bullets",
    apply: (r) => {
      const original = r[skillKey("iris")];
      const start = original.indexOf("- **Closed means closed.**");
      const end = original.indexOf("\n- **", start + 5);
      const bullet = original.slice(start, end);
      r[skillKey("iris")] =
        original.slice(0, start) +
        bullet.replace("Before inferring any stage", "Before inferring NO stage") +
        "\n" + bullet +
        original.slice(end);
    },
  },
  {
    name: "a bad status hides in a multiline header",
    category: "status-vocabulary",
    apply: (r) => (r[skillKey("pablo")] +=
      "\n\nscrumbs:\n  schema: 2\n  stage: prd\n  status: rubber-stamped\n"),
  },
  {
    name: "a status drifts only in casing",
    category: "status-vocabulary",
    apply: (r) => (r[skillKey("rex")] = r[skillKey("rex")].replace("`status: draft`", "`status: Draft`")),
  },
  {
    name: "a duplicate ritual label differs only in punctuation",
    category: "shared-bullets",
    apply: (r) => {
      const o = r[skillKey("iris")];
      const s = o.indexOf("- **Closed means closed.**");
      const e = o.indexOf("\n- **", s + 5);
      const bullet = o.slice(s, e);
      r[skillKey("iris")] =
        o.slice(0, s) + bullet + "\n" +
        bullet.replace("- **Closed means closed.**", "- **Closed means closed:**")
              .replace("Before inferring any stage", "Before inferring NO stage") +
        o.slice(e);
    },
  },
  {
    name: "a bare lowercase handoff is a typo for a persona",
    category: "handoffs",
    apply: (r) => (r[skillKey("quinn")] = r[skillKey("quinn")].replace("invoke `dex`", "invoke vicktor")),
  },
  {
    name: "a transposed persona name in a handoff",
    category: "handoffs",
    apply: (r) => (r[skillKey("quinn")] = r[skillKey("quinn")].replace("invoke `dex`", "invoke vikotr")),
  },
  {
    name: "a transposed name after a sentence-initial Invoke",
    category: "handoffs",
    apply: (r) => (r[skillKey("quinn")] = r[skillKey("quinn")].replace("invoke `dex`", "Invoke vikotr")),
  },
  {
    name: "a sentence-initial Invoke hides a typo",
    category: "handoffs",
    apply: (r) => (r[skillKey("quinn")] = r[skillKey("quinn")].replace("invoke `dex`", "Invoke vicktor")),
  },
  {
    name: "a bold multiword handoff names no persona",
    category: "handoffs",
    apply: (r) => (r[skillKey("quinn")] = r[skillKey("quinn")].replace("invoke `dex`", "invoke **Vicktor agent**")),
  },
  {
    name: "an invalid status with the backticks removed",
    category: "status-vocabulary",
    apply: (r) => (r[skillKey("rex")] = r[skillKey("rex")].replace("`status: draft`", "status: rubber-stamped")),
  },
  {
    name: "a quoted status bypasses casing validation",
    category: "status-vocabulary",
    apply: (r) => (r[skillKey("pablo")] = r[skillKey("pablo")].replace(
      "status: draft, sprint: N",
      'status: "Draft", sprint: N',
    )),
  },
  {
    name: "an invalid status starts with a canonical one",
    category: "status-vocabulary",
    apply: (r) => (r[skillKey("pablo")] = r[skillKey("pablo")].replace(
      "status: draft, sprint: N",
      "status: draft_pending, sprint: N",
    )),
  },
  {
    name: "an invalid quoted status is multi-word",
    category: "status-vocabulary",
    apply: (r) => (r[skillKey("pablo")] = r[skillKey("pablo")].replace(
      "status: draft, sprint: N",
      'status: "approved pending", sprint: N',
    )),
  },
  {
    name: "a banned phrase is split across a line wrap",
    category: "absent-machinery",
    apply: (r) => (r["personas/stella.md"] +=
      "\nStella reads the Sprint\nLedger before writing the retro.\n"),
  },
  {
    name: "absent machinery hides behind bold formatting",
    category: "absent-machinery",
    apply: (r) => (r["personas/stella.md"] +=
      "\nStella must consult the Sprint **Ledger** before the retro.\n"),
  },
];

// Content a maintainer may legitimately write. Each must leave its category
// GREEN — a checker that rejects ordinary prose gets disabled, not obeyed.
const MUST_STAY_GREEN = [
  {
    name: "ordinary prose about invoking a tool",
    category: "handoffs",
    apply: (r) => (r[skillKey("dex")] += "\nNever invoke the deployment tool before approval.\n"),
  },
  {
    name: "a rule describing which skill to invoke",
    category: "handoffs",
    apply: (r) => (r[skillKey("stella")] += "\nThen invoke **the skill named in the option the lead selected**.\n"),
  },
  {
    name: "prose that mentions status followed by ordinary words",
    category: "status-vocabulary",
    apply: (r) => (r[skillKey("dex")] +=
      "\nThe artifact's status: it depends on whether the preview verified.\n"),
  },
  {
    name: "a mapping table written without outer pipes",
    category: "status-decision-mapping",
    apply: (r) => (r["plugin/commands/next.md"] = r["plugin/commands/next.md"].replace(
      "   | `abandoned` | `abandoned` |",
      "   `abandoned` | `abandoned`",
    )),
  },
  {
    name: "generic <name> notation in the docs",
    category: "documented-commands",
    apply: (r) => (r["CONTRIBUTING.md"] += "\nPlugin commands are always `/scrumbs:<name>`.\n"),
  },
  {
    name: "a command reference ending a sentence",
    category: "documented-commands",
    apply: (r) => (r["README.md"] += "\nStart the whole thing with /scrumbs:next.\n"),
  },
  {
    name: "prose explaining how to make your own /scrumbs shortcut",
    category: "documented-commands",
    apply: (r) => (r["README.md"] +=
      "\nSave a file at `~/.claude/commands/scrumbs.md` and you can just type `/scrumbs`.\n"),
  },
  {
    name: "prose that mentions the mapping table's header phrase",
    category: "status-decision-mapping",
    apply: (r) => (r["plugin/commands/next.md"] = r["plugin/commands/next.md"].replace(
      "   | `status` | required last decision `type` |",
      "   The required last decision type is documented below.\n\n   | `status` | required last decision `type` |",
    )),
  },
  {
    name: "a Decision notes column inserted before the decision column",
    category: "status-decision-mapping",
    apply: (r) => {
      const lines = r["plugin/commands/next.md"].split("\n");
      const h = lines.findIndex((l) => l.includes("required last decision"));
      lines[h] = "   | `status` | Decision notes | required last decision `type` |";
      lines[h + 1] = "   |---|---|---|";
      for (let i = h + 2; i < lines.length && lines[i].trimStart().startsWith("|"); i++) {
        const c = lines[i].trim().replace(/^\||\|$/g, "").split("|");
        lines[i] = `   | ${c[0].trim()} | — | ${c[1].trim()} |`;
      }
      r["plugin/commands/next.md"] = lines.join("\n");
    },
  },
  {
    name: "a header with an inline YAML comment",
    category: "status-vocabulary",
    apply: (r) => (r[skillKey("pablo")] +=
      "\n\nscrumbs:\n  schema: 2\n  stage: prd\n  status: draft # initial state\n"),
  },
  {
    name: "a hosted-port note that is properly marked",
    category: "absent-machinery",
    apply: (r) => (r["personas/stella.md"] +=
      "\n<!-- hosted-port-note -->\n> A hosted port could compile a Sprint Ledger here.\n"),
  },
];

function runChecks(repo) {
  const results = {};
  for (const [name, fn] of Object.entries(CHECKS)) results[name] = fn(repo);
  return results;
}

function selfTest(base) {
  console.log("\nSelf-test — every check must be able to fail\n");
  let bad = 0;
  for (const { name, category, apply } of MUTATIONS) {
    const repo = { ...base };
    apply(repo);
    const failures = runChecks(repo)[category] ?? [];
    const caught = failures.length > 0;
    if (!caught) bad++;
    console.log(`  ${caught ? "✓ caught " : "✗ MISSED "} ${category.padEnd(24)} ${name}`);
  }
  for (const { name, category, apply } of MUST_STAY_GREEN) {
    const repo = { ...base };
    apply(repo);
    const failures = runChecks(repo)[category] ?? [];
    const green = failures.length === 0;
    if (!green) bad++;
    console.log(
      `  ${green ? "✓ allows " : "✗ REJECTS"} ${category.padEnd(24)} ${name}` +
        (green ? "" : `\n      ${failures[0]}`),
    );
  }

  const clean = Object.values(runChecks(base)).flat();
  if (clean.length) {
    console.error(`\n  ✗ the unmutated repo does not pass — ${clean.length} failure(s)`);
    bad++;
  } else {
    console.log(`\n  ✓ the unmutated repo passes cleanly`);
  }
  if (bad) {
    console.error(`\n${bad} self-test failure(s): a check that cannot fail is not a check.\n`);
    process.exit(1);
  }
  console.log(
    `\n${MUTATIONS.length} mutations all caught; ${MUST_STAY_GREEN.length} legitimate edits all allowed.\n`,
  );
}

// ─────────────────────────────────────────────────────────────────── main
const repo = loadRepo();
if (process.argv.includes("--self-test")) {
  selfTest(repo);
  process.exit(0);
}

const results = runChecks(repo);
const all = Object.entries(results);
for (const [name, failures] of all)
  console.log(`  ${failures.length ? "✗" : "✓"} ${name}${failures.length ? ` — ${failures.length}` : ""}`);

const total = all.flatMap(([, f]) => f);
if (total.length === 0) {
  console.log(`\n${all.length} checks passed.\n`);
  process.exit(0);
}
console.error(`\n${total.length} failure(s):\n`);
for (const [name, failures] of all)
  for (const d of failures) console.error(`  [${name}] ${d}`);
console.error("");
process.exit(1);
