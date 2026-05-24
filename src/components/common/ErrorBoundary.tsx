import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Koi Monitor render error:', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--background)] px-6 text-center"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-lg font-semibold text-[var(--foreground)]">
            Une erreur a interrompu l&apos;interface
          </p>
          <p className="max-w-md text-sm text-[var(--text-muted)]">
            Rechargez l&apos;application pour reprendre le monitoring.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="rounded-2xl bg-[var(--neon-pink)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Recharger
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
