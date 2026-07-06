import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Catches render errors so a single failing page doesn't white-screen the app. */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-6">
          <div className="max-w-md w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 mb-4">
              <i className="fas fa-triangle-exclamation" aria-hidden="true"></i>
            </div>
            <h1 className="text-lg font-black text-white">Something went wrong</h1>
            <p className="text-[13px] text-slate-400 font-semibold mt-2">
              The page hit an unexpected error. Your trades and balance are safe.
            </p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = "/"; }}
              className="mt-5 h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-extrabold transition-all"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
