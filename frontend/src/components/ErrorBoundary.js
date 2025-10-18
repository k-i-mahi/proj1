import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Error Boundary Caught:', error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // You can also log the error to an error reporting service
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-container">
            <div className="error-icon">💥</div>

            <h1 className="error-title">Oops! Something went wrong</h1>

            <p className="error-message">
              We're sorry for the inconvenience. The application encountered an
              unexpected error.
            </p>

            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="error-details">
                <details>
                  <summary>Error Details (Development Only)</summary>
                  <div className="error-stack">
                    <h3>Error:</h3>
                    <pre>{this.state.error.toString()}</pre>

                    {this.state.errorInfo && (
                      <>
                        <h3>Component Stack:</h3>
                        <pre>{this.state.errorInfo.componentStack}</pre>
                      </>
                    )}
                  </div>
                </details>
              </div>
            )}

            <div className="error-actions">
              <button className="btn btn-primary" onClick={this.handleReload}>
                🔄 Reload Page
              </button>
              <button className="btn btn-secondary" onClick={this.handleGoHome}>
                🏠 Go Home
              </button>
              <button className="btn btn-outline" onClick={this.handleReset}>
                ↻ Try Again
              </button>
            </div>

            <div className="error-help">
              <p>If the problem persists, please contact support:</p>
              <a href="mailto:support@civita.com" className="support-link">
                support@civita.com
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
