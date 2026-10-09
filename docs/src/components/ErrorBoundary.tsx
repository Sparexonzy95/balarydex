import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in docs application:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full rounded-[8px] border border-red-500/20 bg-[#121212] p-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold text-xl">
              !
            </div>
            <h1 className="text-xl font-bold font-display">Something went wrong</h1>
            <p className="text-sm text-ash">
              {this.state.error?.message || 'An unexpected error occurred while loading documentation.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center px-4 py-2 rounded-[6px] bg-white text-black font-medium text-sm hover:bg-white/90 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
