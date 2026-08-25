import React from 'react'
import { reportError } from '../../lib/reportError'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error) {
    reportError(error, { kind: 'react-boundary' })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
          : this.props.fallback
      }
      return (
        <div
          className="w-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-paper dark:bg-[#05080f] rounded-2xl border border-line dark:border-crimson/30 space-y-4 my-4"
          role="alert"
        >
          <div>
            <h3 className="text-2xl font-bold text-navy dark:text-white">This section stopped loading</h3>
            <p className="text-base leading-relaxed text-navy-soft dark:text-white/70 max-w-md mx-auto mt-2">
              No change was confirmed. Try this section again, or reload the Admin workspace if the problem continues.
            </p>
            <p className="mt-3 text-xs font-mono text-navy-soft dark:text-white/60">Error code: UI_SECTION_UNAVAILABLE</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="min-h-11 bg-blue hover:bg-blue-deep text-white font-bold text-sm px-5 py-3 rounded-xl transition-transform duration-150 active:scale-[0.97]"
            >
              Try this section again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="min-h-11 bg-shell hover:bg-shell-deep text-navy dark:bg-white/10 dark:hover:bg-white/20 dark:text-white font-semibold text-sm px-4 py-3 rounded-xl border border-line dark:border-white/10 transition-transform duration-150 active:scale-[0.97]"
            >
              Reload Admin
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
