import { Component, type ErrorInfo, type ReactNode } from 'react';
import { subscribeFaults } from '../core/faults';
import { readPreference } from '../core/storage';
import { LOCALE_KEY, resolveLocale, translate } from '../locales/catalog';
import { MoonMark } from './NapArt';

export class GameErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; generation: number }> {
  state = { failed: false, generation: 0 };
  private unsubscribe = () => {};
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[little pause] UI recovery', error, info.componentStack); }
  private fail = (error: unknown) => { console.error('[little pause] Runtime recovery', error); this.setState({ failed: true }); };
  private onError = (event: ErrorEvent) => { if (event.error) this.fail(event.error); };
  private onRejection = (event: PromiseRejectionEvent) => { this.fail(event.reason); };

  componentDidMount() {
    this.unsubscribe = subscribeFaults(this.fail);
    window.addEventListener('error', this.onError);
    window.addEventListener('unhandledrejection', this.onRejection);
  }
  componentWillUnmount() {
    this.unsubscribe();
    window.removeEventListener('error', this.onError);
    window.removeEventListener('unhandledrejection', this.onRejection);
  }
  render() {
    if (!this.state.failed) return <div className="game-boundary" key={this.state.generation}>{this.props.children}</div>;
    const locale = resolveLocale(document.documentElement.dataset.gameLocale || readPreference(LOCALE_KEY) || navigator.language);
    return <div className="recovery-screen" role="alert" lang={locale}>
      <MoonMark /><h1>{translate(locale, 'error.title')}</h1><p>{translate(locale, 'error.body')}</p>
      <button className="primary-button" onClick={() => this.setState((state) => ({ failed: false, generation: state.generation + 1 }))}>{translate(locale, 'error.restart')}</button>
      <button className="text-button" onClick={() => location.reload()}>{translate(locale, 'error.reload')}</button>
    </div>;
  }
}