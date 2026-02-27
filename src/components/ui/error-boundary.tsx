import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
    children?: ReactNode
    fallbackText?: string
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    }

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-6 my-4 bg-red-500/5 border border-red-500/20 rounded-xl text-center">
                    <AlertTriangle className="h-8 w-8 text-red-500/80 mb-3" />
                    <h3 className="text-sm font-semibold text-red-500/90 mb-1">
                        {this.props.fallbackText || 'UI Rendering Error'}
                    </h3>
                    <p className="text-xs text-red-500/70 max-w-sm">
                        This specific visualization block failed to load, but the rest of the chat is intact.
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="mt-4 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500/90 text-xs font-medium rounded-md transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}
