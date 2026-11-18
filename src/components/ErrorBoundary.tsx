import { Component, type ReactNode } from 'react';

/** Keeps one broken screen from blanking the whole site. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('[바로담] 화면 오류', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="wrap" style={{ padding: '80px 16px', textAlign: 'center' }}>
        <h1 className="ptitle">일시적인 오류가 생겼어요</h1>
        <p className="hint">잠시 후 다시 시도해 주세요. 문제가 계속되면 고객센터로 알려 주세요.</p>
        <p style={{ marginTop: 16 }}>
          <a className="btn primary" style={{ display: 'inline-block', textDecoration: 'none' }} href="/">홈으로</a>
        </p>
      </main>
    );
  }
}
