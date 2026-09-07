import { useState, type FormEvent } from 'react'

export function SpellForm({
  disabled,
  onSubmit,
}: {
  disabled: boolean
  onSubmit: (value: string) => void
}) {
  const [value, setValue] = useState('')

  function send(event: FormEvent) {
    event.preventDefault()
    if (disabled) return
    const next = value.trim()
    if (!next) return
    onSubmit(next)
  }

  return (
    <form className="spell-form" onSubmit={send}>
      <input
        className="spell-input"
        value={value}
        disabled={disabled}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        lang="en"
        enterKeyHint="done"
        placeholder="打出英文拼法"
        aria-label="英文拼法"
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit" className="primary" disabled={disabled || value.trim() === ''}>
        送出
      </button>
    </form>
  )
}
