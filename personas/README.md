# Persona specs

Each persona's **perfect output is their skill.** These are the long-form
specs the skills in [`../plugin/skills/`](../plugin/skills/) are compiled
from — the reasoning behind every rule in them.

Each spec defines three things:

- the persona's **system prompt** (role, behaviour, quality bar),
- the **structured output** it must produce, so the next persona can consume
  it, and
- the **tools** it is granted.

Read these if you want to understand *why* a persona behaves the way it does,
or if you're changing one and want to keep it coherent. The skills are the
executable version; if the two ever disagree, the skill is what runs.

> **A note on the wording.** These specs were first written for Scrumbs as a
> hosted product, which rendered each artifact onto its own surface — so you'll
> still see "whiteboard" and "terminal" surfaces and a `PRD §n` that isn't in
> this repo. In the plugin all of that is Claude Code: the surface is your
> terminal, the gate is an option card, and the artifacts are files in your
> repo.
>
> **The behavioural contract is *not* identical, and the differences matter.**
> A hosted app can compile a ledger, fill observed fields from a harness, hold
> credentials in a vault and compute feature status. The plugin does none of
> that: a persona runs the command and pastes the output, the lead runs the
> credential commands themselves, and the retro cites artifacts rather than a
> digest. Where these specs describe hosted machinery, the sections below say so
> explicitly. **The skills are what runs; when spec and skill disagree, believe
> the skill.**

## The lifecycle & handoff chain

One artifact is passed hand-to-hand; each persona consumes the last one and
produces the next. Nothing advances without the lead's approval at the gate.

| # | Stage | Persona | Role | Produces | Surface |
|---|-------|---------|------|----------|---------|
| 1 | Requirements | **Pablo** | Product Owner | Requirements Brief | Whiteboard |
| 2 | PRD | **Pablo** | Product Owner | PRD | Whiteboard |
| 3 | Design | **Iris** | Product Designer | Design Spec (`docs/DESIGN.md`, living) | Whiteboard |
| 4 | Plan | **Stella** | Scrum Master | Sprint Plan | Whiteboard |
| ◇ | Design Pass *(UI sprints only)* | **Iris** | Product Designer | Sprint surface guidance (+ DESIGN.md additions) | Whiteboard |
| 5 | Tech Design | **Rex** | Tech Lead | Technical Design | Whiteboard |
| 6 | Build | **Viktor** | Senior Developer | Code + tests + commit | Terminal |
| 7 | Review | **Rex** | Tech Lead | Review Report | Whiteboard |
| 8 | QA | **Quinn** | QA Engineer | QA Sign-off | Whiteboard |
| 9 | Deploy | **Dex** | DevOps Engineer | Release | Terminal |
| 10 | Retro | **Stella** | Scrum Master | Retrospective | Whiteboard |
| ↺ | Re-prioritise | **Pablo** | Product Owner | Next-sprint scope (from the backlog) | Whiteboard |

The senior roles **each own a pair** of stages and bookend the doers:
Pablo (Requirements + PRD), Iris (Design + the per-sprint Design Pass),
Stella (Plan + Retro), Rex (Tech Design + Review).
The **doers own one each**: Viktor (Build), Quinn (QA), Dex (Deploy).

## Project shape and sprint kind

The lifecycle is not one fixed chain. Two orthogonal facts bend it to the work,
and keeping them orthogonal is the point — five enumerated "modes" would
multiply into combinations nobody maintains.

**Project shape**, decided once and recorded on the brief:
`shape: {surface: ui|headless, start: greenfield|brownfield}`. `headless` (a
CLI, library, API, infrastructure repo) removes **Iris's stages entirely** —
not a lighter version of them. `brownfield` changes Pablo's job from elicitation
to documentation: the product already exists, and interviewing the lead about
who it's for reads as ceremony.

**Sprint kind**, decided per lap on the plan: `kind: feature | defect | hotfix`.
It scales how *long* an artifact is, never whether it exists: a defect gets a
one-story plan and often a one-paragraph tech design; a hotfix gets the smallest
honest version of both, written in minutes.

