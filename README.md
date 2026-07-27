# Clarity Map

Turn mental clutter into a clear and actionable personal map.

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

---

## Features

- **Workspaces** — create, rename, duplicate, clear, and delete them; all local.
- **Free-form capture** — Enter keeps a thought, Shift+Enter adds a line break,
  the input clears and refocuses, and the last deletion can be undone.
- **Want vs Should** — asked once per thought, with `W` / `S` / `Esc` shortcuts,
  never blocking.
- **Importance review** — one thought at a time, filtered by whether a thought
  is still unanswered or already marked important or not important, with
  keyboard navigation and the freedom to change earlier answers.
- **Two-dimensional matrix** — any two dimensions on the axes. Two binary
  dimensions give a four-panel board whose cards are dragged between quadrants
  and ordered by your pairwise ranking; scale dimensions give a scatter plot
  where position carries meaning. Search and filter by type, status, and tag.
  Unplaced thoughts are listed separately.
- **Thought detail panel** — text, description, type, dimensions, tags, status,
  timestamps, relationships, duplicate, archive, delete, and roadmap access.
- **Custom dimensions** — binary, scale, single-select, multi-select, and
  boolean, each with its own question, helper text, stage, options, and range.
  Creatable straight from either matrix axis picker, which then switches that
  axis to the new dimension. Built-in dimensions can be disabled but not
  deleted.
- **Pairwise comparison** — quick, complete, and manual modes over any
  dimension or subset, with a live ranking. Skipped rounds never affect scores.
- **Thought classification** — a diagram of how the types feed into one
  another, in a simplified five-type view or the full thirteen, with counts,
  per-type detail, multi-select filtering of the list by type, and a
  non-blocking hint when a described result is filed as an action.
- **Relationships** — seven relation types forming a graph, not a tree. Added
  in one step from Structure ("this contributes to / is related to…", with the
  target list grouped by type), from the detail panel, or by drawing on the
  roadmap. Exact duplicates are rejected and loops are reported rather than
  silently blocked.
- **Manual goal breakdown** — goal, habit, and decision templates that create
  real, connected thoughts. No AI involved.
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
- **Local persistence, import and export** — JSON export with a validated,
  previewed import that never damages existing data when it fails.
- **Example workspace** — loaded only when you ask for it.

## Screens

| Route | Purpose |
| --- | --- |
| `#/welcome` | Start, continue, load the example, or import |
| `#/capture` | Write thoughts down; answer Want or Should |
| `#/review/importance` | One question, one thought at a time |
| `#/matrix` | Two-dimensional view with quadrants and filters |
| `#/compare` | Pairwise comparison and ranking |
| `#/structure` | Classify thoughts and see relationships |
| `#/actions` | Assess actions and habits |
| `#/roadmap` · `#/roadmap/:thoughtId` | Graph of what sits above and below |
| `#/settings/dimensions` | Create and configure dimensions |
| `#/settings/rules` | Rules and their suggestions |
| `#/settings/data` | Workspaces, export, import, and deletion |

The intended workflow:

```text
Brain dump
→ Want versus Should
→ Important versus Not Important
→ Two-dimensional matrix
→ Thought classification
→ Thought relationships
→ Goal breakdown
→ Action assessment
→ Roadmap
```

You can move between stages in any order without losing work.

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
  "schemaVersion": 1,
  "exportedAt": "ISO_DATE",
  "data": { "workspaces": [] }
}
```

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
- The JavaScript bundle is a single chunk of roughly 585 kB (about 180 kB
  gzipped), most of it the graph library. Code splitting is an easy follow-up.
- `npm audit` reports an advisory against `react-router` that concerns RSC mode
  only. This app is a client-rendered `HashRouter` SPA and does not use RSC.

## Future opportunities

- Route-level code splitting so the roadmap graph loads on demand.
- Richer scale-versus-scale matrix rendering, including axis ticks.
- Optional encrypted file sync, still without an account.
- Saved filter presets and per-quadrant bulk edits.
- Undo history beyond the most recent deletion.

## License

MIT — see [LICENSE](LICENSE).
