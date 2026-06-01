import { useEffect, useState } from 'react';
import api from '../data/api.js';

// DEV-ONLY helper: instantly "Play as…" any player in one browser so trading,
// notes, and visiting can be tested solo. Remove (or gate behind admin) for the
// real cloud build. Floats in the bottom-right corner.
export default function DevSwitcher({ session, onSwitch, onReset }) {
  const [open, setOpen] = useState(false);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    api.listPlayers().then(setPlayers);
  }, [session]);

  return (
    <div className="fixed bottom-3 right-3 z-50 text-sm">
      {open && (
        <div className="panel p-3 mb-2 w-56 max-h-80 overflow-y-auto">
          <div className="pixel-text text-[10px] text-inksoft mb-2">Play as… (dev)</div>
          <div className="grid grid-cols-2 gap-1">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => { onSwitch(p.id); setOpen(false); }}
                className={`text-xs rounded-lg px-2 py-1 border-2 text-left truncate ${
                  session?.id === p.id ? 'bg-peach border-[#d98a4f] text-paper' : 'bg-cream border-parch text-inksoft hover:bg-paper'
                }`}
              >
                {p.name}{p.setupComplete ? '' : ' ·new'}
              </button>
            ))}
          </div>
          <button
            onClick={onReset}
            className="mt-2 w-full text-xs rounded-lg px-2 py-1 border-2 border-rose text-rose hover:bg-rose hover:text-paper transition"
          >
            ↺ Reset all data
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="pixel-text text-[10px] bg-ink text-paper rounded-full px-3 py-2 shadow-cozy"
      >
        🛠 dev
      </button>
    </div>
  );
}
