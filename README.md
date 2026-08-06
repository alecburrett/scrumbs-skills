# Scrumbs

### Your AI scrum team. Minus the standups.

Seven teammates take your project from *"I've got an idea"* to shipped code.
One works at a time. Each one stops and asks you before anything moves.

```
/scrumbs
```

That's the whole interface. It tells you where you are and who's up next.

---

## Meet the team

| | Who | Role | They say |
|---|---|---|---|
| 📋 | **Pablo** | Product Owner | *"Let's get clear on what we're building."* |
| 🎨 | **Iris** | Product Designer | *"Let's give this thing a face."* |
| 🌀 | **Stella** | Scrum Master | *"Let's break this into a sprint."* |
| 🏗️ | **Rex** | Tech Lead | *"Let's shape how we build this."* |
| 🔴 | **Viktor** | Senior Developer | *"Red first, then green."* |
| 🔍 | **Quinn** | QA Engineer | *"Now… what if the user does this?"* |
| 🚀 | **Dex** | DevOps Engineer | *"We're green. Let's ship it."* |

---

## Install

```sh
claude plugin marketplace add alecburrett/scrumbs-skills
claude plugin install scrumbs
```

Then, inside the git repo you want built:

```
/scrumbs
```

<sub>Already in a Claude Code session? `/plugin marketplace add alecburrett/scrumbs-skills` works too.</sub>

---

## The one rule

**Every stage ends at a gate, and the gate is yours.**

Nobody hands off to anybody until you tap approve. No persona starts
itself. Nothing happens silently — you always know who is working, what
they produced, and what happens next.

Ask the team to "just do the whole thing" and they'll politely decline.
That's the point.

Every decision is recorded where it happened: the question you were asked, the
option you chose, when, and under whose git identity — committed alongside the
work. The next persona reads that record and stops if it's missing or broken,
instead of quietly building on it.

**It's a paper trail, not a lock.** These are Markdown files on your branch;
anyone who can commit can write a convincing record for a gate that never
happened. What the trail catches is the ordinary stuff — a stale approval, a
stage built on a document that changed underneath it, a record nobody filled in.
Not a determined forger. If you need enforcement, that's branch protection and
required reviewers, and Scrumbs sits happily behind them.

---

## It bends to what you're building

A CLI doesn't need a visual identity, and a one-line bug fix doesn't need a PRD.
Two facts shape the run: whether there's a **screen** (a headless project drops
Iris's stages entirely, rather than getting a token version of them) and whether
there's **already code** (brownfield means Pablo documents what exists instead
of interviewing you about it). Then each sprint declares its own kind — an
ordinary feature, a defect, or a hotfix where the plan and the technical
approach are a few lines each rather than a morning's work.

What never scales down: **every stage still runs**. A hotfix's plan might be one
story and its design three lines, but both are still written and still approved
*before* the code changes — so there's a record of what was authorised — and
review, QA and deploy are untouched. A rushed change going straight to
production is exactly when you want them.

## What actually happens

You talk to Pablo about your idea. He asks one question at a time, pushes
back on scope, and writes it down. You approve. Iris gives it a look. You
approve. Stella cuts it into a sprint. Rex designs it, Viktor builds it
test-first, Rex reviews his own design being met, Quinn tries to break it,
Dex ships it. Stella runs the retro and the next sprint starts.

Every stage leaves a real file in your repo:

```
docs/BRIEF.md          what we're building, and what we're not
docs/PRD.md            the spec, with numbered acceptance criteria
docs/DESIGN.md         the visual identity
docs/BACKLOG.md        everything we parked, with provenance
sprints/sprint-1.md    the plan · the design · the build · review · QA · retro
CHANGELOG.md           what shipped
```

Your repo is the source of truth. Delete the plugin tomorrow and every
artifact still reads perfectly on its own.

---

## Why personas, and not one big prompt

Because a product owner who is also the developer will always cut the
awkward requirement. Splitting the work across seven agents with narrow
remits and hard handoffs is what keeps each one honest:

- Pablo is **pre-technical on purpose** — no stack, no UI, no solutions.
- Rex **designs and judges but never implements**. Viktor implements.
- Quinn judges **behaviour**, not code — Rex already did the code.
- Nobody re-opens someone else's decision. They bounce it back to its owner.

Each persona is a plain Markdown skill. Read one, disagree with it, change
it — it's a prompt, not a black box: [`plugin/skills/`](./plugin/skills/).
The longer specs they're compiled from live in
[`personas/`](./personas/).

---

## Requirements

[Claude Code](https://code.claude.com), and a git repo to work in.

## Contributing

Yes please — it's Markdown, so the barrier is low. Start with
[CONTRIBUTING.md](./CONTRIBUTING.md); it explains the spec/skill split and the
four rules that are the product rather than implementation details.

This repo is the canonical home for both the skills and the specs.

## Licence

MIT — see [LICENSE](./LICENSE).
