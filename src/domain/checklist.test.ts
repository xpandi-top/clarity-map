import { describe, expect, it } from 'vitest'
import { buildChecklistMarkdown, collectChecklistItems } from './checklist'
import { makeRelation, makeThought } from '../test/factories'

const goal = makeThought({ text: 'Lose weight', type: 'goal' })
const milestone = makeThought({ text: 'Reach 45kg', type: 'milestone' })
const project = makeThought({ text: 'Build a routine', type: 'project' })
const action = makeThought({ text: 'Book a gym induction', type: 'action' })
const habit = makeThought({ text: 'Walk every day', type: 'habit', status: 'completed' })

const thoughts = [goal, milestone, project, action, habit]
const relations = [
  makeRelation(milestone.id, 'milestoneOf', goal.id),
  makeRelation(project.id, 'serves', milestone.id),
  makeRelation(action.id, 'serves', project.id),
  makeRelation(habit.id, 'serves', goal.id),
]

describe('collecting a checklist', () => {
  it('walks the whole structure beneath the root', () => {
    const items = collectChecklistItems(thoughts, relations, goal.id)
    expect(items.map((item) => item.thought.text)).toEqual([
      'Lose weight',
      'Reach 45kg',
      'Build a routine',
      'Book a gym induction',
      'Walk every day',
    ])
  })

  it('records how deep each thought sits', () => {
    const items = collectChecklistItems(thoughts, relations, goal.id)
    const depths = Object.fromEntries(items.map((item) => [item.thought.text, item.depth]))
    expect(depths).toMatchObject({
      'Lose weight': 0,
      'Reach 45kg': 1,
      'Build a routine': 2,
      'Book a gym induction': 3,
      'Walk every day': 1,
    })
  })

  it('marks completed thoughts as done', () => {
    const items = collectChecklistItems(thoughts, relations, goal.id)
    expect(items.find((item) => item.thought.text === 'Walk every day')?.done).toBe(true)
    expect(items.find((item) => item.thought.text === 'Reach 45kg')?.done).toBe(false)
  })

  it('lists a thought once even when two paths reach it', () => {
    const shared = [...relations, makeRelation(action.id, 'serves', goal.id)]
    const items = collectChecklistItems(thoughts, shared, goal.id)
    const appearances = items.filter((item) => item.thought.id === action.id)
    expect(appearances).toHaveLength(1)
  })
})

describe('checklist markdown', () => {
  it('nests items and ticks the completed ones', () => {
    const markdown = buildChecklistMarkdown(thoughts, relations, goal.id, {
      includeTypes: false,
    })
    expect(markdown).toBe(
      [
        '# Lose weight',
        '',
        '- [ ] Reach 45kg',
        '  - [ ] Build a routine',
        '    - [ ] Book a gym induction',
        '- [x] Walk every day',
        '',
      ].join('\n'),
    )
  })

  it('annotates each item with its type when asked', () => {
    const markdown = buildChecklistMarkdown(thoughts, relations, goal.id)
    expect(markdown).toContain('- [ ] Reach 45kg _(Milestone)_')
    expect(markdown).toContain('_Goal_')
  })

  it('flattens to actions and habits only', () => {
    const markdown = buildChecklistMarkdown(thoughts, relations, goal.id, {
      onlyActionable: true,
      includeTypes: false,
    })
    expect(markdown).toContain('- [ ] Book a gym induction')
    expect(markdown).toContain('- [x] Walk every day')
    expect(markdown).not.toContain('Reach 45kg')
    // Flat, so nothing is indented.
    expect(markdown).not.toContain('  - [')
  })

  it('says so when there is nothing beneath the root', () => {
    const lonely = makeThought({ text: 'Just an idea', type: 'idea' })
    expect(buildChecklistMarkdown([lonely], [], lonely.id)).toContain(
      '_Nothing beneath this thought yet._',
    )
  })

  it('returns nothing when the root is missing', () => {
    expect(buildChecklistMarkdown(thoughts, relations, 'not-a-thought')).toBe('')
  })

  it('keeps multi-line text on one list line', () => {
    const wrapped = makeThought({ text: 'First line\n  second line', type: 'action' })
    const parent = makeThought({ text: 'Parent', type: 'goal' })
    const markdown = buildChecklistMarkdown(
      [parent, wrapped],
      [makeRelation(wrapped.id, 'serves', parent.id)],
      parent.id,
      { includeTypes: false },
    )
    expect(markdown).toContain('- [ ] First line second line')
  })

  it('adds an export note only when a date is supplied', () => {
    expect(buildChecklistMarkdown(thoughts, relations, goal.id)).not.toContain('Exported from')
    expect(
      buildChecklistMarkdown(thoughts, relations, goal.id, { generatedAt: '1 March 2026' }),
    ).toContain('_Exported from Clarity Map on 1 March 2026._')
  })
})
