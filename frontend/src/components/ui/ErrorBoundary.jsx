import { Component } from 'react';
import { withTranslation } from 'react-i18next';
import '../../styles/ErrorBoundary.css';

class ErrorBoundaryBase extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="error-boundary">
          <h2>{this.props.t('common.error')}</h2>
          <p className="error-boundary-message">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="error-boundary-btn"
          >
            {this.props.t('common.reload_page')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryBase);
