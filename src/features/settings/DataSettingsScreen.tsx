import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmButton } from '../../components/common/ConfirmButton'
import {
  buildImportPreview,
  serializeExport,
  type ImportPreview,
} from '../../domain/importExport'
import { validateImport } from '../../domain/validation'
import type { ExportEnvelope } from '../../domain/types'
import { useCurrentWorkspace, useStore } from '../../store'
import { formatDate, tx } from '../../i18n/core'

function download(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function safeFilename(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace'
}

export function DataSettingsScreen() {
  const workspace = useCurrentWorkspace()
  const workspaces = useStore((state) => state.workspaces)
  const exportWorkspaceData = useStore((state) => state.exportWorkspaceData)
  const exportAllData = useStore((state) => state.exportAllData)
  const importEnvelope = useStore((state) => state.importEnvelope)
  const startWorkspace = useStore((state) => state.startWorkspace)
  const duplicateWorkspace = useStore((state) => state.duplicateWorkspace)
  const clearWorkspace = useStore((state) => state.clearWorkspace)
  const deleteWorkspace = useStore((state) => state.deleteWorkspace)
  const clearAllData = useStore((state) => state.clearAllData)
  const renameWorkspace = useStore((state) => state.renameWorkspace)
  const showToast = useStore((state) => state.showToast)

  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ envelope: ExportEnvelope; preview: ImportPreview } | null>(
    null,
  )
  const [errors, setErrors] = useState<string[]>([])

  const handleFile = async (file: File) => {
    setErrors([])
    setPending(null)
    const result = validateImport(await file.text())
    if (!result.ok || !result.value) {
      setErrors(result.errors)
      return
    }
    setPending({
      envelope: result.value,
      preview: buildImportPreview(
        result.value,
        workspaces.map((entry) => entry.id),
      ),
    })
  }

  const runImport = (mode: 'merge' | 'replace') => {
    if (!pending) return
    const count = importEnvelope(pending.envelope, mode)
    setPending(null)
    showToast(
      tx(
        count === 1 ? 'Imported {count} workspace.' : 'Imported {count} workspaces.',
        '已导入 {count} 个工作区。',
        { count },
      ),
    )
  }

  return (
    <div className="stack">
      <div className="screen-header">
        <h1>Data</h1>
        <p>Everything here happens on this device.</p>
      </div>

      <div className="notice">
        By default, your data is stored only in this browser. Clearing browser data may remove
        your workspace. Export a backup if the information is important.
      </div>

      <section className="card stack">
        <h2>Current workspace</h2>
        {workspace ? (
          <>
            <div className="field">
              <label htmlFor="workspace-name">Name</label>
              <input
                id="workspace-name"
                className="input"
                value={workspace.name}
                onChange={(event) => renameWorkspace(workspace.id, event.target.value)}
              />
            </div>
            <div className="row">
              <button
                type="button"
                className="button"
                onClick={() => {
                  const data = exportWorkspaceData(workspace.id)
                  if (!data) return
                  download(`clarity-map-${safeFilename(workspace.name)}.json`, serializeExport([data]))
                  showToast('Workspace exported.')
                }}
              >
                Export this workspace
              </button>
              <button
                type="button"
                className="button"
                onClick={() => {
                  duplicateWorkspace(workspace.id)
                  showToast('Workspace duplicated.')
                }}
              >
                Duplicate workspace
              </button>
              <ConfirmButton
                label="Clear this workspace's thoughts and records"
                confirmLabel="Confirm clear"
                onConfirm={() => {
                  clearWorkspace(workspace.id)
                  showToast('Workspace cleared.')
                }}
              />
            </div>
          </>
        ) : (
          <p className="muted">
            No workspace is open. <Link to="/welcome">Start one from the welcome screen.</Link>
          </p>
        )}
      </section>

      <section className="card stack">
        <h2>All workspaces</h2>
        <ul className="settings-list">
          {workspaces.map((entry) => (
            <li key={entry.id} className="settings-item spread">
              <span>
                {entry.name}
                <span className="faint">
                  {' '}
                  · created {formatDate(entry.createdAt)}
                </span>
              </span>
              <ConfirmButton
                label="Delete"
                confirmLabel="Confirm delete"
                className="button button--danger button--small"
                onConfirm={() => {
                  deleteWorkspace(entry.id)
                  showToast('Workspace deleted.')
                }}
              />
            </li>
          ))}
        </ul>
        <div className="row">
          <button
            type="button"
            className="button"
            onClick={() => {
              startWorkspace()
              showToast('Workspace created.')
            }}
          >
            Create a workspace
          </button>
          <button
            type="button"
            className="button"
            disabled={workspaces.length === 0}
            onClick={() => {
              download('clarity-map-all-workspaces.json', serializeExport(exportAllData()))
              showToast('All workspaces exported.')
            }}
          >
            Export all workspaces
          </button>
        </div>
      </section>

      <section className="card stack">
        <h2>Import</h2>
        <button type="button" className="button" onClick={() => fileInput.current?.click()}>
          Choose a file
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          aria-label="Workspace file to import"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleFile(file)
            event.target.value = ''
          }}
        />

        {errors.length > 0 ? (
          <div className="notice notice--danger" role="alert">
            <p>That file could not be imported. Nothing on this device was changed.</p>
            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {pending ? (
          <div className="notice stack">
            <h3 style={{ margin: 0 }}>Preview</h3>
            <ul>
              {pending.preview.workspaces.map((entry) => (
                <li key={entry.name}>
                  {entry.name}: {entry.thoughts} thoughts, {entry.relations} relationships,{' '}
                  {entry.comparisons} comparisons, {entry.rules} rules,{' '}
                  {entry.learningRecords} learning records
                  {entry.conflicts ? ' — a workspace with this id already exists, so a copy will be made' : ''}
                </li>
              ))}
            </ul>
            <div className="row">
              <button
                type="button"
                className="button button--primary"
                onClick={() => runImport('merge')}
              >
                Merge into this device
              </button>
              <ConfirmButton
                label="Replace everything"
                confirmLabel="Confirm replace"
                onConfirm={() => runImport('replace')}
              />
              <button
                type="button"
                className="button button--quiet"
                onClick={() => setPending(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="card stack">
        <h2>Danger zone</h2>
        <p className="muted">
          This removes every workspace stored in this browser. Export a backup first if you might
          want it later.
        </p>
        <ConfirmButton
          label="Clear all local data"
          confirmLabel="Confirm — delete everything"
          onConfirm={() => {
            clearAllData()
            showToast('All local data cleared.')
          }}
        />
      </section>

      <p className="faint">
        Other settings: <Link to="/settings/dimensions">Dimensions</Link> ·{' '}
        <Link to="/settings/rules">Rules</Link>
      </p>
    </div>
  )
}
