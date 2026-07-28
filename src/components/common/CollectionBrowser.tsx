import { t, tx } from '../../i18n/core'

export type CollectionViewMode = 'list' | 'focus'

export function CollectionBrowser({
  mode,
  onModeChange,
  index,
  total,
  itemLabel,
  onPrevious,
  onNext,
}: {
  mode: CollectionViewMode
  onModeChange: (mode: CollectionViewMode) => void
  index: number
  total: number
  itemLabel: string
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div
      className="collection-browser"
      aria-label={tx('{item} view', '{item}视图', { item: t(itemLabel) })}
    >
      <div className="collection-browser__modes" role="group" aria-label="Display">
        <span className="collection-browser__label">View</span>
        <button
          type="button"
          className="button button--small"
          aria-pressed={mode === 'list'}
          onClick={() => onModeChange('list')}
        >
          List
        </button>
        <button
          type="button"
          className="button button--small"
          aria-pressed={mode === 'focus'}
          onClick={() => onModeChange('focus')}
        >
          One at a time
        </button>
      </div>

      {mode === 'focus' && total > 0 ? (
        <div className="collection-browser__pager">
          <button
            type="button"
            className="button button--small collection-browser__arrow"
            aria-label={tx('Previous {item}', '上一个{item}', { item: t(itemLabel) })}
            aria-keyshortcuts="ArrowLeft"
            disabled={index === 0}
            onClick={onPrevious}
          >
            <span aria-hidden="true">←</span>
          </button>
          <span className="collection-browser__position" role="status" aria-live="polite">
            {tx('{current} of {total}', '{current} / {total}', {
              current: index + 1,
              total,
            })}
          </span>
          <button
            type="button"
            className="button button--small collection-browser__arrow"
            aria-label={tx('Next {item}', '下一个{item}', { item: t(itemLabel) })}
            aria-keyshortcuts="ArrowRight"
            disabled={index >= total - 1}
            onClick={onNext}
          >
            <span aria-hidden="true">→</span>
          </button>
          <span className="collection-browser__hint">
            Use <kbd>←</kbd> <kbd>→</kbd> to browse
          </span>
        </div>
      ) : null}
    </div>
  )
}
