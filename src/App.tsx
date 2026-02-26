import { useEffect } from 'react';
import { SearchPanel } from './components/SearchPanel';
import { QueuePanel } from './components/QueuePanel';
import { useAudio } from './hooks/useAudio';
import { usePlayerStore } from './store/playerStore';

export function App() {
  const init = usePlayerStore((s) => s.init);
  const error = usePlayerStore((s) => s.error);

  useEffect(() => {
    const cleanup = init();
    return cleanup;
  }, [init]);

  useAudio();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Maestro</h1>
      </header>
      {error && <div className="error-banner">{error}</div>}
      <main className="columns">
        <SearchPanel />
        <QueuePanel />
      </main>
    </div>
  );
}