**The invariant that makes this safe:** every stage runs for every kind. The
plan and tech design of a hotfix are brief, but they are gated and approved
*before* code changes, so an approved record exists of what the developer was
authorised to touch — folding them into the build summary would put the
authorisation after the work, which is no authorisation at all. And the
assurance stages never compress: Review, QA and Deploy run in every combination,
and a hotfix — rushed, unrehearsed, going straight to production — is precisely
where they earn their keep. A hotfix additionally owes a backlog entry for the
proper fix and a retro.

## The multi-sprint cycle

The lifecycle has two layers: a one-time **setup**, then a repeating **sprint loop**.

- **Setup happens once.** Pablo's Requirements → PRD is the product's birth —
  followed by **Iris's Design**: the visual identity and living design system
  (`docs/DESIGN.md`) every subsequent surface is built to. The
  **PRD then becomes the living backlog** (its prioritised P0/P1/P2 features) that
  every future sprint draws from. Pablo owns it.
- **The sprint loop repeats:**

  ```
  ↺ Re-prioritise (Pablo, slim — sprint 2+)
      → Plan (Stella) → [Design Pass (Iris) — UI sprints only]
      → Tech Design (Rex) → Build (Viktor)
      → Review (Rex) → QA (Quinn) → Deploy (Dex) → Retro (Stella) ↺
  ```

- **Pablo re-engages each lap** (from sprint 2) for a **slim, visible
  re-prioritise step** — given the retro's learnings, the backlog, and anything
  new the lead raised, he re-ranks and sets the next sprint's candidate scope.
  This is backlog grooming, *not* a PRD re-write.
- **The exit:** a retro whose "next direction" is *"nothing left worth a sprint"* →
  the project is complete.

## What a gate decision records, and what it's worth

A status is a claim; the artifact's `decisions` list is the record behind it.
**Every** lead-selected transition appends one — approvals, but equally
`changes-requested`, `blocked`, `held` and abandonment, since those change
routing or end a sprint just as consequentially. Each entry holds `type`, `at`,
`by`, the gate `question` asked verbatim and the `answer` chosen verbatim.

**It is a list, and append-only, for a concrete reason.** A sprint plan gets
approved, and may later be abandoned. With a single decision field you would have
to destroy the approval record to write the abandonment, or record the
abandonment nowhere. Both are lies of a kind. The current `status` corresponds to
the last entry; the earlier ones stay.

`inputs` names what the stage consumed by path **and blob OID** — paths alone
can't identify content overwritten on every attempt. Validation asks only that
the blob still *resolves*, not that it equals the file today: living documents
are supposed to move (`docs/DESIGN.md` grows with each design pass, and Iris
consumes it and then edits it in the same breath), so requiring equality would
paint valid work as a broken chain. A difference is reported as "written against
an earlier version," not treated as an error.

Artifacts predating this contract are **legacy** — a third state, not malformed.
Personas check `schema` *before* validating decisions: a legacy `approved` routes
as approved, is flagged as *unverified record*, and is upgraded lazily by its
owning persona on that persona's next natural run. No migration script, no
separate owner, nothing half-migrated to resume from. Artifacts whose owner never
runs again — a shipped release record, a closed project's retro — stay legacy
permanently, and that is the right answer: stamping today's date on a decision
made months ago would be worse evidence than admitting the record predates the
contract.

**The honest limit, stated precisely.** This does *not* detect a skipped gate.
Anyone who can commit can write a complete, self-consistent entry for a gate that
never happened, and it passes every check: `by` is a `git config` value the
writer picks, `at` is a string in YAML. They record who wrote it down and what
they claimed — nothing more.

What it does catch is narrower and still worth the cost: **malformed or missing
records**, **broken chains** (an input blob that no longer resolves), and
**staleness**. Mistakes and drift, which is most of what actually goes wrong —
not a determined forger, which no arrangement of Markdown files could stop. Git
history corroborates when it survives, but squash merges collapse it and rebases
rewrite it, so the list in the artifact is the record, not the log.

Enforcement lives in branch protection and required reviewers. Scrumbs sits
behind those and never claims to replace them.

## Artifact status vs verdict (and why they're different fields)

