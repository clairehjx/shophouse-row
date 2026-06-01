import { useEffect, useState } from 'react';
import Avatar from '../components/Avatar.jsx';
import api from '../data/api.js';
import {
  SKIN_TONES, HAIR_COLORS, HAIR_STYLES, OUTFITS, ACCESSORIES,
  OUTFIT_COLORS, ACCESSORY_COLORS, DEFAULT_AVATAR, randomAvatar,
} from '../pixel/avatar.js';
import { SHOP_TYPES } from '../pixel/shophouse.js';

const ACCESSORY_LABELS = { none: 'None', bow: 'Bow', hat: 'Hat' };
const HAIR_LABELS = {
  short: 'Short', bob: 'Bob', long: 'Long', ponytail: 'Ponytail',
  twintails: 'Twin tails', bun: 'Bun', curly: 'Curly', buzz: 'Buzz',
};

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <h3 className="pixel-text text-xs text-inksoft mb-2">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Swatch({ color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded-full border-[3px] transition ${active ? 'border-ink scale-110' : 'border-paper'} shadow`}
      style={{ background: color }}
      aria-pressed={active}
    />
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition ${
        active ? 'bg-peach border-[#d98a4f] text-paper' : 'bg-cream border-parch text-inksoft hover:bg-paper'
      }`}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

export default function AvatarCreator({ player, onDone, editMode = false }) {
  const [a, setA] = useState({ ...DEFAULT_AVATAR, ...(player.avatar || {}) });
  const [shopType, setShopType] = useState(player.shopType || SHOP_TYPES[0].key);
  const [taken, setTaken] = useState(new Set());
  const [busy, setBusy] = useState(false);

  // Shop types are unique per house: gather the ones other players have claimed.
  useEffect(() => {
    if (editMode) return;
    api.listPlayers().then((ps) => {
      const t = new Set(ps.filter((p) => p.id !== player.id && p.shopType).map((p) => p.shopType));
      setTaken(t);
      if (!player.shopType) {
        const first = SHOP_TYPES.find((s) => !t.has(s.key));
        if (first) setShopType(first.key);
      }
    });
  }, [editMode, player.id, player.shopType]);

  const set = (patch) => setA((prev) => ({ ...prev, ...patch }));
  const chosenShop = SHOP_TYPES.find((s) => s.key === shopType);

  async function save() {
    setBusy(true);
    const updated = editMode
      ? await api.saveAvatar(player.id, a)
      : await api.completeSetup(player.id, { avatar: a, shopType });
    setBusy(false);
    onDone(updated);
  }

  return (
    <div className="min-h-full p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="pixel-text text-lg text-ink text-center mb-1">
          {editMode ? 'Edit your look' : `Welcome, ${player.name}!`}
        </h1>
        <p className="text-center text-inksoft text-sm mb-6">
          {editMode ? 'Tweak your character.' : 'Pick your shop and build your character.'}
        </p>

        <div className="grid md:grid-cols-[260px_1fr] gap-6">
          {/* Live preview */}
          <div className="panel p-5 flex flex-col items-center md:sticky md:top-4 self-start">
            <div className="bg-skyhi rounded-2xl p-4 border-[3px] border-parch">
              <Avatar data={a} scale={7} className="bob" />
            </div>
            {!editMode && (
              <div className="mt-4 text-center">
                <div className="text-3xl">{chosenShop?.emoji}</div>
                <div className="pixel-text text-xs text-ink mt-1">{chosenShop?.name}</div>
                <div className="text-xs text-inksoft">{chosenShop?.sells}</div>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setA(randomAvatar((Date.now() % 1000) / 1000))} className="cozy-btn-ghost text-xs">
                🎲 Surprise
              </button>
              <button onClick={save} disabled={busy} className="cozy-btn-primary text-xs">
                {busy ? '…' : 'Looks good!'}
              </button>
            </div>
          </div>

          {/* Pickers */}
          <div className="panel p-5">
            {!editMode && (
              <Section title="Shop type (each one is unique!)">
                {SHOP_TYPES.map((s) => {
                  const isTaken = taken.has(s.key);
                  return (
                    <button
                      key={s.key}
                      onClick={() => !isTaken && setShopType(s.key)}
                      disabled={isTaken}
                      title={isTaken ? `${s.name} — already taken` : `${s.name} — ${s.sells}`}
                      className={`relative w-12 h-12 rounded-xl text-2xl border-[3px] transition ${
                        shopType === s.key
                          ? 'border-peach bg-paper scale-105'
                          : isTaken
                            ? 'border-parch bg-parch/40 opacity-40 cursor-not-allowed'
                            : 'border-parch bg-cream hover:bg-paper'
                      }`}
                    >
                      {s.emoji}
                      {isTaken && <span className="absolute -top-1 -right-1 text-[9px]">🔒</span>}
                    </button>
                  );
                })}
              </Section>
            )}

            <Section title="Skin">
              {SKIN_TONES.map((c, i) => (
                <Swatch key={i} color={c} active={a.skin === i} onClick={() => set({ skin: i })} />
              ))}
            </Section>

            <Section title="Hair style">
              {HAIR_STYLES.map((h, i) => (
                <Chip key={h} active={a.hairStyle === i} onClick={() => set({ hairStyle: i })}>
                  {HAIR_LABELS[h]}
                </Chip>
              ))}
            </Section>

            <Section title="Hair colour">
              {HAIR_COLORS.map((c, i) => (
                <Swatch key={i} color={c} active={a.hairColor === i} onClick={() => set({ hairColor: i })} />
              ))}
            </Section>

            <Section title="Outfit">
              {OUTFITS.map((o, i) => (
                <Chip key={o.key} active={a.outfit === i} onClick={() => set({ outfit: i })}>
                  {o.name}
                </Chip>
              ))}
            </Section>

            <Section title="Outfit colour">
              {OUTFIT_COLORS.map((c, i) => (
                <Swatch key={i} color={c} active={a.outfitColor === i} onClick={() => set({ outfitColor: i })} />
              ))}
            </Section>

            <Section title="Accessory">
              {ACCESSORIES.map((ac, i) => (
                <Chip key={ac} active={a.accessory === i} onClick={() => set({ accessory: i })}>
                  {ACCESSORY_LABELS[ac]}
                </Chip>
              ))}
            </Section>

            {a.accessory !== 0 && (
              <Section title="Accessory colour">
                {ACCESSORY_COLORS.map((c, i) => (
                  <Swatch key={i} color={c} active={a.accessoryColor === i} onClick={() => set({ accessoryColor: i })} />
                ))}
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
