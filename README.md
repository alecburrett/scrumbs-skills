# Scrumbs

### Seven teammates who won't let you skip the boring parts.

Ask an AI to build your thing and it will build *something*. It will also quietly
drop the requirement you'd have argued about, skip the test that was awkward to
write, and hand you a review it did on its own work in the same breath.

Scrumbs is seven personas with narrow remits and hard handoffs. One works at a
time. Each stops and asks you before anything moves. The awkward parts stop being
skippable, because a different teammate owns each one and none of them will do
another's job.

```
/scrumbs
```

That's the whole interface. It tells you where you are, and who's up next.

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

## What actually happens

You tell Pablo your idea. He asks one question at a time, pushes back on scope,
and writes down what you agreed — including what you're *not* building. You
approve. Iris gives it a face. Stella cuts it into a sprint. Rex designs the
approach, Viktor builds it test-first, Rex reviews it, Quinn tries to break it,
Dex ships it. Stella runs the retro, and the next sprint starts from what you
actually learned.

Every stage leaves a real file in your repo:

```
docs/BRIEF.md          what we're building, and what we're not
docs/PRD.md            the spec, with numbered acceptance criteria
docs/DESIGN.md         the visual identity
docs/BACKLOG.md        everything we parked, with provenance
sprints/sprint-1.md    the plan · design · build · review · QA · retro
CHANGELOG.md           what shipped
```

Your repo is the source of truth. Delete the plugin tomorrow and every artifact
still reads perfectly on its own.

---

## The one rule

**Every stage ends at a gate, and the gate is yours.**

Nobody hands off to anybody until you approve. No persona starts itself. Ask the
team to "just do the whole thing" and they'll politely decline — that's the
point.

Each gate is a question with your options, and the answer goes into the artifact
next to the work:

```yaml
decisions:
  - type: approved
    at: 2026-08-07T14:22:31Z
    by: Alec Burrett
    question: "Approve — ready for QA?"
    answer: "Confirm — hand to Quinn"
```

The next persona reads that record before it starts. If it's missing, or points
at a build that has since changed, it **stops** instead of quietly building on
it. That's what makes a run resumable weeks later, and a retro citable rather
than remembered.

---

## Independent review, when it counts

Review and QA exist to catch what the previous stage missed — which is hard when
the reviewer still has the reasoning that produced the code sitting in context.

So both offer a handoff into a **fresh session**. Your repo is the state, so a
new session picks up exactly where the last one stopped: the branch, the design,
the acceptance criteria — and none of the argument that got you there. Take it
and Rex reads your code cold. The artifact records which you chose, so a review
that wasn't independent doesn't get to look like one.

---

## It fits the work

A CLI doesn't need a visual identity, and a one-line bug fix doesn't need a PRD.

- **No screen?** Iris's stages don't exist for that project — not a token version
  of them.
- **Existing codebase?** Pablo documents what's there instead of interviewing you
  about a product you already shipped.
- **Just a defect, or a hotfix?** The plan and the technical approach shrink to a
  few lines each.

What never shrinks: **review, QA and deploy.** A hotfix still gets a written,
approved plan before the code changes and every check after it. A rushed change
going straight to production is exactly when you want them.

---

## Why personas, and not one big prompt

Because a product owner who is also the developer will always cut the awkward
requirement. Narrow remits make that cut visible:

- Pablo is **pre-technical on purpose** — no stack, no UI, no solutions.
- Rex **designs and judges but never implements**. Viktor implements.
- Quinn judges **behaviour**, not code — Rex already did the code.
- Nobody re-opens someone else's decision. They bounce it back to its owner.

The result is that a different set of questions gets asked at each stage, in a
fixed order, with a written record and a gate you control. Scope that would have
been silently dropped has to be dropped *out loud*, by name, in a file.

---

## What this is, and what it isn't

Most tools in this space tell you the first half. Here's both.

**It is** a discipline made legible. Seven remits, a fixed order, a gate you
answer, and a paper trail in your own repo that outlives the plugin.

**It isn't** enforcement, and it doesn't pretend to be:

- **The personas share one conversation.** They're Markdown skills, not seven
  isolated agents. Rex reviewing code designed earlier in the same session is a
  second *reading*, not a second *opinion* — which is exactly why the
  fresh-session handoff above exists, and why the artifact records whether you
  took it.
- **The paper trail is evidence, not a lock.** These are files on your branch;
  anyone who can commit can write a convincing record for a gate that never
  happened. What it reliably catches is the ordinary stuff — a stale approval, a
  stage built on a document that changed underneath it, a record nobody filled
  in. Not a determined forger.
- **Enforcement lives where enforcement works**: branch protection, required
  reviewers, CI. Scrumbs sits happily behind them and never claims to replace
  them.

If that reads as underselling, good. A process tool that overstates its
guarantees is worse than none, because you stop checking.

---

## Read the prompts

Each persona is a plain Markdown skill. Read one, disagree with it, change it —
it's a prompt, not a black box: [`plugin/skills/`](./plugin/skills/). The longer
specs they're compiled from live in [`personas/`](./personas/).

## Requirements

[Claude Code](https://code.claude.com), and a git repo to work in.

## Contributing

Yes please — it's Markdown, so the barrier is low. Start with
[CONTRIBUTING.md](./CONTRIBUTING.md): the spec/skill split, the four rules that
are the product rather than implementation details, and `scripts/check.mjs`,
which fails the build when the seven skills drift out of sync.

## Licence

MIT — see [LICENSE](./LICENSE).
