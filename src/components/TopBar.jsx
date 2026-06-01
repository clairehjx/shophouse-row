import { useEffect, useState } from 'react';
import Avatar from './Avatar.jsx';
import api from '../data/api.js';
import { SHOP_TYPE_MAP } from '../pixel/shophouse.js';
import { music } from '../audio/soundtrack.js';

function NavBtn({ active, onClick, label, badge }) {
  return (
    <button
      onClick={onClick}
      className={`relative cozy-btn-ghost !px-3 !py-2 text-xs ${active ? '!bg-peach !text-paper !border-[#d98a4f]' : ''}`}
    >
      {label}
      {badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-rose text-paper text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

// Header on the main screens: who you are + nav with note/trade badges.
export default function TopBar({ player, screen, onNav, onEditAvatar, onLogout, refreshKey }) {
  const type = SHOP_TYPE_MAP[player.shopType];
  const [counts, setCounts] = useState({ unread: 0, pendingTrades: 0 });
  const [musicOn, setMusicOn] = useState(music.enabled);

  useEffect(() => {
    api.getCounts(player.id).then(setCounts);
  }, [player.id, refreshKey, screen]);

  return (
    <header className="flex flex-wrap items-center gap-2 px-3 py-2 bg-paper/85 border-b-[3px] border-parch backdrop-blur">
      <div className="bg-skyhi rounded-xl border-2 border-parch p-1">
        <Avatar data={player.avatar} scale={2} />
      </div>
      <div className="leading-tight mr-auto">
        <div className="pixel-text text-xs text-ink">{player.name}{player.isAdmin ? ' ★' : ''}</div>
        <div className="text-xs text-inksoft">{type?.emoji} {type?.name}</div>
      </div>
      <NavBtn active={screen === 'street'} onClick={() => onNav('street')} label="🏘 Street" />
      <NavBtn active={screen === 'bag'} onClick={() => onNav('bag')} label="🎒 Bag" />
      <NavBtn active={screen === 'inbox'} onClick={() => onNav('inbox')} label="💌 Notes" badge={counts.unread} />
      <NavBtn active={screen === 'trades'} onClick={() => onNav('trades')} label="🔄 Trades" badge={counts.pendingTrades} />
      <button onClick={() => setMusicOn(music.toggle())} title="Music" className="cozy-btn-ghost !px-3 !py-2 text-xs">
        {musicOn ? '🔊' : '🔈'}
      </button>
      <button onClick={onEditAvatar} className="cozy-btn-ghost !px-3 !py-2 text-xs">Edit look</button>
      <button onClick={onLogout} className="cozy-btn-ghost !px-3 !py-2 text-xs">Log out</button>
    </header>
  );
}
