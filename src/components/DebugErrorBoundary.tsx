import React from 'react';

interface DebugErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  info?: React.ErrorInfo;
}

export class DebugErrorBoundary extends React.Component<React.PropsWithChildren, DebugErrorBoundaryState> {
  state: DebugErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): DebugErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console for Lovable logs pickup
    console.error('App crashed:', error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen p-6 flex items-center justify-center">
          <div className="max-w-xl w-full border rounded-lg p-6 bg-background shadow-sm">
            <h1 className="text-lg font-semibold mb-2">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mb-4">The app encountered an error and could not render.</p>
            {this.state.error && (
              <pre className="text-xs whitespace-pre-wrap bg-muted/30 p-3 rounded mb-3 overflow-auto max-h-48">
                {this.state.error.toString()}
              </pre>
            )}
            {this.state.info?.componentStack && (
              <pre className="text-xs whitespace-pre-wrap bg-muted/30 p-3 rounded overflow-auto max-h-48">
                {this.state.info.componentStack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
