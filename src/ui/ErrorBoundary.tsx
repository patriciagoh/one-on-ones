import { Component, type ReactNode } from "react";
import { captureError } from "../observability/sentry";

interface Props { children: ReactNode }
interface State { crashed: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false };

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  componentDidCatch(error: unknown): void {
    captureError(error, { boundary: "app" });
  }

  render(): ReactNode {
    if (!this.state.crashed) return this.props.children;
    return (
      <main className="min-h-screen grid place-items-center bg-paper text-ink font-sans">
        <div className="text-center">
          <p>Something went wrong.</p>
          <button
            type="button"
            onClick={() => location.reload()}
            className="mt-3 px-4 py-2 rounded-md bg-matcha-deep text-paper font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2"
          >
            Reload
          </button>
        </div>
      </main>
    );
  }
}
