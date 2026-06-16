import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, info: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    this.props.onError?.(error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
              <AlertTriangle size={28} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-200 mb-1">Something went wrong</h3>
              <p className="text-xs text-neutral-500 mb-2">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <details className="text-[10px] text-neutral-600 max-h-32 overflow-auto bg-[#0B1019] rounded-lg p-2 border border-[#152233]">
                <summary className="cursor-pointer">Stack trace</summary>
                <pre className="mt-1 whitespace-pre-wrap">{this.state.error?.stack}</pre>
              </details>
            </div>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/15 text-blue-400 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw size={12} />
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
