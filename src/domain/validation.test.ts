import { describe, expect, it } from 'vitest'
import { createExampleWorkspace } from './example'
import { buildExport, buildImportPreview, reassignIds, serializeExport } from './importExport'
import { SCHEMA_VERSION } from './schema'
import { validateImport } from './validation'

const example = createExampleWorkspace()

describe('import validation', () => {
  it('accepts a file this app produced', () => {
    const result = validateImport(serializeExport([example]))
    expect(result.ok).toBe(true)
    expect(result.value?.data.workspaces[0].thoughts).toHaveLength(example.thoughts.length)
  })

  it('rejects text that is not JSON', () => {
    const result = validateImport('not json at all')
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toContain('not valid JSON')
    expect(result.value).toBeUndefined()
  })

  it('rejects a file from another application', () => {
    const result = validateImport(
      JSON.stringify({ app: 'something-else', schemaVersion: 1, data: { workspaces: [] } }),
    )
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('not exported from Clarity Map')
  })

  it('rejects a schema version newer than this app understands', () => {
    const envelope = buildExport([example])
    const result = validateImport(
      JSON.stringify({ ...envelope, schemaVersion: SCHEMA_VERSION + 5 }),
    )
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('newer than this app')
  })

  it('rejects a workspace with no dimensions instead of importing a broken one', () => {
    const result = validateImport(
      JSON.stringify(buildExport([{ ...example, dimensions: [] }])),
    )
    expect(result.ok).toBe(false)
    expect(result.value).toBeUndefined()
  })

  it('drops relationships that point at thoughts the file does not contain', () => {
    const broken = {
      ...example,
      relations: [
        ...example.relations,
        {
          id: 'rel_dangling',
          workspaceId: example.workspace.id,
          sourceThoughtId: 'missing-a',
          targetThoughtId: 'missing-b',
          type: 'serves' as const,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    }
    const result = validateImport(JSON.stringify(buildExport([broken])))
    expect(result.ok).toBe(true)
    expect(result.value?.data.workspaces[0].relations).toHaveLength(example.relations.length)
  })

  it('describes what an import would bring in', () => {
    const envelope = buildExport([example])
    const preview = buildImportPreview(envelope, [example.workspace.id])
    expect(preview.totalThoughts).toBe(example.thoughts.length)
    expect(preview.workspaces[0].conflicts).toBe(true)
    expect(buildImportPreview(envelope, []).workspaces[0].conflicts).toBe(false)
  })
})

describe('id reassignment', () => {
  it('rewrites ids while keeping relationships pointing at the same thoughts', () => {
    const copy = reassignIds(example)
    expect(copy.workspace.id).not.toBe(example.workspace.id)

    const originalPairs = example.relations.map((relation) => {
      const source = example.thoughts.find((t) => t.id === relation.sourceThoughtId)?.text
      const target = example.thoughts.find((t) => t.id === relation.targetThoughtId)?.text
      return `${source}|${relation.type}|${target}`
    })
    const copiedPairs = copy.relations.map((relation) => {
      const source = copy.thoughts.find((t) => t.id === relation.sourceThoughtId)?.text
      const target = copy.thoughts.find((t) => t.id === relation.targetThoughtId)?.text
      return `${source}|${relation.type}|${target}`
    })

    expect(copiedPairs).toEqual(originalPairs)
    expect(copy.thoughts.every((thought) => thought.workspaceId === copy.workspace.id)).toBe(true)
  })
})
