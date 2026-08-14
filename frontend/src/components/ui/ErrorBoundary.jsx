import { Component } from 'react';
import '../../styles/ErrorBoundary.css';

export class ErrorBoundary extends Component {
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
          <h2>Đã xảy ra lỗi</h2>
          <p className="error-boundary-message">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="error-boundary-btn"
          >
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
