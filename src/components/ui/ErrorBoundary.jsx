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

  componentDidCatch(error, errorInfo) {
    reportError(error, { kind: 'react.ErrorBoundary', componentStack: errorInfo?.componentStack?.slice(0, 2000) })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-paper dark:bg-[#05080f] rounded-2xl border border-line dark:border-crimson/30 shadow-card space-y-4 my-4">
          <div className="w-14 h-14 rounded-full bg-crimson/15 text-crimson flex items-center justify-center text-2xl border border-crimson/30">
            ⚠️
          </div>
          <div>
            <h3 className="font-serif text-2xl font-bold text-navy dark:text-white">Temporary Component Load Error</h3>
            <p className="text-sm text-navy-soft dark:text-white/60 max-w-md mx-auto mt-1.5">
              A module or data query encountered a minor glitch. Click below to reload this section cleanly.
            </p>
            {this.state.error && (
              <p className="mt-2 text-[11px] font-mono text-crimson bg-crimson/10 px-3 py-1.5 rounded-lg border border-crimson/20 max-w-lg mx-auto truncate">
                {this.state.error.message || String(this.state.error)}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="bg-blue hover:bg-blue-deep text-white font-bold text-sm px-5 py-3 rounded-xl shadow-md transition-all active:scale-95"
            >
              🔄 Retry Loading Component
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-shell hover:bg-shell-deep text-navy dark:bg-white/10 dark:hover:bg-white/20 dark:text-white font-semibold text-sm px-4 py-3 rounded-xl border border-line dark:border-white/10 transition-all active:scale-95"
            >
              🌐 Reload Webpage
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
