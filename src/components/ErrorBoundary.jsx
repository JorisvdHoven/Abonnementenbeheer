import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-slate-900/90 border border-white/10 shadow-2xl rounded-[2rem] p-8 backdrop-blur-xl text-center">
          <div className="mx-auto h-14 w-14 rounded-3xl bg-red-500/20 flex items-center justify-center text-red-400 text-2xl font-bold">
            !
          </div>
          <h2 className="mt-6 text-2xl font-semibold text-white">Er ging iets mis</h2>
          <p className="mt-3 text-sm text-slate-300">
            De app is op een onverwachte fout gestuit. Probeer de pagina te verversen.
          </p>
          {this.state.error?.message && (
            <pre className="mt-4 text-left text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3 overflow-x-auto">
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-6 flex gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="rounded-2xl border border-slate-600 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition"
            >
              Opnieuw proberen
            </button>
            <button
              onClick={this.handleReload}
              className="rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
            >
              Pagina verversen
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
