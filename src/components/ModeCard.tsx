import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from './Icon'
import { ProgressBar } from './ui'

const TONE: Partial<Record<IconName, string>> = {
  x: 'wrong',
  star: 'star',
  clock: 'clock',
}

export function ModeCard({
  to,
  icon,
  title,
  stat,
  badge,
  label,
}: {
  to: string
  icon: IconName
  title: string
  stat?: string
  badge?: number
  label?: string
}) {
  const tone = TONE[icon]
  return (
    <Link className="mode-card ui-pressable" to={to} aria-label={label ?? (stat ? `${title} ${stat}` : title)}>
      <span className={`mode-art${tone ? ` mode-art--${tone}` : ''}`} aria-hidden>
        <Icon name={icon} />
        {badge ? <span className="mode-badge">{badge}</span> : null}
      </span>
      <span className="mode-card-text">
        <strong>{title}</strong>
        {stat ? <span className="mode-stat">{stat}</span> : null}
      </span>
      <Icon name="chevronRight" className="mode-card-chevron" />
    </Link>
  )
}

export function NumRow({
  n,
  to,
  value,
  max,
  trailing,
  label,
}: {
  n: number | string
  to?: string
  value?: number
  max?: number
  trailing?: ReactNode
  label?: string
}) {
  const inner = (
    <>
      <span className="row-num">{n}</span>
      {max != null && value != null ? <ProgressBar value={value} max={max} /> : <span className="num-row-fill" />}
      {max != null && value != null ? (
        <span className="progress-row-count">
          {value}/{max}
        </span>
      ) : null}
      {trailing}
    </>
  )
  if (to) {
    return (
      <Link className="num-row ui-pressable" to={to} aria-label={label ?? String(n)}>
        {inner}
      </Link>
    )
  }
  return <div className="num-row">{inner}</div>
}

export function IconLink({
  to,
  icon,
  label,
  muted,
}: {
  to: string
  icon: IconName
  label: string
  muted?: boolean
}) {
  return (
    <Link className={`icon-hit ui-pressable${muted ? ' is-muted' : ''}`} to={to} aria-label={label}>
      <Icon name={icon} />
    </Link>
  )
}

export function IconButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: IconName
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button type="button" className="icon-hit ui-pressable" aria-label={label} onClick={onClick} disabled={disabled}>
      <Icon name={icon} />
    </button>
  )
}

export function ArtBlock({ icon }: { icon: IconName }) {
  return (
    <div className="hero-art" aria-hidden>
      <Icon name={icon} />
    </div>
  )
}
