import type { AccentPreset, ThemeMode } from '../types'

const accents: Record<AccentPreset, { 400: string; 500: string; 600: string; 700: string }> = {
  blue: { 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
  green: { 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
  purple: { 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce' },
}

const dark = {
  surface: '#000000',
  elevated: '#1c1c1e',
  muted: '#2c2c2e',
  textPrimary: '#ffffff',
  textSecondary: '#98989d',
}

const light = {
  surface: '#f2f2f7',
  elevated: '#ffffff',
  muted: '#d1d1d6',
  textPrimary: '#000000',
  textSecondary: '#6c6c70',
}

function resolveMode(theme: ThemeMode): 'dark' | 'light' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return theme
}

export function applyTheme(theme: ThemeMode, accent: AccentPreset): () => void {
  const root = document.documentElement
  const mode = resolveMode(theme)
  const surfaces = mode === 'light' ? light : dark
  const palette = accents[accent]

  root.dataset.theme = mode
  root.style.setProperty('--color-surface', surfaces.surface)
  root.style.setProperty('--color-surface-elevated', surfaces.elevated)
  root.style.setProperty('--color-surface-muted', surfaces.muted)
  root.style.setProperty('--color-text-primary', surfaces.textPrimary)
  root.style.setProperty('--color-text-secondary', surfaces.textSecondary)
  root.style.setProperty('--color-brand-400', palette[400])
  root.style.setProperty('--color-brand-500', palette[500])
  root.style.setProperty('--color-brand-600', palette[600])
  root.style.setProperty('--color-brand-700', palette[700])
  const link = mode === 'light' ? palette[600] : palette[400]
  root.style.setProperty('--color-link', link)
  root.style.setProperty('--color-success', '#22c55e')
  root.style.setProperty('--color-danger', '#ef4444')
  root.style.setProperty('--color-warning', '#f59e0b')
  root.style.setProperty(
    '--color-warning-fg',
    mode === 'light' ? '#92400e' : '#fef3c7',
  )
  root.style.setProperty(
    '--color-warning-bg',
    mode === 'light'
      ? 'color-mix(in srgb, #f59e0b 14%, white)'
      : 'color-mix(in srgb, #f59e0b 12%, transparent)',
  )
  root.style.setProperty(
    '--color-warning-border',
    mode === 'light'
      ? 'color-mix(in srgb, #f59e0b 35%, transparent)'
      : 'color-mix(in srgb, #f59e0b 28%, transparent)',
  )

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', surfaces.surface)

  if (theme !== 'system') return () => undefined
  const media = window.matchMedia('(prefers-color-scheme: light)')
  const onChange = () => applyTheme('system', accent)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export const accentOptions: Array<{ value: AccentPreset; label: string; swatch: string }> = [
  { value: 'green', label: '綠', swatch: '#22c55e' },
  { value: 'blue', label: '藍', swatch: '#3b82f6' },
  { value: 'purple', label: '紫', swatch: '#a855f7' },
]
