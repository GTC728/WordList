import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { failed: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <div className="page" style={{ padding: '1.25rem' }}>
        <h1>出了問題</h1>
        <button type="button" className="primary" onClick={() => window.location.reload()}>
          重新整理
        </button>
      </div>
    )
  }
}
