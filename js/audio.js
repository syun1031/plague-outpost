// 音效：用 WebAudio 即時合成，不需音檔
let ac = null;
let muted = false;

export function setMuted(v) { muted = v; }
export function isMuted() { return muted; }

export function audioCtx() { return ctx(); }
export function makeNoise(a, dur) { return noise(a, dur); }

// 暫停期間 held = true：任何地方取用音訊都不會把它自動恢復
let held = false;
export function holdAudio() { held = true; if (ac) ac.suspend(); }
export function releaseAudio() { held = false; if (ac) ac.resume(); }
export function audioState() { return ac ? ac.state : 'none'; }

function ctx() {
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended' && !held) ac.resume();
  return ac;
}

function noise(a, dur) {
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  return src;
}

function tone(a, type, f0, f1, dur, vol, t = a.currentTime) {
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

export function sfx(name) {
  if (muted) return;
  const a = ctx();
  const t = a.currentTime;
  if (name === 'gun') {
    const n = noise(a, 0.25), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'lowpass'; f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(400, t + 0.2);
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    n.connect(f).connect(g).connect(a.destination); n.start(t);
    tone(a, 'square', 180, 50, 0.12, 0.35, t);
  } else if (name === 'boom') {
    const n = noise(a, 1.6), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'lowpass'; f.frequency.setValueAtTime(2200, t); f.frequency.exponentialRampToValueAtTime(120, t + 1.4);
    g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    n.connect(f).connect(g).connect(a.destination); n.start(t);
    tone(a, 'sine', 90, 28, 1.0, 0.9, t);
  } else if (name === 'beep') {
    tone(a, 'square', 1320, 1300, 0.08, 0.12, t);
  } else if (name === 'click') {
    tone(a, 'triangle', 900, 600, 0.05, 0.12, t);
  } else if (name === 'servo') {
    tone(a, 'sawtooth', 220, 440, 0.12, 0.06, t);
    tone(a, 'square', 1800, 1800, 0.03, 0.06, t + 0.13);
  } else if (name === 'win') {
    [523, 659, 784, 1047].forEach((f, i) => tone(a, 'triangle', f, f, 0.35, 0.22, t + i * 0.12));
  } else if (name === 'lose') {
    tone(a, 'sawtooth', 300, 60, 1.2, 0.25, t);
    tone(a, 'sine', 880, 880, 1.6, 0.08, t + 0.6);
  }
}
