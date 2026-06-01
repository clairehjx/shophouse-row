// Cozy looping soundtrack, synthesized in-code with the Web Audio API — no audio
// files. A gentle music-box lead over soft sine pads + bass, inspired by warm,
// slow cosy games (à la Pokopia). Browsers require a user gesture before audio can
// start, so playback begins on the first click/tap when music is enabled.

const PREF_KEY = 'shophouse-row/music';

const semis = (n) => 440 * Math.pow(2, n / 12); // n semitones from A4
const F = {
  C3: semis(-21), F3: semis(-16), G3: semis(-14), A3: semis(-12), B3: semis(-10),
  C4: semis(-9), D4: semis(-7), E4: semis(-5), F4: semis(-4), G4: semis(-2), A4: semis(0), B4: semis(2),
  C5: semis(3), D5: semis(5), E5: semis(7), G5: semis(10), A5: semis(12),
};

// 4 bars, 8 eighth-notes each. Cosy C–G–Am–F with a soft pentatonic music-box line.
const MELODY = [
  F.E4, F.G4, F.A4, null, F.G4, F.E4, F.D4, null,
  F.D4, F.E4, F.G4, null, F.A4, F.G4, null, null,
  F.E4, F.A4, F.G4, null, F.E4, F.D4, F.C4, null,
  F.D4, F.E4, null, F.G4, F.E4, null, F.D4, null,
];
const BASS = [F.C3, F.G3, F.A3, F.F3];
const CHORDS = [
  [F.C4, F.E4, F.G4],
  [F.G3, F.B3, F.D4],
  [F.A3, F.C4, F.E4],
  [F.F3, F.A3, F.C4],
];

const TEMPO = 80;
const EIGHTH = 30 / TEMPO; // seconds per eighth note

let ctx = null;
let master = null;
let leadBus = null;
let timer = null;
let step = 0;
let nextTime = 0;
let playing = false;

let enabled = (() => {
  try { const v = localStorage.getItem(PREF_KEY); return v === null ? true : v === '1'; }
  catch { return true; }
})();

function buildGraph() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.16; // gentle overall volume
  master.connect(ctx.destination);

  // soft echo for the lead, for a roomy music-box feel
  leadBus = ctx.createGain();
  const delay = ctx.createDelay();
  delay.delayTime.value = EIGHTH * 1.5;
  const fb = ctx.createGain();
  fb.gain.value = 0.28;
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  leadBus.connect(master);
  leadBus.connect(delay);
  delay.connect(fb);
  fb.connect(delay);
  delay.connect(wet);
  wet.connect(master);
}

function voice(type, freq, time, dur, peak, dest, attack = 0.01) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(peak, time + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(time);
  osc.stop(time + dur + 0.05);
}

function scheduleStep(time) {
  const m = MELODY[step];
  if (m) voice('triangle', m, time, 0.55, 0.5, leadBus, 0.008);
  if (step % 8 === 0) {
    const bar = step / 8;
    voice('sine', BASS[bar] / 2, time, EIGHTH * 7, 0.6, master, 0.02); // bass
    CHORDS[bar].forEach((f) => voice('sine', f, time, EIGHTH * 7.5, 0.12, master, 0.18)); // pad
  }
  step = (step + 1) % MELODY.length;
}

function tick() {
  while (nextTime < ctx.currentTime + 0.12) {
    scheduleStep(nextTime);
    nextTime += EIGHTH;
  }
}

function start() {
  if (playing) return;
  if (!ctx) buildGraph();
  if (ctx.state === 'suspended') ctx.resume();
  playing = true;
  step = 0;
  nextTime = ctx.currentTime + 0.1;
  timer = setInterval(tick, 25);
}

function stop() {
  playing = false;
  if (timer) { clearInterval(timer); timer = null; }
  if (ctx && ctx.state === 'running') ctx.suspend();
}

export const music = {
  get enabled() { return enabled; },
  get playing() { return playing; },
  // Start audio if the user has it enabled. Safe to call on every gesture.
  resumeIfEnabled() {
    if (enabled && !playing) start();
  },
  toggle() {
    enabled = !enabled;
    try { localStorage.setItem(PREF_KEY, enabled ? '1' : '0'); } catch { /* ignore */ }
    if (enabled) start(); else stop();
    return enabled;
  },
};
