import { useState } from 'react';
import api from '../data/api.js';

// Two-step kid-friendly login: name, then secret code. Matches the game plan's
// onboarding (name is case-insensitive; code is checked against the hash).
export default function Login({ onLoggedIn }) {
  const [step, setStep] = useState('name');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submitName(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return;
    setBusy(true);
    const ok = await api.nameExists(name);
    setBusy(false);
    if (!ok) {
      setError("Hmm, I don't have that name on the list. Check the spelling?");
      return;
    }
    setStep('code');
  }

  async function submitCode(e) {
    e.preventDefault();
    setError('');
    if (!code.trim()) return;
    setBusy(true);
    const res = await api.login(name, code);
    setBusy(false);
    if (!res.ok) {
      setError(res.error === 'code' ? 'That secret code isn’t right. Try again!' : 'Something went wrong.');
      return;
    }
    onLoggedIn(res.player);
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="panel w-full max-w-sm p-7 text-center">
        <div className="text-4xl mb-1">🏪</div>
        <h1 className="pixel-text text-xl text-ink">Shophouse Row</h1>
        <p className="text-inksoft text-sm mt-1 mb-6">Your shop, your street, your friends.</p>

        {step === 'name' ? (
          <form onSubmit={submitName} className="space-y-4">
            <label className="block text-left">
              <span className="pixel-text text-xs text-inksoft">Your name</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chloe"
                className="mt-1 w-full rounded-xl border-[3px] border-parch bg-cream px-4 py-3 text-lg outline-none focus:border-peach"
              />
            </label>
            <button type="submit" disabled={busy} className="cozy-btn-primary w-full">
              {busy ? '…' : 'Next →'}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="space-y-4">
            <p className="text-inksoft text-sm">
              Hi <strong>{name}</strong>! What's your secret code?
            </p>
            <label className="block text-left">
              <span className="pixel-text text-xs text-inksoft">Secret code</span>
              <input
                autoFocus
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="••••••"
                className="mt-1 w-full rounded-xl border-[3px] border-parch bg-cream px-4 py-3 text-lg outline-none focus:border-peach"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setStep('name'); setError(''); setCode(''); }}
                className="cozy-btn-ghost flex-1"
              >
                ← Back
              </button>
              <button type="submit" disabled={busy} className="cozy-btn-primary flex-1">
                {busy ? '…' : 'Enter'}
              </button>
            </div>
          </form>
        )}

        {error && <p className="mt-4 text-sm text-rose font-semibold">{error}</p>}
      </div>
    </div>
  );
}
