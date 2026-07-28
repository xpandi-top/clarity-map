# Clarity Map

Plan what matters. Learn what works.

Turn mental clutter into a clear and actionable personal map — and turn what
has already happened into self-knowledge you can reuse.

**Live demo:** https://apps.xpandi.top/clarity-map/

(This account serves GitHub Pages from the custom domain `apps.xpandi.top`;
https://xpandi-top.github.io/clarity-map/ redirects there.)

Clarity Map is a local-first web app for the stage that comes *before* a task
manager. It helps you write down what is on your mind, then work out one
question at a time what each thought actually is — something you want or
something you feel you should do, important or not, a value, a goal, a habit,
or a next action — and how those thoughts connect.

---

## Product philosophy

Most task managers assume you already know what you want, what matters, what is
executable, and how your ideas relate. Clarity Map starts earlier, with
questions like:

- What is currently occupying my mind?
- Is this something I want, or something I think I should do?
- Is it important to me?
- What kind of thought is this?
- What larger goal does it support?
- Can it be started directly, and what is the smallest next step?

The tone is deliberately quiet. Nothing scores you, nothing nags, and "not sure
yet" is always a valid answer. `Should` is not treated as a failure — it is
simply information about where the pull is coming from.

### Two directions, one loop

Planning runs top-down:

```text
Value → Principle → Goal → Milestone → Project → Action
```

Learning runs the other way, starting from something that already happened:

```text
Experience → Observation → Evidence → Belief update → Default rule → Future decision
```

Together they close:

```text
Value → Hypothesis → Small experiment → Observation → Evidence
→ Belief update → Updated default rule → Next action → New observation
```

The app does not treat you as a fixed personality to be discovered once. Your
understanding of yourself is a model, and a model can be revised when the
evidence changes.

The purpose of the learning half is narrow and practical: **stop solving the
same internal problem from scratch every time it happens.** It does that by
handing back your own recorded evidence at the moment it becomes relevant —
never a slogan, never encouragement, and never a conclusion the app worked out
on your behalf:

> You have two observations suggesting that leaving the house increased your
> willingness to move.

not

> You can do it. Stay strong.

Every reminder names where it came from, and you can open the original
observation behind it.

---

## Features

- **Workspaces** — create, rename, duplicate, clear, and delete them; all local.
- **Free-form capture** — Enter keeps a thought, Shift+Enter adds a line break,
  the input clears and refocuses, and the last deletion can be undone. Search
  and filter by Want, Should, or not answered yet.
- **Want vs Should** — asked once per thought, with `W` / `S` / `Esc` shortcuts,
  never blocking.
- **Importance review** — one thought at a time, filtered by whether a thought
  is still unanswered or already marked important or not important, with
  keyboard navigation and the freedom to change earlier answers.
- **Two-dimensional matrix** — either axis can be a dimension you answered or
  a **ranking built from your comparisons**, so the matrix works without
  classifying anything first. Two binary dimensions give a four-panel board
  whose cards are dragged between quadrants and ordered by your pairwise
  ranking; scales and rankings give a scatter plot where position carries
  meaning. Thoughts you have not compared stay in the unplaced list rather
  than piling up at zero as if they had lost. Search and filter by type,
  status, and tag.
- **Thought detail panel** — text, description, type, dimensions, tags, status,
  timestamps, relationships, duplicate, archive, delete, and roadmap access.
- **Custom dimensions** — binary, scale, single-select, multi-select, and
  boolean, each with its own question, helper text, stage, options, and range.
  Creatable straight from either matrix axis picker, which then switches that
  axis to the new dimension. Built-in dimensions can be disabled but not
  deleted.
- **Pairwise comparison** — quick, complete, and manual modes over any
  dimension or subset, with a live ranking and a progress bar. Each dimension
  carries its own comparative wording ("Which one matters more to you?") rather
  than reusing the question written for a single thought. Arrow keys pick a
  side, `=` calls it even, `S` skips. Skipped rounds never affect scores.
- **Thought classification** — a diagram of how the types feed into one
  another, in a simplified five-type view or the full thirteen, with counts,
  per-type detail, multi-select filtering of the list by type, and a
  non-blocking hint when a described result is filed as an action.
- **Relationships** — seven relation types forming a graph, not a tree, each
  offered in both readings ("serves" and "is served by"), so a link can be made
  from whichever end you happen to be looking at. Added in one step from
  Structure, from the detail panel, or by drawing on the roadmap. Exact
  duplicates are rejected and loops are reported rather than silently blocked.
- **Manual breakdown** — available on every thought, not only goals, with
  goal, habit, and decision templates that create real, connected thoughts.
  Each step is labelled with the family it belongs to and how to phrase that
  kind of thought. No AI involved.
- **Checklist export** — turn a finished roadmap into a Markdown checklist,
  nested or flattened to actions and habits only, with completed thoughts
  already ticked. Copy it, download it as `.md`, or print it.
- **Action assessment** — difficulty, priority, impact, energy effect, urgency,
  estimated minutes, and practical flags, with filters and a "Next actions" view.
- **Editable roadmap** — an index that lists the top of each structure by
  default, with search, type filters, and how much sits above and below each
  thought. Opening one gives a laid-out graph you can rearrange by dragging,
  with new relationships drawn between node handles, edge deletion, zoom, pan,
  minimap, a level limit (1, 2, 3, or all) that says how much it is hiding,
  level badges on every node, a colour-and-line-pattern legend that doubles as
  a filter, and a collapsible outline as the list alternative. Relationships
  are phrased for the direction they are drawn in, so a goal reads "has
  milestone X" downwards and X reads "is a milestone of" the goal upwards.
- **Rules** — user-defined conditions that produce *suggestions only*. They are
  applied, ignored, or permanently dismissed by you.
- **Reflect** — a deliberately light five-step flow: what happened, what you
  directly observed versus what you think it may indicate, what it connects to,
  whether it changed your model, and whether it is worth remembering. One
  sentence is a complete entry; everything after it is optional, and the app
  never tells you your interpretation is right.
- **Observations, evidence, and hypotheses** — what happened is stored apart
  from what you make of it, so you can change your reading without losing the
  record. Evidence can rest on several observations, including ones that point
  the other way.
- **Beliefs and belief updates** — your current working model, revised rather
  than overwritten. A replaced belief keeps its place in the timeline together
  with the reason it changed and the evidence on both sides.
- **Personal default rules** — "when this happens, try this first", with
  trigger conditions, exceptions, supporting and contradicting evidence, a
  confidence level, and an experimental / active / needs review / retired /
  replaced status. A replaced rule is kept and linked to its successor.
- **Evidence inbox** — observations nobody has interpreted yet, readings that
  rest on a single record, evidence that disagrees with itself, beliefs worth a
  second look, and rules due for review. "Mark as unresolved" is a first-class
  answer.
- **Model timeline** — previous belief → relevant experience → observation →
  evidence → updated belief → default rule, with a learning graph centred on
  one belief or rule at a time.
- **Learning graph** — eleven epistemic relation types (`supportsBelief`,
  `weakensBelief`, `informsRule`, `updates`, `replaces`, and so on), available
  on the roadmap as a Planning / Learning / Combined switch. Combined is opt-in,
  because both graphs at once stop being readable well before they become
  useful.
- **Evidence reminders** — the thought detail panel, the dashboard, and the
  Reflect screen show what you have already learned that touches the thing in
  front of you, matched by explicit links or shared tags, always with sources
  attached.
- **Dashboard** — "What I am trying to do" and "What I am learning" side by
  side, plus a manual check of your own defaults against a situation you type.
- **Local persistence, import and export** — JSON export with a validated,
  previewed import that never damages existing data when it fails. Learning
  records travel with the workspace, including the full belief history.
- **Example workspace** — loaded only when you ask for it, with one complete
  turn of the learning loop already in it.

## Screens

| Route | Purpose |
| --- | --- |
| `#/welcome` | Start, continue, load the example, or import |
| `#/dashboard` | What I am trying to do, and what I am learning |
| `#/capture` | Write thoughts down; answer Want or Should if you want to |
| `#/reflect` | Record what happened and what it may indicate |
| `#/evidence` | Observations and readings not yet made sense of |
| `#/model` | How your beliefs and defaults have changed, and why |
| `#/structure` | Classify thoughts and see relationships |
| `#/roadmap` · `#/roadmap/:thoughtId` | Graph of what sits above and below |
| `#/actions` | Assess actions and habits |
| `#/compare` | Pairwise comparison and ranking |
| `#/matrix` | Two-dimensional view, from answers or from rankings |
| `#/review/importance` | Optional: one question, one thought at a time |
| `#/settings/dimensions` | Create and configure dimensions |
| `#/settings/rules` | Rules and their suggestions |
| `#/settings/data` | Workspaces, export, import, and deletion |

The intended workflow:

```text
Capture      write it down
→ Structure  what kind of thought is this, and what does it connect to
→ Roadmap    what sits above and below it
→ Actions    what could actually be done
→ Compare    which of these two matters more
→ Matrix     read the result, plotted from those comparisons
```

And the loop that runs the other way, whenever something has actually
happened:

```text
Reflect      what happened, and what it may indicate
→ Evidence   what has not been made sense of yet
→ Model      what you used to think, and what changed it
```

You can move between stages in any order without losing work.

Nothing has to be classified as Want, Should, or important for the matrix to
be useful: comparing pairs produces a ranking, and either axis can be that
ranking. Answering a dimension directly is still available — the Importance
review sits alongside Settings — it is just no longer the only route.

---

## Technical stack

- React 19 + TypeScript (strict)
- Vite 8
- Zustand 5 with the persistence middleware
- React Router 7 (`HashRouter`, so GitHub Pages serves every route)
- `@xyflow/react` for the roadmap graph, `@dagrejs/dagre` for deterministic layout
- Vitest + React Testing Library
- ESLint + typescript-eslint
- Plain CSS with design tokens

There is no backend, database, authentication, analytics, AI service, or API
key anywhere in this project. It is a static site.

## Local setup

```bash
git clone https://github.com/xpandi-top/clarity-map.git
cd clarity-map
npm ci
npm run dev
```

### Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run test` | Run the test suite once |
| `npm run test:watch` | Watch mode |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc -b` with no emit |

Before pushing:

```bash
npm ci && npm run lint && npm run typecheck && npm run test && npm run build
```

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main` and on manual
dispatch. It lints, type-checks, tests, builds, and publishes `dist/` to GitHub
Pages through the official Pages actions.

The Vite `base` comes from `VITE_BASE_PATH`, which the workflow sets to
`/<repository>/` for a project site and `/` for an `<owner>.github.io` site. No
asset path is hard-coded to the domain root.

To deploy a fork: enable **Settings → Pages → Build and deployment → Source →
GitHub Actions**, then push to `main`.

## Your data

By default, Clarity Map stores user data only in the current browser. Clearing
browser storage may remove the workspace. Export important workspaces
regularly.

Everything lives under the `clarity-map-storage` key in `localStorage`. Nothing
is transmitted anywhere — there is no server to transmit it to.

### Import and export

Export produces a JSON file:

```json
{
  "app": "clarity-map",
  "schemaVersion": 3,
  "exportedAt": "ISO_DATE",
  "data": { "workspaces": [] }
}
```

Each workspace carries its thoughts, dimensions, relations, comparisons, and
rules, plus the learning records: `observations`, `evidence`, `hypotheses`,
`beliefs`, `beliefUpdates`, and `personalRules`.

Older files still import. Schema 1 exports have no comparative wording, so
built-in dimensions are given the wording that ships with the app; schema 2
exports have no learning records, so those arrays come in empty. Links that
point at records the file does not contain are dropped rather than left
dangling.

Import parses the file safely, checks the application identifier and schema
version, coerces every record, shows a preview, and lets you merge or replace.
If validation fails, nothing on your device changes. Merging an export that
collides with an existing workspace reassigns ids rather than overwriting.

## Privacy

No accounts, no cloud sync, no telemetry, no third-party requests at runtime.
The deployed page is static files on GitHub Pages.

## Known limitations

- Persistence is per-browser and per-device. Moving between devices means
  exporting and importing a file.
- The matrix drag interaction needs a pointer. Every action it performs is also
  reachable from the detail panel and the list views, so nothing depends on it.
- The matrix orders cards by the pairwise ranking of one dimension at a time.
  Thoughts you have not compared yet fall back to priority order and sit last.
- Comparison scoring is a deliberately simple win/tie ratio rather than an Elo
  or Bradley–Terry model, chosen so the number stays explainable.
- Cycle detection warns but never blocks, since some relation types are
  legitimately non-hierarchical.
- The classification hint ("this may describe a result") uses a small keyword
  heuristic, not language understanding.
- Node positions you drag on the roadmap last for the session. They are not
  persisted, so reopening the roadmap re-runs the automatic layout.
- The JavaScript bundle is a single chunk of roughly 700 kB (about 205 kB
  gzipped), most of it the graph library. Code splitting is an easy follow-up.
- `npm audit` reports an advisory against `react-router` that concerns RSC mode
  only. This app is a client-rendered `HashRouter` SPA and does not use RSC.
- Evidence reminders are matched by explicit links and shared tags, not by
  meaning. A record with no link and no matching tag will not surface on its
  own.
- Rule triggers are written in your own words and checked only when you ask.
  There is no background monitoring, and there could not be: this is a static
  page with no server.
- The learning graph shows one belief or rule at a time. There is no
  whole-graph view, because it would not be readable.
- Nothing here is a diagnosis or medical advice. The app organises your records
  and makes connections visible; the interpretation stays yours.

## Future opportunities

- Route-level code splitting so the roadmap graph loads on demand.
- Richer scale-versus-scale matrix rendering, including axis ticks.
- Optional encrypted file sync, still without an account.
- Saved filter presets and per-quadrant bulk edits.
- Undo history beyond the most recent deletion.
- Context-aware matching of rules, so a default surfaces from the energy level
  and time of day recorded on an observation rather than from typed words.
- A review queue that schedules belief and rule reviews by date.

## License

MIT — see [LICENSE](LICENSE).