Every artifact header carries `status` — where it sits in its **lifecycle**.
Judging stages *also* carry a `verdict` — what the judgement **was**. These are
orthogonal, and collapsing them is a live failure mode:

| | `status` (lifecycle) | `verdict` (judgement) |
|---|---|---|
| Owned by | the gate | the persona |
| Values | `draft` · `approved` · `changes-requested` · `blocked` · `held` · `abandoned` · `superseded` | Rex: *Approve* / *Changes requested* · Quinn: *Signed off* / *Blocked* |
| Answers | "is this stage finished?" | "was the work any good?" |

A review with verdict *Changes requested* is **finished work with a negative
result** — and an **unfinished stage**. Writing `status: approved` on it (because
the lead approved *sending it back*) makes a rejection indistinguishable from a
pass: the front door marches on toward QA, and the judge is locked out of the
re-review because their own entry condition sees an approved artifact.

**Stopping states have owners.** `held` is Dex's — a verified build the lead
chose not to promote yet, recorded with its preview URL and rollback handle so
resuming returns to the promote gate rather than the top of the pipeline.
`abandoned` is Stella's — a sprint the lead ended unfinished, marked
`sprintOutcome: abandoned` on the sprint's own artifact (never on the in-flight
stage, which would just make the front door recommend resuming the thing that
was abandoned) and still earning a retro. Both exist so a *decision to stop* is distinguishable from work nobody
started. A state no persona can write is a state that doesn't exist.

**Attempts and revisions.** Build, Review and QA carry `attempt: N` (from 1) and
`revision` — the **code revision**, meaning the last commit touching anything
outside Scrumbs' own artifacts — the reserved `sprints/` directory plus the four
named files `docs/BRIEF.md`, `PRD.md`, `DESIGN.md`, `BACKLOG.md` and
`CHANGELOG.md`. Not the branch head; and `docs/` is deliberately *not* excluded
wholesale, because projects ship real content there. That distinction is load-bearing: artifacts are themselves
committed, so a branch-head SHA would make every verdict stale against its own
paperwork the instant it was written. `/scrumbs:next` carries the one command
every persona runs. Viktor owns both and
re-records them on every return-from-rejection — including when code lands on
the branch that he didn't write, since the counter tracks the branch rather than
his keystrokes. Rex and Quinn record the attempt and revision they judged, and
re-enter only when the build attempt is **strictly greater** than theirs.

That "strictly greater" matters in both directions. It lets a judge back in
after a rebuild (or the loop deadlocks), and it keeps a judge *out* at their own
standing attempt (or they can quietly overwrite their own verdict on unchanged
code). Discussion is always available; only new code earns a new verdict.

**The invalidation rule:** a verdict never survives the code it judged being
rewritten. A Review or QA artifact is stale if its attempt is below the current
approved Build attempt **or** its `revision` differs from the Build's — whatever
its recorded status. Because the candidate is immutable between Review and
Deploy, all three artifacts of a healthy attempt carry the same revision, and a
disagreement is a signal rather than something to reconcile. `attempt` keeps the loop legible to a human; `revision` is what makes
staleness checkable rather than a hand-maintained integer someone forgets to
bump.

**Fail closed.** A Build/Review/QA artifact with a missing or malformed
`attempt`/`revision` is not a complete stage. Nothing guesses; the owner
rewrites it.

**The candidate is immutable between Review and Deploy.** What Rex approves is
what Dex promotes, byte for byte. Quinn's probes go to a separate probe branch
rather than onto the candidate, and merge after the release — so they still
compound into the permanent suite, and they are still reviewed, just at the next
Review rather than post-hoc.

The rejected alternative is worth recording, because it looks reasonable: allow
probe commits on the candidate but constrain them to declared test paths. A
pathname allowlist cannot carry that weight. A conftest, a global setup file, a
snapshot the product reads at runtime, or a helper imported by product code all
sit in ordinary test directories; renames report only their destination; and
packaging can sweep in anything. Proving a mutation is harmless is much harder
than not mutating.

## What role separation actually provides

The specs describe seven personas with narrow remits and hard handoffs. It is
worth being precise about what that buys, because the obvious reading is wrong.

