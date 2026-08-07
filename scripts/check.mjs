#!/usr/bin/env node
// Scrumbs conformance checks. No dependencies, no config, no network.
//   node scripts/check.mjs
// Exits non-zero on the first category with failures. See CONTRIBUTING.md.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = join(ROOT, "plugin", "skills");
const NEXT_MD = join(ROOT, "plugin", "commands", "next.md");

const read = (p) => readFileSync(p, "utf8");
const failures = [];
const fail = (check, detail) => failures.push({ check, detail });
let checksRun = 0;
const ok = (label) => {
  checksRun++;
  process.stdout.write(`  ✓ ${label}\n`);
};

const personas = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
const skillPath = (p) => join(SKILLS_DIR, p, "SKILL.md");
const skills = Object.fromEntries(personas.map((p) => [p, read(skillPath(p))]));

// ---------------------------------------------------------------- shared text
// The bullets that must be byte-identical in every skill. A partial edit here is
// the drift that produced the retro-routing bug: a rule fixed in one skill and
// left wrong in six. See CONTRIBUTING.md, "The shared bullets".
// `label` starts the bullet exactly; `short` is what the maintainer comment must
// name (comments cite the bullet, they don't repeat the whole sentence).
const CANONICAL_BULLETS = [
  { label: "Explicit, never silent.", short: "Explicit, never silent" },
  { label: "Closed means closed.", short: "Closed means closed" },
  { label: "Record the gate, not just the outcome.", short: "Record the gate" },
  { label: "Gate mechanics:", short: "Gate mechanics" },
];

// A bullet runs from its own "- **Label" to the next top-level "- **".
function extractBullet(text, label) {
  const start = text.indexOf(`- **${label}`);
  if (start === -1) return null;
  const rest = text.slice(start + 3);
  const next = rest.search(/\n- \*\*/);
  return next === -1 ? rest : rest.slice(0, next);
}

console.log("\nCANONICAL-SHARED bullets are byte-identical across all skills");
for (const { label } of CANONICAL_BULLETS) {
  const seen = new Map();
  for (const p of personas) {
    const body = extractBullet(skills[p], label);
    if (body === null) {
      fail("shared-bullets", `${p}: missing bullet "${label}"`);
      continue;
    }
    const key = body;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push(p);
  }
  if (seen.size > 1) {
    const groups = [...seen.values()].map((g) => g.join(", "));
    fail(
      "shared-bullets",
      `"${label}" differs across skills — ${seen.size} variants:\n      ${groups.join("\n      ")}`,
    );
  } else if (seen.size === 1) {
    ok(`${label} — identical in ${personas.length} skills`);
  }
}

// The maintainer comment must name exactly the bullets that are actually shared,
// or the next maintainer edits four bullets and syncs three.
console.log("\nMaintainer comment lists exactly the shared bullets");
for (const p of personas) {
  const m = skills[p].match(/<!-- Maintainers:([\s\S]*?)-->/);
  if (!m) {
    fail("maintainer-comment", `${p}: no maintainer comment above Team rituals`);
    continue;
  }
  const missing = CANONICAL_BULLETS.filter((b) => !m[1].includes(b.short)).map(
    (b) => b.short,
  );
  if (missing.length) {
    fail("maintainer-comment", `${p}: comment doesn't name ${missing.join(", ")}`);
  }
}
if (!failures.some((f) => f.check === "maintainer-comment"))
  ok(`all ${personas.length} comments name all ${CANONICAL_BULLETS.length} bullets`);

// ------------------------------------------------------------------ lifecycle
// Every status a skill writes must exist in the front door's canonical table,
// or the front door will not know how to route it.
console.log("\nStatus vocabulary matches the front door");
const nextMd = read(NEXT_MD);
const CANONICAL_STATUSES = [
  ...nextMd.matchAll(/^\| `([a-z-]+)`(?: · `([a-z-]+)`)? \|/gm),
]
  .flatMap((m) => [m[1], m[2]])
  .filter(Boolean);
