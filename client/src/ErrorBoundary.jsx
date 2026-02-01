import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ error, info })
    // also log to console for developer
    console.error('Uncaught render error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24 }}>
          <h1 style={{ color: 'crimson' }}>Application Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error && this.state.error.toString())}</pre>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
            {this.state.info && this.state.info.componentStack}
          </details>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
