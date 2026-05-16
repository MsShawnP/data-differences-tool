import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-[900px] px-6 py-12">
          <div className="rounded-sm border border-red/30 bg-red/5 p-6">
            <h2 className="font-serif text-lg font-bold text-red">Something went wrong</h2>
            <p className="mt-2 text-sm text-text-secondary">
              {this.state.error.message}
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 rounded-sm bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-hover"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
