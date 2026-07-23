import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-[#05080f] rounded-2xl border border-crimson/30 shadow-2xl space-y-4 my-4">
          <div className="w-14 h-14 rounded-full bg-crimson/20 text-crimson flex items-center justify-center font-bold text-2xl border border-crimson/40">
            ⚠️
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-white">Temporary Component Load Error</h3>
            <p className="text-xs text-white/60 max-w-md mx-auto mt-1">
              A module or data query encountered a minor glitch. Click below to reload this section cleanly.
            </p>
            {this.state.error && (
              <p className="mt-2 text-[11px] font-mono text-crimson-bright bg-crimson/10 px-3 py-1.5 rounded-lg border border-crimson/20 max-w-lg mx-auto truncate">
                {this.state.error.message || String(this.state.error)}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="bg-blue hover:bg-blue-light text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-blue/20 transition-all"
            >
              🔄 Retry Loading Component
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-white/10 transition-all"
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