const KNOWN = new Set([...CANONICAL_STATUSES, "draft"]);
if (KNOWN.size < 5) {
  fail("status-vocabulary", "could not parse the status table out of next.md");
} else {
  for (const p of personas) {
    for (const m of skills[p].matchAll(/`status:\s*([a-z-]+)`/g)) {
      if (!KNOWN.has(m[1]))
        fail("status-vocabulary", `${p}: writes unknown status "${m[1]}"`);
    }
  }
  if (!failures.some((f) => f.check === "status-vocabulary"))
    ok(`${KNOWN.size} statuses, no skill invents one`);
}

// A skill may only hand off to a persona that exists.
console.log("\nHandoffs name real personas");
for (const p of personas) {
  for (const m of skills[p].matchAll(/invoke (?:the )?`([a-z]+)`(?: skill)?/g)) {
    if (!personas.includes(m[1]))
      fail("handoffs", `${p}: invokes "${m[1]}", which is not a persona`);
  }
}
if (!failures.some((f) => f.check === "handoffs")) ok("every invoked skill exists");

// Artifact headers must carry the schema version, or every artifact a persona
// writes reads as legacy and gets re-confirmed at each handoff.
console.log("\nArtifact header templates carry schema");
for (const p of personas) {
  for (const m of skills[p].matchAll(/scrumbs:\s*\{([^}]*)\}/g)) {
    if (!/schema/.test(m[1]))
      fail("header-schema", `${p}: header template without schema — {${m[1].trim()}}`);
  }
}
if (!failures.some((f) => f.check === "header-schema"))
  ok("no header template omits schema");

// ----------------------------------------------------------- absent machinery
// Vocabulary describing a hosted runtime this plugin does not have. Reintroducing
// any of it means a persona is promising something nothing can deliver.
console.log("\nNo dependencies on machinery the plugin lacks");
const BANNED = [
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
const proseFiles = [
  NEXT_MD,
  ...personas.map(skillPath),
  ...readdirSync(join(ROOT, "personas"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => join(ROOT, "personas", f)),
  join(ROOT, "README.md"),
  join(ROOT, "CONTRIBUTING.md"),
];
for (const file of proseFiles) {
  const text = read(file);
  for (const phrase of BANNED) {
    if (text.includes(phrase)) {
      // A quarantined "if you port this to a hosted app" note may name them.
      const line = text.split("\n").find((l) => l.includes(phrase)) ?? "";
      if (line.trimStart().startsWith(">")) continue;
      fail(
        "absent-machinery",
        `${file.replace(ROOT + "/", "")}: "${phrase}" outside a quarantined note`,
      );
    }
  }
}
if (!failures.some((f) => f.check === "absent-machinery"))
  ok(`${BANNED.length} phrases, none reintroduced`);

// ---------------------------------------------------------------- packaging
console.log("\nSkills, specs and manifests agree");
for (const p of personas) {
  const fm = skills[p].match(/^---\n([\s\S]*?)\n---/);
  if (!fm) fail("packaging", `${p}: no YAML frontmatter`);
  else if (!new RegExp(`^name:\\s*${p}\\s*$`, "m").test(fm[1]))
    fail("packaging", `${p}: frontmatter name doesn't match its directory`);
  if (!existsSync(join(ROOT, "personas", `${p}.md`)))
    fail("packaging", `${p}: skill has no matching spec in personas/`);
}
for (const manifest of [
  join(ROOT, "plugin", ".claude-plugin", "plugin.json"),
  join(ROOT, ".claude-plugin", "marketplace.json"),
]) {
  try {
    JSON.parse(read(manifest));
  } catch (e) {
    fail("packaging", `${manifest.replace(ROOT + "/", "")}: invalid JSON — ${e.message}`);
  }
}
if (!failures.some((f) => f.check === "packaging"))
  ok(`${personas.length} skills, ${personas.length} specs, 2 manifests`);

// -------------------------------------------------------------------- report
if (failures.length === 0) {
  console.log(`\n${checksRun} checks passed.\n`);
  process.exit(0);
}
console.error(`\n${failures.length} failure(s):\n`);
for (const { check, detail } of failures) console.error(`  [${check}] ${detail}`);
console.error("");
process.exit(1);
