# Contributing

Scrumbs is prompts and Markdown — if you can edit a text file you can change how
the team behaves. There's no build step and no dependencies, but there **is** a
conformance check, and it runs on every PR:

```sh
node scripts/check.mjs
```

Run it before you push. It takes about a second and needs nothing installed.

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
| **Shared bullets byte-identical** | a rule fixed in one skill and left wrong in the other six — the drift that let the retro hand off to the wrong persona for as long as it did |
| **Maintainer comment names them** | a fifth bullet becoming shared without the comment saying so, so the next person syncs four of five |
| **Status vocabulary** | a skill writing a status the front door can't route |
| **Handoffs name real personas** | `invoke \`x\`` where `x` isn't a skill, including near-misses like the front-door command |
| **Header templates carry `schema`** | artifacts that read as legacy the moment they're written |
| **Absent machinery** | re-introducing a harness, a ledger, a vault, a grader — anything the plugin can't actually provide |
| **Packaging** | a skill without a spec, frontmatter that disagrees with its directory, invalid manifest JSON |

Adding a check is welcome. Adding one that can't fail isn't: break the invariant
locally first and confirm the checker actually goes red, or you've written a
test that only ever agrees with you.

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
