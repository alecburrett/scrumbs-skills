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
  add(join(ROOT, "plugin", "commands", "next.md"));
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
    if (out.has(label)) duplicates.push(label);
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
    const sec = section(repo["plugin/commands/next.md"], heading);
    if (sec === null) return [`next.md: no "${heading}" section — status table moved or renamed`];
    const rows = [...sec.matchAll(/^\|\s*(.+?)\s*\|/gm)]
      .map((m) => m[1])
      .filter((c) => !/^-+$/.test(c) && c.toLowerCase() !== "`status`");
    const known = new Set(["draft"]);
    for (const cell of rows)
      for (const m of cell.matchAll(/`([a-z-]+)`/g)) known.add(m[1]);
    if (known.size < 5) return [`next.md: parsed only ${known.size} statuses — table shape changed`];
    const f = [];
    for (const p of skillNames(repo)) {
      const text = repo[skillKey(p)];
      const seen = new Set();
      // Standalone `status: x`, and status inside a full header template — the
      // backtick sits before `scrumbs` there, so a backtick-anchored regex misses it.
      for (const m of text.matchAll(/`status:\s*([a-z-]+)`/g)) seen.add(m[1]);
      for (const h of text.matchAll(/scrumbs:\s*\{([^}]*)\}/g))
        for (const m of h[1].matchAll(/\bstatus:\s*([a-z-]+)/g)) seen.add(m[1]);
      for (const s of seen)
        if (!known.has(s)) f.push(`${p}: writes status "${s}", which next.md cannot route`);
    }
    return f;
  },

  // Every `invoke …` must resolve to a real persona. Anything this cannot parse
  // is itself a failure — an unreadable handoff is exactly where a typo hides.
  handoffs(repo) {
    const names = skillNames(repo);
    // Prose that legitimately follows "invoke": rules about invocation, not a
    // target. A misspelled persona is in none of these, so it still fails.
    const PROSE = new Set([
      "only", "nobody", "no-one", "noone", "anyone", "nothing", "a", "an",
      "another", "any", "that", "this", "which", "next", "the", "their", "its",
      "whichever", "one", "them", "it", "you", "someone", "yourself",
    ]);
    const f = [];
    for (const p of names) {
      // Skip frontmatter: every description contains "Invoke ONLY when…".
      const body = repo[skillKey(p)].replace(/^---\n[\s\S]*?\n---\n/, "");
      // A code- or bold-formatted target is an explicit handoff and must resolve;
      // the prose stoplist applies only to bare words like "invoke another persona".
      const RE = /\binvoke\b\s+(?:the\s+)?(`[^`]+`|\*\*[^*]+\*\*|\S+)/gi;
      for (const m of body.matchAll(RE)) {
        const raw = m[1];
        const formatted = /^[`*]/.test(raw);
        const target = raw
          .replace(/[`*_]/g, "")
          .replace(/\bskill\b/gi, "")
          .replace(/^\s*the\s+/i, "")
          .replace(/[,.;:)"'\u2014]/g, "")
          .trim()
          .toLowerCase();
        if (!target) continue;
        if (names.includes(target)) continue;
        // "invoke **the skill named in that row's `next` column**" is a rule, not
        // a target: a persona name is one word. "invoke **the Vicktor skill**"
        // reduces to one word and must therefore resolve.
        if (/\s/.test(target)) continue;
        if (!formatted && PROSE.has(target)) continue;
        f.push(`${p}: "invoke ${raw}" — "${target}" is not a persona`);
      }
    }
    return f;
  },

  "header-schema"(repo) {
    const f = [];
    let anyFound = 0;
    for (const p of skillNames(repo)) {
      const text = repo[skillKey(p)];
      const headers = [];
      for (const m of text.matchAll(/scrumbs:\s*\{([^}]*)\}/g)) headers.push(m[1]);
      // Multiline YAML form: `scrumbs:` followed by indented keys.
      for (const m of text.matchAll(/^(\s*)scrumbs:\s*$\n((?:\1\s+\S.*\n?)+)/gm))
        headers.push(m[2]);
      anyFound += headers.length;
      for (const body of headers)
        if (!/(^|[\s,{])schema\s*(:|,|$)/m.test(body.trim()))
          f.push(`${p}: header template lacks a schema key — ${body.trim().slice(0, 60)}`);
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
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === "") j++;
        while (j < lines.length && lines[j].trimStart().startsWith(">")) quarantined[j++] = true;
      }
      lines.forEach((line, i) => {
        const haystack = line.toLowerCase();
        for (const phrase of ABSENT_MACHINERY)
          if (haystack.includes(phrase.toLowerCase()) && !quarantined[i])
            f.push(
              `${path}:${i + 1}: "${phrase}" outside a hosted-port note ` +
                `(mark the blockquote with ${MARKER} if it genuinely is one)`,
            );
      });
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
  console.log(`\n${MUTATIONS.length} mutations, all caught.\n`);
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
