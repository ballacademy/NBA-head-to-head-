import { Component, type ErrorInfo, type ReactNode } from "react";
import { buildBugReportMailto } from "../lib/support";
import { reportAppError } from "../lib/appErrors";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportAppError(error.message || "Unexpected render error", "react");
    console.error("Draft Day GM render error", error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const details = `${this.state.error.name}: ${this.state.error.message}`;

    return (
      <main className="landing-layout">
        <section className="landing panel landing--rich app-error-screen">
          <p className="eyebrow">Beta error</p>
          <h1>Something broke</h1>
          <p className="landing__lede">
            Refresh and try again. If it keeps happening, email us a quick bug
            report — it helps a lot during beta.
          </p>
          <div className="app-error-screen__actions">
            <button
              type="button"
              className="primary-button"
              onClick={this.handleReload}
            >
              Refresh
            </button>
            <a
              className="secondary-button"
              href={buildBugReportMailto(details)}
            >
              Email bug report
            </a>
          </div>
        </section>
      </main>
    );
  }
}
