import { useProgress } from '../lib/ProgressContext'

export function StarButton({
  blockIds,
}: {
  blockIds: string[]
}) {
  const { progress, toggleStars } = useProgress()
  const ids = blockIds.filter(Boolean)
  if (ids.length === 0) return null
  const on = ids.every((id) => Boolean(progress.stars?.[id]))

  return (
    <button
      type="button"
      className={`star-btn ${on ? 'is-on' : ''}`}
      aria-pressed={on}
      aria-label={on ? '取消標記' : '標記此題'}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        toggleStars(ids)
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 3.6 14.5 9l6 .5-4.6 3.9 1.4 5.8L12 16.8 6.7 19.2l1.4-5.8L3.5 9.5l6-.5L12 3.6Z"
          fill={on ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
