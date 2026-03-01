import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', background: '#fef2f2', color: '#991b1b', minHeight: '100vh' }}>
          <h2 style={{ marginBottom: 16 }}>App Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{String(this.state.error)}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, marginTop: 16, color: '#6b7280' }}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

