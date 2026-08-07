# Scrumbs

### Seven teammates who won't let you skip the boring parts.

Ask an AI to build your thing and it will build *something*. It'll also quietly
drop the requirement you'd have argued about, skip the test that was awkward to
write, and tell you it reviewed its own work.

Scrumbs gives you a team instead. Seven of them, each with one job. They work
one at a time, in order, and every one of them stops and asks you before
anything moves on.

```
/scrumbs:next
```

That's the whole thing. It tells you where you are, and who's up next.

---

## What you get out of it

- **You always know what's happening.** One teammate, one job, one question at a
  time. Never a wall of output you have to audit afterwards.
- **The awkward conversations actually happen.** Someone asks what you're *not*
  building. Someone pushes back on scope. Someone tries to break it before your
  users do.
- **Nothing moves without you.** Every step ends with a plain question and a
  couple of options. You pick. Ask them to "just do the whole thing" and they'll
  politely decline.
- **You can stop and come back.** Each step gets written to your repo when it's
  done, so you can walk away between steps and pick up next week — or in a fresh
  session — without re-explaining anything.
- **You end up with the paperwork you'd never have written.** A spec, a plan, a
  record of what was decided and why. Useful long after the code lands.

---

## Install

```sh
claude plugin marketplace add alecburrett/scrumbs-skills
claude plugin install scrumbs
```

Then, inside the git repo you want built:

```
/scrumbs:next
```

<sub>Already in a Claude Code session? `/plugin marketplace add alecburrett/scrumbs-skills` works too.</sub>

<sub>Typing that a lot? Make yourself a shorter one: save a file at
`~/.claude/commands/scrumbs.md` containing *"Do exactly what `/scrumbs:next`
does."* and you can just type `/scrumbs`.</sub>

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

## How it goes

You tell **Pablo** your idea. He asks one question at a time, pushes back when
the scope creeps, and writes down what you agreed — including what you're *not*
building. **Iris** gives it a look and a feel. **Stella** cuts it into a sprint
you can actually finish.

Then **Rex** works out how to build it, **Viktor** builds it test-first, Rex
comes back and reviews it, **Quinn** tries hard to break it, and **Dex** ships
it — showing you exactly what's about to go live, and how to undo it, before
anything reaches your users.

**Stella** runs the retro, and the next sprint starts from what you actually
learned rather than what you meant to do.

You say yes before each step begins. If you don't like something, you say so and
it goes back to whoever owns it.

---

## What you're left with

Real files, in your repo, in plain Markdown:

```
docs/BRIEF.md      what we're building, and what we're not
docs/PRD.md        the spec, with numbered things it has to do
docs/DESIGN.md     how it should look and feel        (if it has a screen)
docs/BACKLOG.md    everything we parked, and who asked for it

sprints/           a handful of files per sprint: the plan, the approach,
                   what got built, the review, the testing, what shipped,
                   and what we learned

CHANGELOG.md       what shipped, in a line each
```

Delete the plugin tomorrow and every one of these still makes sense on its own.
They're notes, not a database.

---

## Fresh eyes where it counts

Reviewing your own work is hard, and it's no easier for an AI that just spent an
hour writing the thing.

So before the review, and again before the testing, Scrumbs offers to carry on
in a **brand new session**. Everything it needs is already written down in your
repo, so the new session picks up the work — and none of the reasoning that
produced it. Rex reads your code cold, the way a colleague would on a Monday
morning.

It's your call each time, and whichever you choose gets written down.

---

## It fits what you're actually building

A command-line tool doesn't need a colour palette, and a one-line bug fix
doesn't need a morning of planning.

- **No screen?** Iris sits the project out entirely — no token design step.
- **Existing codebase?** Pablo reads what's there and focuses on the change
  you're making, instead of interviewing you about an app you shipped two years
  ago.
- **Just a bug, or something urgent?** The planning shrinks to a few lines.

Two things never shrink: **you still say what "done" means before anyone writes
code**, and **the review and the testing still happen**. Something rushed
straight to your users is exactly when you want a second look.

---

## Why a team, and not one big prompt

Because whoever writes the spec will always be tempted to quietly drop the
tricky bit while building it. Splitting the work up makes that hard to do
silently:

- Pablo talks about the problem, never the solution.
- Rex decides how it gets built; Viktor is the one who builds it.
- Quinn judges whether it *works*, not whether the code is tidy — Rex already
  did that.
- Nobody overrules anybody. They hand it back to whoever owns it.

The point isn't ceremony. It's that a different question gets asked at each
stage, and the answers get written down.

---

## Being straight with you

Scrumbs is a set of prompts and a paper trail, not a lock on the door. It'll
keep an honest team honest, catch the ordinary slips, and leave you a record you
can read months later. It can't stop someone determined to cut corners, and it
doesn't pretend to — if you need something properly enforced, that's what branch
protection and required reviewers are for. Scrumbs is happy to sit behind them.

We'd rather tell you that now than have you find out later.

---

## Read the prompts

Every teammate is a plain Markdown file. Read one, disagree with it, change it —
it's a prompt, not a black box: [`plugin/skills/`](./plugin/skills/). The longer
write-ups behind them live in [`personas/`](./personas/).

## Requirements

[Claude Code](https://code.claude.com), and a git repo to work in.

## Contributing

Yes please — it's all Markdown, so the barrier is low. Start with
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Licence

MIT — see [LICENSE](./LICENSE).
