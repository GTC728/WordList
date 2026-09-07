import { Link } from 'react-router-dom'
import { speak } from '../lib/speech'
import { Icon } from './Icon'

export function SpeakButton({
  text,
  enabled,
  label = '發音',
}: {
  text: string
  enabled: boolean
  label?: string
}) {
  if (!enabled || !text) return null
  return (
    <button type="button" className="speak ui-pressable" onClick={() => speak(text, true)} aria-label={label}>
      <Icon name="speaker" />
    </button>
  )
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link className="back ui-pressable" to={to} aria-label={label}>
      <Icon name="chevronLeft" />
    </Link>
  )
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}
