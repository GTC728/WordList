import type { ReactNode } from 'react'
import { courseMeta } from '../data/meta'

export function Fold({
  label,
  children,
}: {
  label: ReactNode
  children: ReactNode
}) {
  return (
    <details className="fold">
      <summary>{label}</summary>
      <div className="fold-body">{children}</div>
    </details>
  )
}

export function SourceFold() {
  return (
    <Fold label="來源">
      <p>{courseMeta.attribution}</p>
    </Fold>
  )
}
