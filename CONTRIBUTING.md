# Contributing

Scrumbs is prompts and Markdown — if you can edit a text file you can change how
the team behaves. There's no build step and no dependencies, but there **is** a
conformance check, and it runs on every PR:

```sh
node scripts/check.mjs              # the checks
node scripts/check.mjs --self-test  # prove every check can still fail
```

Run both before you push. They take about a second and need nothing installed.

## The two layers

```
personas/*.md          the spec    — why a persona behaves as it does
plugin/skills/*/SKILL.md   the skill   — what actually runs
```

The **spec** is the long-form reasoning: the persona's method, quality bars,
and the moves they're expected to make. The **skill** is the compiled, terse
version Claude Code loads. Specs are canonical for *intent*; skills are
canonical for *behaviour*.

**Change both, or say why you didn't.** A skill that gains a rule its spec
never mentions is how the two drift apart.

## Working on the skills

Try it before you propose it. Install from your own checkout:

```sh
claude plugin marketplace add ./scrumbs-skills
claude plugin install scrumbs
```

Then run a real stage on a real repo. A persona's prompt reads fine and
behaves badly more often than you'd think — the checker catches contradictions
between files, not a rule that is consistently wrong everywhere.

## What `scripts/check.mjs` enforces

Each of these exists because the invariant was already broken once, in a way
nobody noticed by reading:

| Check | Catches |
|---|---|
| **shared-bullets** | a canonical bullet edited in one skill and left alone in the other six — the drift that let the retro hand off to the wrong persona |
| **shared-bullets-declared** | a bullet that has *become* byte-identical everywhere without being declared canonical, so the next edit desyncs it silently |
| **maintainer-comment** | the comment naming a different set than `CANONICAL_BULLETS` — in either direction |
| **status-vocabulary** | a skill writing a status the front door can't route, *and* the status table being renamed or reformatted out from under the parser |
| **handoffs** | any `invoke …` that doesn't resolve to a real persona, backticked or not — a bare `invoke Vicktor` fails |
| **header-schema** | a header template without a `schema` key, including lookalikes like `schemaVersion` |
| **absent-machinery** | re-introducing a ledger, harness, vault, grader or custom tool the plugin can't provide, in any casing. Allowed only inside a blockquote preceded by the literal marker `<!-- hosted-port-note -->` — prose can't spoof a marker — and judged per line, so one quoted mention can't shelter a live requirement further down the file |
| **packaging** | a missing persona in either direction, frontmatter disagreeing with its directory, invalid manifest JSON |

### What it does not catch

Be clear-eyed about this, or the green tick starts doing work it hasn't earned:

- **A rule that is consistently wrong everywhere.** The checks compare files to
  each other. Seven skills agreeing on a bad rule is a pass.
- **Anything behavioural.** No stage is executed, no gate is answered, no
  artifact is written. Whether Pablo actually asks one question at a time is not
  something a text comparison can tell you — run a real stage on a real repo.
- **Merge blocking, unless you configure it.** CI runs both commands on every
  PR, but GitHub does not make a new job required automatically. Until someone
  adds `checks / conformance` to a branch ruleset, a red PR can still be merged.

### Adding a check

Add the mutation too. `--self-test` applies a deliberate break for every check
and asserts it goes red; a category with no mutation, or one that stays green,
fails the self-test. This is enforced rather than encouraged, because a check
that cannot fail is worse than no check — it reassures without verifying.

### The shared bullets

Every skill ends with a `## Team rituals (all personas)` section. Four of those
bullets — **"Explicit, never silent"**, **"Closed means closed"**,
**"Record the gate"** and **"Gate mechanics"** — are byte-identical across all
seven skills on purpose. Change them in every skill or in none; a partial edit
used to be a silent divergence nobody noticed for months, which is exactly why
`scripts/check.mjs` now fails on it. If you add a fifth shared bullet, add it to
`CANONICAL_BULLETS` in that script and to the maintainer comment in all seven
skills — the checker verifies both.

The two newer ones are shared for the same structural reason. "Closed means
closed": a terminal project has to be refused by *every* persona reachable
directly, not just the one that closed it. "Record the gate": an approval
written by one persona is *read* by another, so both halves of that contract —
writing the record, and refusing a bare `approved` without one — have to hold
everywhere or they hold nowhere. An invariant enforced only at the sender isn't
enforced.

Every other bullet in that section is deliberately tailored per persona.
Viktor's "shape before you write" is rewritten because his summary is
*observed* rather than authored; Iris's maps onto her Distill beat. Don't
flatten them back to a common wording.

## The rules that aren't up for negotiation

These are the product, not implementation details:

1. **Nothing happens silently.** A persona starts two ways only — the user's
   slash command, or a gate option the user just selected.
2. **Every stage ends at a gate, and the gate is the lead's.** No persona
   approves its own work or walks past a pending gate.
3. **No persona re-opens another's decision.** They bounce it back to its
   owner. Rex doesn't re-scope the PRD; Quinn doesn't re-review the code.
   Note what this rule is and isn't: it partitions *responsibility*, not
   context. The personas share one conversation, so a PR must not describe them
   as independent agents or claim role separation delivers auditor independence.
   Where independence is load-bearing — Review and QA — it comes from the
   fresh-session handoff, and the artifact records whether it was used.
4. **Artifacts are plain Markdown in the user's repo.** The repo is the
   state, which is what makes a run resumable and inspectable — and, being
   ordinary files on a writable branch, forgeable. Say so. Every lead-selected
   transition carries a `decision` record (question, answer, who, when) and is
   committed, which catches **malformed records, broken chains and staleness** —
   not a skipped gate, since a complete fabricated record passes every check.
   A PR must not describe it as more than that. Enforcement belongs to branch
   protection and required reviewers, which Scrumbs sits behind and must never
   claim to replace.

A PR that erodes one of these needs to argue for it in the description, not
slip it in.

## Adding a persona

Rare, and a real design change — Iris was the last one. Open an issue first.
A new persona needs a stage that genuinely has no owner, a spec, a skill, a
place in the handoff chain at both ends, and an entry in the front door's
stage table (`plugin/commands/next.md`).

## Pull requests

Say what behaviour changed and what you saw when you ran it. "Pablo stopped
asking three questions at once" beats a diff summary. Small and specific
lands quickly. `node scripts/check.mjs` must pass; CI runs it too.
