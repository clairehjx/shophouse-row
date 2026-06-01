import { useEffect, useState } from 'react';
import api from './data/api.js';
import Login from './screens/Login.jsx';
import AvatarCreator from './screens/AvatarCreator.jsx';
import Street from './screens/Street.jsx';
import MyShop from './screens/MyShop.jsx';
import VisitShop from './screens/VisitShop.jsx';
import Inbox from './screens/Inbox.jsx';
import Trades from './screens/Trades.jsx';
import Bag from './screens/Bag.jsx';
import TopBar from './components/TopBar.jsx';
import DevSwitcher from './components/DevSwitcher.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import { music } from './audio/soundtrack.js';
import { setCreationsRegistry } from './pixel/items.js';

// Screens with the header/nav shell.
const SHELL = ['street', 'myshop', 'visit', 'inbox', 'trades', 'bag'];

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [player, setPlayer] = useState(null);
  const [visiting, setVisiting] = useState(null);
  const [returnTo, setReturnTo] = useState(null); // shop id to stand outside of on the street
  const [shopCtx, setShopCtx] = useState(null); // the shop you came from when opening a top-bar screen
  const [toast, setToast] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  // Keep the global creation-sprite registry in sync (so creation:<id> renders
  // everywhere). Best-effort: never let it block/break boot (cloud getCreations
  // needs a login token, which doesn't exist before you log in).
  async function syncCreations() {
    try {
      const all = await api.getCreations();
      setCreationsRegistry(Object.fromEntries(all.map((c) => [c.id, c])));
    } catch { /* not logged in yet / offline — ignore */ }
  }

  useEffect(() => {
    (async () => {
      try { await api.ensureSeeded(); } catch { /* ignore */ }
      await syncCreations();
      routeFor(api.getSession());
    })();
  }, []);

  useEffect(() => { syncCreations(); }, [refreshKey]);

  // Browsers block audio until a user gesture — start the cosy loop on first tap.
  useEffect(() => {
    const onGesture = () => music.resumeIfEnabled();
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('keydown', onGesture);
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
  }, []);

  function routeFor(p) {
    setPlayer(p);
    setReturnTo(null); // a fresh login/switch starts in front of your own shop
    if (!p) setScreen('login');
    else if (!p.setupComplete) setScreen('onboard');
    else setScreen('street');
    refresh();
  }

  function note(msg) {
    setToast(msg);
    window.clearTimeout(note._t);
    note._t = window.setTimeout(() => setToast(''), 2600);
  }

  function selectShop(p, mine) {
    if (mine) { setShopCtx({ screen: 'myshop' }); setScreen('myshop'); return; }
    if (!p.shopType) { note(`${p.name}'s shop is opening soon! 🔨`); return; }
    setShopCtx({ screen: 'visit', owner: p });
    setVisiting(p);
    setScreen('visit');
  }

  // Back from a top-bar screen (Bag/Notes/Trades): return to the shop you were in.
  function backFromNav() {
    if (shopCtx?.screen === 'visit' && shopCtx.owner) { setVisiting(shopCtx.owner); setScreen('visit'); }
    else if (shopCtx?.screen === 'myshop') { setScreen('myshop'); }
    else goStreet();
    refresh();
  }
  const navBackLabel = shopCtx?.screen === 'visit'
    ? `← ${shopCtx.owner?.name}'s shop`
    : shopCtx?.screen === 'myshop' ? '← Your shop' : '← Street';

  async function handleDevSwitch(id) {
    routeFor(await api.devSwitch(id));
  }

  async function handleReset() {
    api.resetStore();
    await api.ensureSeeded();
    api.logout();
    routeFor(null);
    note('Data reset.');
  }

  const goStreet = () => { setShopCtx(null); setScreen('street'); refresh(); };

  // Leave the shop you're in and stand outside it on the street. ESC handling
  // lives inside the shop screens (the walk room vs. the setup editor).
  function leaveShop() {
    const id = screen === 'visit' ? visiting?.id : screen === 'myshop' ? player?.id : null;
    if (id) setReturnTo(id);
    goStreet();
  }

  return (
    <div className="h-full flex flex-col">
      {SHELL.includes(screen) && player && (
        <TopBar
          player={player}
          screen={screen}
          refreshKey={refreshKey}
          onNav={(s) => { if (s === 'street') goStreet(); else { setScreen(s); refresh(); } }}
          onEditAvatar={() => setScreen('edit')}
          onLogout={() => { api.logout(); routeFor(null); }}
        />
      )}

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div key={screen} className="screen-in h-full">
        {screen === 'loading' && (
          <div className="h-full flex items-center justify-center pixel-text text-inksoft">Loading…</div>
        )}

        {screen === 'login' && <Login onLoggedIn={routeFor} />}

        {screen === 'onboard' && player && (
          <AvatarCreator player={player} onDone={routeFor} />
        )}

        {screen === 'edit' && player && (
          <AvatarCreator player={player} editMode onDone={(p) => { setPlayer(p); goStreet(); }} />
        )}

        {screen === 'street' && player && (
          <Street session={player} startAtId={returnTo} onSelectShop={selectShop} />
        )}

        {screen === 'myshop' && player && (
          <MyShop player={player} onBack={leaveShop} toast={note} />
        )}

        {screen === 'visit' && visiting && player && (
          <VisitShop owner={visiting} me={player} onBack={leaveShop} toast={note} onChanged={refresh} />
        )}

        {screen === 'inbox' && player && (
          <Inbox player={player} onBack={backFromNav} backLabel={navBackLabel} toast={note} onChanged={refresh} />
        )}

        {screen === 'trades' && player && (
          <Trades player={player} onBack={backFromNav} backLabel={navBackLabel} toast={note} onChanged={refresh} />
        )}

        {screen === 'bag' && player && (
          <Bag player={player} onBack={backFromNav} backLabel={navBackLabel} toast={note} onChanged={refresh} />
        )}
        </div>
      </main>

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 panel px-4 py-2 text-sm text-ink shadow-panel">
          {toast}
        </div>
      )}

      <InstallPrompt />
      {/* Dev-only "Play as…" tool — automatically excluded from production builds. */}
      {import.meta.env.DEV && <DevSwitcher session={player} onSwitch={handleDevSwitch} onReset={handleReset} />}
    </div>
  );
}
