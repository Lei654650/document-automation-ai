import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Application render error:', error, info)
    try {
      sessionStorage.setItem('da_last_render_error', JSON.stringify({
        message: String(error?.message || error || 'Unknown application error'),
        stack: String(error?.stack || ''),
        componentStack: String(info?.componentStack || ''),
        at: new Date().toISOString(),
      }))
    } catch {
      // Diagnostics are best effort only.
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    const zh = String(document.documentElement.lang || navigator.language || '').startsWith('zh')
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f4f7fb', color: '#15233b', fontFamily: 'Inter, "Microsoft YaHei", sans-serif' }}>
        <section style={{ width: 'min(560px, 100%)', padding: 32, border: '1px solid #dce4f0', borderRadius: 20, background: '#fff', boxShadow: '0 24px 70px rgba(31,45,74,.12)', textAlign: 'center' }}>
          <div style={{ fontSize: 42 }}>⚠️</div>
          <h1 style={{ margin: '12px 0 8px', fontSize: 28 }}>{zh ? '页面加载异常' : 'Page failed to load'}</h1>
          <p style={{ margin: '0 0 22px', color: '#52627a', fontSize: 16, lineHeight: 1.7 }}>{zh ? '系统已阻止整页白屏。请返回工作台重试；已创建的任务不会因此重复扣费。' : 'The application prevented a blank screen. Return to the workspace and retry; an existing task will not be charged twice.'}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => { window.history.replaceState({}, '', window.location.pathname); window.location.reload() }} style={{ border: 0, borderRadius: 12, padding: '12px 20px', background: '#3157ff', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>{zh ? '返回工作台' : 'Return to workspace'}</button>
            <button type="button" onClick={() => window.location.reload()} style={{ border: '1px solid #ccd7e7', borderRadius: 12, padding: '12px 20px', background: '#fff', color: '#2e405f', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>{zh ? '重新加载' : 'Reload'}</button>
          </div>
        </section>
      </main>
    )
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)
