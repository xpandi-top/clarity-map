import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ConfidenceChip } from "../../components/learning/ConfidenceSelect";
import { RelevantLearning } from "../../components/learning/RelevantLearning";
import { BUILTIN_DIMENSION, IMPORTANCE_YES } from "../../domain/defaults";
import {
  EVIDENCE_STATUS_LABEL,
  PERSONAL_RULE_STATUS_LABEL,
  derivedEvidenceStatus,
} from "../../domain/learning";
import { inboxOpenCount } from "../../domain/learningInbox";
import { rulesMatchingSituation } from "../../domain/relevance";
import { nextActions } from "../../domain/selectors";
import {
  useBeliefUpdates,
  useBeliefs,
  useCurrentWorkspace,
  useEvidence,
  useLearningInbox,
  useObservations,
  usePersonalRules,
  useRelevantLearning,
  useStore,
  useVisibleThoughts,
} from "../../store";
import { formatDate, tx } from "../../i18n/core";

/**
 * Two questions side by side: what am I trying to do, and what have I worked
 * out about how I operate. Planning and learning are different activities and
 * the dashboard should not blur them together.
 */
export function DashboardScreen() {
  const workspace = useCurrentWorkspace();
  const thoughts = useVisibleThoughts();
  const observations = useObservations();
  const evidence = useEvidence();
  const beliefs = useBeliefs();
  const beliefUpdates = useBeliefUpdates();
  const personalRules = usePersonalRules();
  const inbox = useLearningInbox();
  const selectThought = useStore((state) => state.selectThought);

  const [situation, setSituation] = useState("");

  const importantGoals = useMemo(
    () =>
      thoughts.filter(
        (thought) =>
          (thought.type === "goal" ||
            thought.type === "outcome" ||
            thought.type === "vision") &&
          thought.status === "active" &&
          thought.dimensionValues[BUILTIN_DIMENSION.importance] ===
            IMPORTANCE_YES,
      ),
    [thoughts],
  );

  const projects = useMemo(
    () =>
      thoughts.filter(
        (thought) => thought.type === "project" && thought.status === "active",
      ),
    [thoughts],
  );

  const habits = useMemo(
    () =>
      thoughts.filter(
        (thought) => thought.type === "habit" && thought.status === "active",
      ),
    [thoughts],
  );

  const actions = useMemo(() => nextActions(thoughts), [thoughts]);

  const recentUpdates = useMemo(
    () =>
      [...beliefUpdates]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 3),
    [beliefUpdates],
  );

  const experimentalRules = useMemo(
    () => personalRules.filter((rule) => rule.status === "experimental"),
    [personalRules],
  );

  const emerging = useMemo(
    () =>
      [...evidence]
        .filter((entry) => entry.status !== "retired")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 5),
    [evidence],
  );

  const matchingRules = useMemo(
    () => rulesMatchingSituation(personalRules, situation),
    [personalRules, situation],
  );

  // Nothing recorded is the normal starting state for the learning loop, and
  // it should read as an invitation rather than as five empty sections.
  const hasLearning = observations.length > 0 || evidence.length > 0;

  // One reminder block, anchored to whatever is most in front of the user.
  const reminderThoughtId = actions[0]?.id ?? importantGoals[0]?.id ?? null;
  const reminders = useRelevantLearning(reminderThoughtId);

  return (
    <div className="stack">
      <div className="screen-header">
        <h1>{workspace?.name ?? "Dashboard"}</h1>
        <p>See what needs attention now, and what you have learned along the way.</p>
      </div>

      <div className="grid-2">
        <section className="card stack">
          {/* The way into this loop sits in the header, not under a long
              column where it can fall below the fold. */}
          <div className="column-head">
            <div>
              <span className="column-head__label">Plan</span>
              <h2>What I am trying to do</h2>
            </div>
            <Link className="button button--small" to="/capture">
              Capture a thought
            </Link>
          </div>

          <DashboardList
            title="Goals that matter now"
            empty="No goals marked as important yet."
            items={importantGoals.slice(0, 5).map((thought) => ({
              id: thought.id,
              text: thought.text,
            }))}
            onSelect={selectThought}
          />
          <DashboardList
            title="Projects"
            empty="No projects yet."
            items={projects.slice(0, 5).map((thought) => ({
              id: thought.id,
              text: thought.text,
            }))}
            onSelect={selectThought}
          />
          <DashboardList
            title="Actions"
            empty="No actions yet."
            items={actions.map((thought) => ({
              id: thought.id,
              text: thought.text,
            }))}
            onSelect={selectThought}
          />
          <DashboardList
            title="Habits"
            empty="No habits yet."
            items={habits.slice(0, 5).map((thought) => ({
              id: thought.id,
              text: thought.text,
            }))}
            onSelect={selectThought}
          />

          <div className="row column-foot">
            <Link
              className="button button--quiet button--small"
              to="/structure"
            >
              Structure
            </Link>
            <Link className="button button--quiet button--small" to="/roadmap">
              Roadmap
            </Link>
            <Link className="button button--quiet button--small" to="/actions">
              Actions
            </Link>
          </div>
        </section>

        <section className="card stack">
          <div className="column-head">
            <div>
              <span className="column-head__label column-head__label--learn">
                Learn
              </span>
              <h2>What I am learning</h2>
            </div>
            <Link className="button button--small" to="/reflect">
              Record what happened
            </Link>
          </div>

          {hasLearning ? null : (
            <p className="empty-state">
              Nothing recorded yet. When something happens — a decision that
              went well, an afternoon that went sideways — write it down and see
              what it turns out to mean.
            </p>
          )}

          {hasLearning ? (
            <>
              <DashboardList
                title="Recent observations"
                empty="Nothing recorded yet."
                items={inbox.recentObservations
                  .slice(0, 5)
                  .map((observation) => ({
                    id: observation.id,
                    text: observation.description,
                  }))}
              />

              <div className="stack" style={{ gap: "var(--space-1)" }}>
                <h3 style={{ margin: 0 }}>Emerging patterns</h3>
                {emerging.length === 0 ? (
                  <p className="faint" style={{ margin: 0 }}>
                    Nothing yet.
                  </p>
                ) : (
                  <ul className="stack" style={{ gap: "var(--space-1)" }}>
                    {emerging.map((entry) => (
                      <li key={entry.id}>
                        {entry.statement}{" "}
                        <span className="faint">
                          {EVIDENCE_STATUS_LABEL[derivedEvidenceStatus(entry)]}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="stack" style={{ gap: "var(--space-1)" }}>
                <h3 style={{ margin: 0 }}>Beliefs recently updated</h3>
                {recentUpdates.length === 0 ? (
                  <p className="faint" style={{ margin: 0 }}>
                    Nothing yet.
                  </p>
                ) : (
                  <ul className="stack" style={{ gap: "var(--space-1)" }}>
                    {recentUpdates.map((update) => (
                      <li key={update.id}>
                        {update.updatedStatement}
                        <br />
                        <span className="faint">
                          {formatDate(update.createdAt)}
                          {update.previousStatement
                            ? tx(' · was: {text}', ' · 原认知：{text}', {
                                text: update.previousStatement,
                              })
                            : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="stack" style={{ gap: "var(--space-1)" }}>
                <h3 style={{ margin: 0 }}>Experimental rules</h3>
                {experimentalRules.length === 0 ? (
                  <p className="faint" style={{ margin: 0 }}>
                    Nothing being tried yet.
                  </p>
                ) : (
                  <ul className="stack" style={{ gap: "var(--space-1)" }}>
                    {experimentalRules.map((rule) => (
                      <li key={rule.id}>
                        <strong>{rule.name}</strong> — {rule.defaultResponse}{" "}
                        <span className="faint">
                          {PERSONAL_RULE_STATUS_LABEL[rule.status]}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="stack" style={{ gap: "var(--space-1)" }}>
                <h3 style={{ margin: 0 }}>Contradictory evidence</h3>
                {inbox.contradictory.length === 0 ? (
                  <p className="faint" style={{ margin: 0 }}>
                    None recorded.
                  </p>
                ) : (
                  <ul className="stack" style={{ gap: "var(--space-1)" }}>
                    {inbox.contradictory.map((entry) => (
                      <li key={entry.id}>
                        {entry.statement}{" "}
                        <ConfidenceChip value={entry.confidence} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="faint" style={{ margin: 0 }}>
                {tx(
                  `{items} ${
                    inboxOpenCount(inbox) === 1 ? 'item' : 'items'
                  } awaiting review · {observations} ${
                    observations.length === 1 ? 'observation' : 'observations'
                  } · {beliefs} ${beliefs.length === 1 ? 'belief' : 'beliefs'}`,
                  '{items} 项待复查 · {observations} 条观察 · {beliefs} 条认知',
                  {
                    items: inboxOpenCount(inbox),
                    observations: observations.length,
                    beliefs: beliefs.length,
                  },
                )}
              </p>
            </>
          ) : null}

          <div className="row column-foot">
            <Link className="button button--quiet button--small" to="/evidence">
              Evidence
            </Link>
            <Link className="button button--quiet button--small" to="/model">
              Model
            </Link>
          </div>
        </section>
      </div>

      {/* `RelevantLearning` renders nothing when there is nothing to show, so
          the card around it has to be asked the same question — otherwise an
          empty card sits on the dashboard. */}
      {reminderThoughtId && reminders.length > 0 ? (
        <section className="card">
          <RelevantLearning thoughtId={reminderThoughtId} />
        </section>
      ) : null}

      <section className="card stack">
        <h2>What has helped before?</h2>
        <p className="faint">
          Describe your situation and Clarity Map will surface any matching rules you wrote.
        </p>
        <div className="field">
          <label htmlFor="dashboard-situation">Where are you right now?</label>
          <input
            id="dashboard-situation"
            className="input"
            value={situation}
            placeholder="Low energy, deciding for too long"
            onChange={(event) => setSituation(event.target.value)}
          />
        </div>
        {situation.trim() === "" ? null : matchingRules.length === 0 ? (
          <p className="faint">Nothing you have recorded matches that yet.</p>
        ) : (
          <ul className="stack" style={{ gap: "var(--space-2)" }}>
            {matchingRules.map((rule) => (
              <li key={rule.id}>
                <strong>{rule.name}</strong>
                <p style={{ margin: 0 }}>{rule.defaultResponse}</p>
                <p className="faint" style={{ margin: 0 }}>
                  When {rule.triggerDescription}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DashboardList({
  title,
  items,
  empty,
  onSelect,
}: {
  title: string;
  items: Array<{ id: string; text: string }>;
  empty: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="stack" style={{ gap: "var(--space-1)" }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      {items.length === 0 ? (
        <p className="faint" style={{ margin: 0 }}>
          {empty}
        </p>
      ) : (
        <ul className="dashboard-list">
          {items.map((item) =>
            onSelect ? (
              <li key={item.id}>
                <button
                  type="button"
                  className="dashboard-list__button"
                  onClick={() => onSelect(item.id)}
                >
                  <span>{item.text}</span>
                  <span className="dashboard-list__arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              </li>
            ) : (
              <li key={item.id} className="dashboard-list__item">
                {item.text}
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
