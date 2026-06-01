import { useEffect, useState } from 'react';

// Cozy "Add to Home Screen" chip. Appears when the browser offers installation
// (Chrome/Android/desktop). Self-hides once installed or dismissed.
export default function InstallPrompt() {
  const [evt, setEvt] = useState(null);

  useEffect(() => {
    const onBIP = (e) => { e.preventDefault(); setEvt(e); };
    const onInstalled = () => setEvt(null);
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!evt) return null;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1">
      <button
        onClick={async () => { evt.prompt(); await evt.userChoice; setEvt(null); }}
        className="pixel-text text-[11px] bg-peach text-paper border-[3px] border-[#d98a4f] rounded-full px-4 py-2 shadow-cozy"
      >
        📲 Add to Home Screen
      </button>
      <button onClick={() => setEvt(null)} aria-label="Dismiss"
        className="pixel-text text-[11px] bg-paper text-inksoft border-2 border-parch rounded-full w-7 h-7">✕</button>
    </div>
  );
}
