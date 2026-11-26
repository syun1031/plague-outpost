// 背景音樂：WebAudio 即時合成的緊張軍事氛圍循環（不需音檔、無版權問題）
// 結構：A 小調 8 小節循環，層次為低音鋪底、和弦長音、軍鼓節奏、稀疏的琶音
import { audioCtx, makeNoise, holdAudio, releaseAudio } from './audio.js';

const BPM = 84;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const VOLUME = 0.16;

// 和弦（MIDI 音高）：Am  Am  F  E | Am  Dm  F  E
const CHORDS = [
  [45, 52, 57, 60], [45, 52, 57, 60], [41, 48, 53, 57], [40, 47, 52, 56],
  [45, 52, 57, 60], [38, 45, 50, 53], [41, 48, 53, 57], [40, 47, 52, 56],
];
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

let master = null;
let timer = null;
let nextBar = 0;
let barIndex = 0;
let playing = false;
let muted = false;

let analyser = null;

export function isMusicMuted() { return muted; }

// 目前音樂的音量大小（0~1），用來確認音樂真的有在播放
export function musicLevel() {
  if (!analyser || !playing) return 0;
  const d = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(d);
  return Math.sqrt(d.reduce((s, v) => s + v * v, 0) / d.length);
}

export function setMusicMuted(v) {
  muted = v;
  if (muted) stopMusic(0.4);
  else startMusic();
}

export function startMusic() {
  if (muted || playing) return;
  const a = audioCtx();
  playing = true;
  master = a.createGain();
  master.gain.setValueAtTime(0.0001, a.currentTime);
  master.gain.exponentialRampToValueAtTime(VOLUME, a.currentTime + 1.5);
  const comp = a.createDynamicsCompressor();
  analyser = a.createAnalyser();
  master.connect(comp).connect(analyser).connect(a.destination);
  nextBar = a.currentTime + 0.1;
  barIndex = 0;
  // 預先排程：每 0.2 秒檢查，提前排好 1 小節內要播放的音
  timer = setInterval(schedule, 200);
  schedule();
}

export function stopMusic(fade = 1) {
  if (!playing) return;
  playing = false;
  if (paused) { paused = false; releaseAudio(); }
  clearInterval(timer);
  const a = audioCtx();
  const g = master;
  g.gain.cancelScheduledValues(a.currentTime);
  g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + fade);
  setTimeout(() => g.disconnect(), (fade + 0.2) * 1000);
}

// 暫停／繼續：直接暫停整個音訊時鐘，音樂會從停下的地方接著播
let paused = false;
export function pauseMusic() {
  if (!playing || paused) return;
  paused = true;
  holdAudio();
}
export function resumeMusic() {
  if (!paused) return;
  paused = false;
  releaseAudio();
}

function schedule() {
  const a = audioCtx();
  while (nextBar < a.currentTime + BAR) {
    playBar(a, nextBar, barIndex);
    nextBar += BAR;
    barIndex = (barIndex + 1) % CHORDS.length;
  }
}

function playBar(a, t, i) {
  const chord = CHORDS[i];
  pad(a, t, chord);
  bass(a, t, chord[0]);
  drums(a, t, i);
  if (i % 2 === 1) arp(a, t, chord);
}

function env(a, g, t, peak, attack, hold, release) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
}

// 和弦長音：兩個微微走音的鋸齒波＋低通濾波，聽起來像弦樂鋪底
function pad(a, t, chord) {
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(500, t);
  f.frequency.linearRampToValueAtTime(900, t + BAR * 0.5);
  f.frequency.linearRampToValueAtTime(500, t + BAR);
  const g = a.createGain();
  env(a, g, t, 0.12, 0.6, BAR - 1.1, 0.9);
  f.connect(g).connect(master);
  for (const n of chord.slice(1)) {
    for (const det of [-6, 6]) {
      const o = a.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = midi(n);
      o.detune.value = det;
      o.connect(f);
      o.start(t); o.stop(t + BAR + 0.4);
    }
  }
}

// 低音：附點節奏推動緊張感
function bass(a, t, root) {
  for (const [beat, len] of [[0, 1.4], [1.5, 0.4], [2, 1.4], [3.5, 0.4]]) {
    const s = t + beat * BEAT;
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'triangle';
    o.frequency.value = midi(root - 12);
    env(a, g, s, 0.5, 0.02, len * BEAT * 0.5, len * BEAT * 0.5);
    o.connect(g).connect(master);
    o.start(s); o.stop(s + len * BEAT + 0.05);
  }
}

// 軍鼓：第 1 拍大鼓、2、4 拍小鼓，每 4 小節最後加一段滾奏
function drums(a, t, i) {
  kick(a, t);
  kick(a, t + 2 * BEAT);
  snare(a, t + BEAT, 0.35);
  snare(a, t + 3 * BEAT, 0.35);
  for (const b of [0.5, 1.75, 2.5, 3.75]) snare(a, t + b * BEAT, 0.08);
  if (i % 4 === 3) for (let k = 0; k < 8; k++) snare(a, t + 3 * BEAT + k * BEAT / 8, 0.05 + k * 0.025);
}

function kick(a, t) {
  const o = a.createOscillator(), g = a.createGain();
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
  env(a, g, t, 0.7, 0.005, 0.02, 0.25);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + 0.35);
}

function snare(a, t, vol) {
  const n = makeNoise(a, 0.2);
  const f = a.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8;
  const g = a.createGain();
  env(a, g, t, vol, 0.002, 0.01, 0.12);
  n.connect(f).connect(g).connect(master);
  n.start(t); n.stop(t + 0.2);
}

// 琶音：小聲的撥弦，在第二、四…小節出現
function arp(a, t, chord) {
  const seq = [chord[1], chord[2], chord[3], chord[2] + 12, chord[3], chord[2]];
  seq.forEach((n, k) => {
    const s = t + (k * 0.5 + 1) * BEAT;
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'triangle';
    o.frequency.value = midi(n + 12);
    env(a, g, s, 0.07, 0.005, 0.02, 0.4);
    o.connect(g).connect(master);
    o.start(s); o.stop(s + 0.5);
  });
}
