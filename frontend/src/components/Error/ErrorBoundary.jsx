// ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Error in child component:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return <h4>Something went wrong with the Events tab.</h4>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
