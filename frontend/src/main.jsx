import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
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
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#0a0a0f', color: '#e2e8f0',
          flexDirection: 'column', gap: 16, padding: 24, fontFamily: 'sans-serif'
        }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>Erro ao carregar o aplicativo</div>
          <div style={{
            background: '#0f0f1a', border: '1px solid #ef444466', borderRadius: 8,
            padding: 16, maxWidth: 600, fontSize: 13, color: '#ef4444',
            wordBreak: 'break-all', whiteSpace: 'pre-wrap'
          }}>
            {this.state.error.message || String(this.state.error)}
          </div>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{
              background: '#f59e0b', color: '#000', border: 'none',
              borderRadius: 8, padding: '10px 24px', cursor: 'pointer',
              fontWeight: 700, fontSize: 14
            }}>
            Limpar dados e recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