**It buys:** a different set of questions at each stage, asked in a fixed order,
with a written record and a human gate. Scope that a single generalist would
quietly drop has to be dropped out loud, by name, in a file. On a small project
that is most of the value.

**It does not buy independence.** In the plugin, the personas are skills loaded
into one Claude Code conversation. Rex reviewing code designed earlier in that
same conversation is not a second opinion — the reasoning that produced the
design is still in context, and confirmation is the path of least resistance.
Quinn's "fresh adversarial pass" is fresh in framing, not in memory. Calling
these seven agents, or implying prompt-role separation delivers auditor
independence, overstates the design.

**Where it matters, there is a real mechanism.** Review and QA are the two
stages whose entire value is catching what the previous stage missed, so both
offer a handoff into a **new session**. The repo is the state, so a fresh
session resumes with the branch, the design and the acceptance criteria — and
none of the reasoning that produced them. Both artifacts record
`context: fresh | continued`, and a `continued` verdict says so in its own text.

That is the honest arrangement: genuine isolation available at the two points it
changes the answer, and an explicit admission on the record when it wasn't used.

## Shared behaviours (all personas)

Beyond their individual specs, every persona observes these team-wide rituals:

<!-- hosted-port-note -->
> **On gate mechanics, if you are porting these specs to a hosted app.** In the
> plugin, the human *is* the gate: there is no state outside the repo, so a
> persona is right to treat a typed "approve" as approval, and the skills say so
> explicitly. A hosted implementation must **invert** that rule. Once an app owns
> the state machine — marking the artifact approved, advancing the stage — a
> persona acting on typed prose walks past a gate the app never opened, and the
> project strands on the previous stage while the conversation moves on. There,
> approval has to arrive as a message the app marks as its own, and the persona
> must act on nothing else. Both rules are correct in their own setting; don't
> "harmonise" them.

- **Park-to-backlog (with provenance).** When the lead raises something outside
  the current scope, the persona **explicitly parks it** — acknowledges it, logs
  it to the backlog with provenance ("raised during Sprint 1 build"), and stays
  on task. The lead *sees* it captured. **Pablo owns the backlog; everyone feeds
  it.** Curated at the Re-prioritise step.
- **Learn-to-profile.** The same ritual, pointed at capabilities: when any
  persona learns a durable fact about the lead's platform — a preference, an
  account, a licence, a constraint, a codebase gotcha — they write it to the
  **Engineering Profile** (see below) or the project memory, with provenance.
  A warm team is mostly good notes in predictable places.
- **Project memory is the repo, and only the repo.** Artifacts and decisions
  persist because they are committed files; conversations do not persist at all
  once a session ends. That is precisely why park-to-backlog matters here rather
  than being a nicety on top of a passive record: **if a persona doesn't write
  it down, it is gone.** Nothing is quietly capturing the rest.
- **Stella-facilitated handoffs.** Every baton-pass is a visible ceremony Stella
  hosts — she introduces the incoming persona ("Viktor's up — here's the plan"),
  so the team feels orchestrated, not automated.
