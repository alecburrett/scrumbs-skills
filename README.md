# Scrumbs

## Turn your coding agent into a full delivery team

[![Star Scrumbs on GitHub](https://img.shields.io/github/stars/alecburrett/scrumbs-skills?style=for-the-badge&logo=github&label=Star%20Scrumbs)](https://github.com/alecburrett/scrumbs-skills/stargazers)
[![Follow Alec Burrett](https://img.shields.io/github/followers/alecburrett?style=for-the-badge&logo=github&label=Follow)](https://github.com/alecburrett)
[![MIT licence](https://img.shields.io/badge/licence-MIT-blue?style=for-the-badge)](./LICENSE)

Scrumbs gives Claude Code seven focused AI teammates who help turn an idea into
a clear, tested, reviewed and release-ready increment.

Instead of asking one agent to discover the requirements, design the solution,
write the code, review itself, test its own assumptions and ship—all in one
heroic leap—Scrumbs gives every part of delivery a clear owner. Each teammate
brings a different perspective, hands over real context and asks for your
approval before the project moves forward.

The result is a workflow that helps you build with more clarity, catch problems
earlier and keep momentum across long-running projects.

```text
/scrumbs:next
```

One command shows where the project is and recommends the single best next
step.

> If Scrumbs would add value to your projects, [give the repository a
> star](https://github.com/alecburrett/scrumbs-skills) and [follow Alec
> Burrett](https://github.com/alecburrett) for new skills, workflow improvements
> and releases.

---

## What Scrumbs adds to a project

### Sharper product decisions

Early product discovery turns an idea into explicit requirements, success
criteria and boundaries. The team knows what it is building, why it matters
and—just as importantly—what is out of scope.

### A practical route from idea to release

Every stage has an owner and a useful output. Product thinking becomes a sprint
plan, the plan becomes a technical design, the design becomes tested code, and
the code earns its way through review, QA and deployment.

### Better checks at the moments that matter

The teammate who builds the code is not the teammate who reviews it or tests
it. Scrumbs can offer a fresh Claude Code session for review and QA, giving the
work a valuable cold read before it reaches users.

### Human control without losing momentum

You remain the project lead. Each stage presents a clear decision, records the
answer and waits for you to choose what happens next. Scrumbs provides
structure and momentum without silently taking the project in a direction you
did not approve.

### Project memory that survives the chat

Requirements, decisions, plans, review findings and release notes are written
as ordinary Markdown in your repository. You can pause, switch sessions or
return weeks later without rebuilding the whole story from conversation
history.

### A workflow that improves every sprint

Deployment is not the end of the loop. Each retrospective captures what the
team learned, and that evidence helps prioritise the next sprint. Each cycle
can start smarter than the last.

---

## Meet your AI delivery team

| Teammate | Role | Value they bring |
|---|---|---|
| 📋 **Pablo** | Product Owner | Clarifies the problem, defines value and protects the scope |
| 🎨 **Iris** | Product Designer | Creates a coherent experience and keeps UI work aligned |
| 🌀 **Stella** | Scrum Master | Shapes achievable sprints and turns lessons into improvements |
| 🏗️ **Rex** | Tech Lead | Designs the technical approach and reviews the implementation |
| 🔴 **Viktor** | Senior Developer | Builds the increment test-first and records what changed |
| 🔍 **Quinn** | QA Engineer | Verifies acceptance criteria and hunts for real-world edge cases |
| 🚀 **Dex** | DevOps Engineer | Prepares a safe, visible and reversible path to production |

Together, they cover the delivery loop:

```text
Idea
  → Requirements → PRD → Design
  → Sprint Plan → Technical Design → Build
  → Review → QA → Deploy → Retrospective
                                  ↘ next sprint
```

No mystery hand-offs. No silent stage changes. You can see who owns the work,
what they produced and what decision is needed next.

---

## Quick start

Install Scrumbs from the Claude Code plugin marketplace:

```sh
claude plugin marketplace add alecburrett/scrumbs-skills
claude plugin install scrumbs
```

Open the Git repository you want to work on and run:

```text
/scrumbs:next
```

Scrumbs reads the project artifacts, shows your current position and points you
to exactly one next action. You stay oriented without having to memorise the
workflow.

Already inside Claude Code? This works too:

```text
/plugin marketplace add alecburrett/scrumbs-skills
```

---

## Designed for real projects, not one perfect scenario

Scrumbs adjusts the amount of ceremony while protecting the quality of the
delivery loop.

- **Starting something new?** It helps turn the initial idea into a product
  brief, PRD, design direction and achievable first sprint.
- **Improving an existing codebase?** It reads the project first and focuses on
  the change, preserving useful context without making you describe the whole
  product again.
- **Building an API, library, CLI or infrastructure project?** Iris steps out
  when there is no user interface, keeping the workflow relevant.
- **Shipping a feature?** The full team helps take it from product intent to a
  reviewed release.
- **Fixing a defect or hotfix?** Planning becomes compact and focused while
  Review, QA and Deploy remain in place—exactly where they add the most value.
- **Working across several sessions?** Repository-based artifacts make every
  approved hand-off resumable and inspectable.

The workflow fits the work; the commitment to a clear definition of done,
review and testing stays strong.

---

## Useful outputs, committed alongside the code

Scrumbs leaves behind a project record your team can read without installing
anything:

```text
docs/BRIEF.md      what you are building, for whom and where the boundaries are
docs/PRD.md        prioritised requirements and numbered acceptance criteria
docs/DESIGN.md     the product's visual direction and living design decisions
docs/BACKLOG.md    valuable ideas deliberately saved for later

sprints/           sprint plans, technical designs, build summaries,
                   reviews, QA results, release records and retrospectives

CHANGELOG.md       a concise history of what shipped
```

These are plain Markdown files in Git. They are easy to inspect, discuss,
diff, review and keep long after a Claude Code session ends—or even if you stop
using the plugin.

---

## Why the specialist workflow works

Each Scrumbs teammate owns a distinct question:

- **Pablo:** Are we solving the right problem, with clear boundaries?
- **Iris:** Will the experience feel intentional and coherent?
- **Stella:** Is this a sprint the team can genuinely finish?
- **Rex:** Is the technical approach sound, and was it implemented well?
- **Viktor:** Can we prove the code works as we build it?
- **Quinn:** Does the increment satisfy the acceptance criteria in practice?
- **Dex:** Can this exact candidate be released safely and reversed if needed?

That separation creates useful tension. The requirements do not quietly shrink
during implementation. A tidy code review does not stand in for product QA. A
successful build does not automatically become a production deployment.

Scrumbs turns those distinctions into a lightweight, repeatable habit.

---

## Built for trust and transparency

Every teammate is defined in Markdown. You can inspect the prompts, understand
the quality bar and propose improvements:

- [`plugin/skills/`](./plugin/skills/) contains the skills Claude Code runs.
- [`personas/`](./personas/) contains the detailed thinking behind each role.
- [`plugin/commands/next.md`](./plugin/commands/next.md) defines the front door
  and lifecycle routing.

Scrumbs records decisions and catches everyday drift, broken hand-offs and
stale review evidence. It complements—not replaces—GitHub branch protection,
required reviewers and CI. That makes it easy to layer into the engineering
controls your project already trusts.

---

## Help Scrumbs grow

Scrumbs is open source, MIT licensed and built to improve through real project
experience.

- ⭐ **[Star the repository](https://github.com/alecburrett/scrumbs-skills)**
  to help more builders discover it.
- 👀 **[Follow Alec Burrett](https://github.com/alecburrett)** for future skills
  and releases.
- 🧪 Try Scrumbs on a real feature, defect or greenfield project and share what
  made the workflow more useful.
- 🛠️ Read [CONTRIBUTING.md](./CONTRIBUTING.md) to improve a persona, strengthen
  a hand-off or propose a new capability.

If you believe AI-assisted development should be clearer, more collaborative
and more dependable, Scrumbs is built for you.

## Requirements

- [Claude Code](https://code.claude.com)
- A Git repository containing the project you want to build

## Licence

Scrumbs is available under the [MIT licence](./LICENSE).
