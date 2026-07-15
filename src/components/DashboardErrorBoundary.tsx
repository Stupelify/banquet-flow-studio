
import React from 'react';
import Button from '@/components/ui/Button';

type DashboardErrorBoundaryProps = {
  children: React.ReactNode;
};

type DashboardErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export default class DashboardErrorBoundary extends React.Component<
  DashboardErrorBoundaryProps,
  DashboardErrorBoundaryState
> {
  state: DashboardErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): DashboardErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Dashboard render error:', error, info);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="card-padded max-w-md mx-auto my-8 text-center">
          <h1 className="page-title">Something went wrong</h1>
          <p className="page-subtitle mt-2">
            An unexpected error occurred in this screen. Please try again.
          </p>
          {this.state.error?.message ? (
            <p className="text-xs text-[var(--text-4)] mt-2">{this.state.error.message}</p>
          ) : null}
          <div className="form-actions mt-6">
            <Button type="button" onClick={this.handleRetry}>
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