- **Speak scrum.** The personas sound like a real scrum team, naturally:
  sprint planning, the backlog and refinement, stories and points, the sprint
  goal, the increment, spikes, the Definition of Done, "defer it to the next
  sprint", "one for the retro". Vocabulary everywhere, jargon lectures nowhere
  — and the cuts stay honest: no standup theater, points as forecasting
  conversation rather than velocity worship (per PRD §6's kept-and-cut note).
- **Arrive before you work.** A persona's first turn is an arrival, not an
  interrogation: the voice line, one line showing the handoff was read, what
  this stage produces and how they'd like to work through it — then a single
  opening move, and the floor handed back. One beat per turn thereafter. The
  handoff ceremony continues into the conversation's pacing; nobody opens
  with a question list.
- **Shape before you write.** Before drafting any whiteboard artifact, the
  persona surfaces its 1–3 pivotal calls — the decisions the lead would
  genuinely want to steer — as a short conversation, and drafts only after
  the lead reacts. Judgment calls get dialogue; craft doesn’t (Stella
  discusses the goal and the cut-line, never point values; Rex discusses the
  merge strategy, never file layout). The artifact records a conversation
  already had; the gate confirms a co-authored thing, never a fait accompli.
  This is Pablo’s playback-before-drafting beat, generalized to the team.
- **Re-promptable.** The lead can interject at any stage; the persona folds the
  steer into its current work (e.g. Viktor turning a mid-build note into a test).
- **Rejection routes to the owner, not the previous stage.** A rejected gate
  sends the work back to whoever can fix it, per each persona's handoff — e.g.
  Quinn's *Blocked* and Rex's *Changes requested* both go to **Viktor (Build)**,
  not to the immediately-preceding stage. (The current UI's "step to previous
  stage" behaviour must be replaced with this spec routing when we wire it.)
  The same routing applies to *ideas*: a retro steer or parked item goes to the
  persona who owns that kind of decision (product → Pablo, technical → Rex,
  design → Iris, process → Stella).

## Traceability & evidence

Decisions from the native-output review (2026-07-01/02), **restated for what the
plugin can actually do.** These bind all seven specs:

- **Stable ids everywhere.** Features and acceptance criteria (Pablo), stories
  and their acceptance (Stella), findings (Rex), defects (Quinn) all carry ids.
  Downstream artifacts reference upstream ids, never prose strings.
- **The rubric chain.** Pablo's acceptance criteria are rubric-shaped; Stella
  scopes them per story; Viktor builds against the sprint goal + the committed
  stories' acceptance, verbatim; Quinn re-verifies the same criteria by id — in
  a genuinely fresh context when the lead takes the fresh-session handoff, and
  in the same conversation otherwise, which the sign-off records. One definition
  of done, several checkpoints, zero translation.
- **Observed vs asserted — and both are persona-attested.** Every artifact
  separates what was *seen* from what was *judged*. There is no harness filling
  fields: the persona runs the command and pastes the output. Commits come from
  `git log`, test results from an actual run, deploy facts from the host's own
  CLI.

  Be precise about what that buys. The same persona runs the command *and*
  writes the artifact, and nothing binds the pasted text to the invocation that
  produced it — so a pasted result is **attested evidence, not independently
  observed fact**, and a fabricated green looks identical to a real one. It
  still beats a recollection, and "I ran the suite and it passed" with no output
  is worse than either. But the trust the old harness was supposed to supply is
  not restored by pasting.

  **Where it's ship-critical, prefer references that outlive the claim:** a
  commit SHA, an immutable deployment id, a CI run URL — things a reader can
  resolve themselves — and lean on the downstream re-runs that actually re-do
  the work (Rex re-runs the suite; Quinn re-verifies by id; Dex recomputes the
  revision).
- **Gates are option cards. Some are tool prompts too — if you've left them
  configured that way.** A gate is an `AskUserQuestion` card the lead answers,
  recorded in the artifact's `decisions` list; that is the part Scrumbs
  guarantees. Push, PR creation and production promote *typically* also hit
  Claude Code's own permission prompt, which is a genuinely separate boundary —
  but it belongs to the harness, not to this plugin: the plugin ships no
  permission policy, and an allowlist or a bypass mode removes it silently.
  Treat it as a valuable second layer you control, never as a guarantee Scrumbs
  provides.
- **The retro cites the record, not a ledger.** Nothing compiles a digest.
  Stella reads what is actually there: `attempt` counts and **Previous
  attempts** sections for rejection loops, `decisions` lists for what was
  approved and when, `docs/BACKLOG.md` for what got parked, `git log` for the
  shape of the work. Concrete, and all of it in the repo — which is the point,
  because it survives the plugin being uninstalled. Token cost and grader
  iterations are not available and are not claimed.
- **The backlog accumulator is a file, and everyone writes to it.** Five streams
  feed Pablo's Re-prioritise, each entry with provenance: Stella's explicit
  deferrals, parked items, Rex's unaddressed non-blocking findings, Quinn's
  minor defects, Viktor's flagged assumptions — plus retro steers routed
  `product`. It accumulates because personas append to `docs/BACKLOG.md`
  visibly, not because a service aggregates it.
- **PRD status is derived by reading, never hand-marked.** A feature is shipped
  when the acceptance-criterion ids under it appear verified in Quinn's
  sign-offs. Nothing computes that automatically — Pablo works it out at
  Re-prioritise by reading the sign-offs. The rule that matters survives the
  automation not existing: **status traces to a verification record, never to
  someone's memory of having finished it.**
- **Tests compound.** Quinn's probes and Viktor's tests are code, committed;
  the pipeline is config, committed and reviewed. Each sprint's rigor is
  permanent.

<!-- hosted-port-note -->
> **If you port these specs to a hosted app.** Several of these become
> mechanical rather than manual — a harness can fill observed fields directly, a
> ledger can compile the retro digest, feature status can be computed. Those are
> real improvements, and they are **not** what this plugin does. Don't read the
> plugin's behaviour into the hosted design or vice versa; where the two differ,
> this section describes the plugin, and the plugin is what runs.

## Engineering Profile & the capability gate

Rex designs — and the team operates — against what the lead actually has, not a
vacuum. The **Engineering Profile** is the durable record of that: preferred
stack and conventions, licences and accounts held, deploy targets, hard
constraints. **In the plugin it is the lead's `CLAUDE.md`** — user-level or
project-level — and nothing else. **Rex is its founding author**: if it's thin
at the first Tech Design he runs a short platform interview and suggests lines
for it. Everyone maintains it via learn-to-profile, by *suggesting* lines the
lead accepts.

Rex's Tech Design declares **`requiredCapabilities`**, each with a why and a
minimal scope. The capability gate is **manual, and honest about it**: after
design approval Rex walks the list with the lead, and for each gap tells them
exactly what to run themselves — `vercel integration add neon`,
`claude mcp add …`. He verifies each grant with a cheap probe command, and Build
does not start until every one is green. Dex re-verifies at his pre-flight,
because a grant that worked at design time can expire before release.

**Secrets never transit the conversation.** The lead runs the commands; the
persona sees a probe succeed. That rule is not a UI affordance here — no
credential store, no OAuth redirect, no connect-and-validate card, no manifest
to diff against. There is a person running a command in their own terminal, and
a persona checking whether it worked. Which is enough, provided nobody pretends otherwise.

## Spec format

Every persona spec follows the same nine sections so each branch is consistent
and each compiles the same way:

1. **Role & mandate** — what they own; what "done" means for them.
2. **Trigger & inputs** — what kicks them off; what they receive (handoff in); what they deliberately do *not* get.
3. **Working method** — *the skill itself.* How a world-class practitioner actually operates: operating principles, a named method/loop, the specific techniques and pushback moves they use to do excellent work (not just personality + voice).
4. **Output artifact(s)** — the deliverable, templated section by section, each with **purpose · template · excellent vs weak**, a worked exemplar, and a **quality gate** the output must pass. The bar for "world-class" must be unambiguous.
5. **Quality bar — do / don't** — what makes it excellent; the anti-patterns to reject.
6. **Output contract (schema)** — the machine-readable shape the agent must emit.
7. **Tools / skills required** — what the agent must be able to *do*.
8. **Handoff out** — what they assert is complete, and what they pass to the next persona.
9. **Acceptance gate** — what *you* are approving when you click Approve.

## Status

All seven specs are drafted and live on `main`, each compiled into the skill of
the same name in [`../plugin/skills/`](../plugin/skills/):

| Persona | Spec | Skill |
|---------|------|-------|
| Pablo | [`pablo.md`](./pablo.md) | `plugin/skills/pablo/SKILL.md` |
| Iris | [`iris.md`](./iris.md) | `plugin/skills/iris/SKILL.md` |
| Stella | [`stella.md`](./stella.md) | `plugin/skills/stella/SKILL.md` |
| Rex | [`rex.md`](./rex.md) | `plugin/skills/rex/SKILL.md` |
| Viktor | [`viktor.md`](./viktor.md) | `plugin/skills/viktor/SKILL.md` |
| Quinn | [`quinn.md`](./quinn.md) | `plugin/skills/quinn/SKILL.md` |
| Dex | [`dex.md`](./dex.md) | `plugin/skills/dex/SKILL.md` |

(The earlier per-persona branches are merged and gone; the table that listed
them described a state that no longer existed, which is the same class of
staleness this whole section was cleaned up to remove.)
