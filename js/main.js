import { generateByDifficulty, clueRange, cellName, DIFFICULTY } from './puzzle.js';
import { ROLE_INFO, roleSVG, unknownSVG, MARK_SVG, clueText } from './art.js';
import { commanderSVG } from './commander.js';
import { FX } from './fx.js';
import { sfx, setMuted, isMuted } from './audio.js';
import { startMusic, stopMusic, setMusicMuted, isMusicMuted, pauseMusic, resumeMusic } from './music.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const DEFAULT_NAMES = { male: '霍克', female: '薇拉' };
const BOARD_SIZES = { '4x4': [4, 4, 3], '5x5': [5, 5, 5], '6x6': [6, 6, 7] }; // 排行榜的三種陣地
const TUT_ORDER = Object.keys(ROLE_INFO); // 教學依人員檔案順序，每關多一位新隊員
const TUT_TIPS = {
  doctor: '先找數字是 0 的醫生：他周圍全是健康的人。再找「數字＝周圍未知格數」的醫生：那些格子全是感染者。',
  sentry: '哨兵看整條橫排。把同一列裡已確定的格子扣掉，剩下的數字就落在其他未知格上。',
  scout: '偵查兵直接指出同一列裡一個健康的人，先把那格標成健康，能讓其他線索更好推。',
  radar: '雷達兵和哨兵一樣，只是改看直排。直排和橫排的數字交叉比對，常常能鎖定位置。',
  patrol: '巡邏兵指出同一行（直排）裡一個健康的人，和偵查兵一樣可以直接標成健康。',
  engineer: '工兵只看上下左右，不算斜角。和醫生放在一起比較，兩者的差別就落在斜角上。',
};
const DAILY = { size: [5, 5, 5], difficulty: 'normal' }; // 每日題固定規格，大家玩同一題

const LINES = {
  start: ['各單位回報完畢。找出感染者，別誤傷自己人。', '線索都在隊員身上，冷靜推理。', '感染者看起來和我們一樣，小心判斷。'],
  mark: ['標記完成。', '嗯，有道理。', '再確認一次周圍。'],
  pistol: ['目標確認，開火！'],
  boom: ['感染者聚在一起，引爆！'],
  win: ['陣地淨化完成，辛苦了！', '漂亮的推理，全員安全。'],
  lose: ['不……那是我們的人。', '誤殺健康人員，任務失敗。'],
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const state = {
  cmd: 'male',
  size: [4, 4, 3],
  difficulty: 'normal',
  mode: 'normal', // 玩家選的模式。normal：標記全對即勝利；hardcore：必須處決全部感染者
  playMode: 'normal', // 這一局實際使用的模式（教學固定一般模式）
  kind: 'normal', // 這一局的類型：normal 一般、daily 今日任務、tutorial 教學
  tutorial: 0, // 教學關卡編號（1~6）
  seed: 0,
  daily: null, // 今日任務的日期字串，一般對局為 null
  puzzle: null,
  marks: new Map(),
  dead: new Set(),
  tool: 'infected',
  active: null,
  busy: false,
  over: false,
  t0: 0,
  timer: null,
  pausedAt: 0, // 暫停開始的時間，0 表示沒有暫停
  pauses: new Set(), // 目前的暫停原因：'rules'（看規則）、'hidden'（切到其他分頁）
  timerWasOn: false,
};

const fx = new FX($('#fx'), $('#boardWrap'));
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') window.__game = { state, fx }; // 本機除錯用

// ───────── 今日任務 ─────────
function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function hashSeed(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
const dailyKey = (d) => `plague-outpost:daily:${d}`;
function readDaily(d) {
  try { return JSON.parse(localStorage.getItem(dailyKey(d))) || null; } catch { return null; }
}
function saveDaily(d, result, secs) {
  const prev = readDaily(d);
  const rec = { result, secs, mode: state.playMode };
  // 已經贏過就只保留更快的紀錄；失敗不會覆蓋勝利
  if (prev?.result === 'win' && (result !== 'win' || prev.secs <= secs)) return;
  localStorage.setItem(dailyKey(d), JSON.stringify(rec));
}
function renderDailyInfo() {
  const rec = readDaily(todayStr());
  $('#dailyInfo').textContent = !rec ? '5×5 普通，每天一題'
    : rec.result === 'win' ? `今天已完成，最快 ${fmt(rec.secs)}` : '今天挑戰失敗，可以再試';
}
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// ───────── 玩家檔案（名字、指揮官、教學進度，記在瀏覽器） ─────────
const PROFILE_KEY = 'plague-outpost:profile';
function newId() {
  return (crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);
}
const profile = (() => {
  let p = null;
  try { p = JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch { /* 壞掉的資料就重建 */ }
  if (p && p.id) return { names: {}, tutorialLevel: 1, ...p, returning: true };
  // 這個版本之前玩過的人（瀏覽器裡已有本遊戲的紀錄）視為老玩家，不再進教學
  const veteran = Object.keys(localStorage).some((k) => k.startsWith('plague-outpost:'));
  return { id: newId(), cmd: 'male', names: {}, tutorialDone: veteran, tutorialLevel: 1, returning: false };
})();
function saveProfile() {
  const { returning, ...data } = profile;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
}
const plainName = (cmd = state.cmd) => profile.names[cmd] || DEFAULT_NAMES[cmd];
const displayName = (cmd = state.cmd) => `${plainName(cmd)} 少校`;
function cleanName(v) {
  return v.replace(/[\u0000-\u001f<>&"'`]/g, '').trim().slice(0, 10);
}
function renderNames() {
  for (const el of $$('[data-name]')) el.textContent = displayName(el.dataset.name);
  const input = $('#nameInput');
  input.placeholder = DEFAULT_NAMES[state.cmd];
  if (document.activeElement !== input) input.value = profile.names[state.cmd] || '';
}

// ───────── 開始畫面 ─────────
state.cmd = profile.cmd === 'female' ? 'female' : 'male';
$$('.cmd-art').forEach((el) => (el.innerHTML = commanderSVG(el.dataset.art)));
$$('.cmd-opt').forEach((b) => {
  b.classList.toggle('selected', b.dataset.cmd === state.cmd);
  b.addEventListener('click', () => {
    $$('.cmd-opt').forEach((x) => x.classList.toggle('selected', x === b));
    state.cmd = b.dataset.cmd;
    profile.cmd = state.cmd;
    renderNames();
    if (profile.returning) saveProfile();
    sfx('click');
  });
});
$('#nameInput').addEventListener('input', (e) => {
  const v = cleanName(e.target.value);
  if (v) profile.names[state.cmd] = v; else delete profile.names[state.cmd];
  renderNames();
  saveProfile();
  profile.returning = true;
});
renderNames();
if (profile.returning) {
  $('#welcome').textContent = `歡迎回來，${displayName()}。`;
  $('#welcome').classList.remove('hidden');
}
$$('.seg').forEach((seg) => seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
  seg.querySelectorAll('button').forEach((x) => x.classList.toggle('selected', x === b));
  const v = b.dataset.v;
  if (seg.dataset.key === 'size') state.size = v.split('x').map(Number);
  else state[seg.dataset.key] = v;
  sfx('click');
})));
renderDailyInfo();
renderTutorialInfo();

function enterGame(kind, level) {
  profile.cmd = state.cmd;
  saveProfile();
  profile.returning = true;
  $('#start').classList.add('hidden');
  $('#game').classList.remove('hidden');
  $('#cmdName').textContent = `指揮官 ${displayName()}`;
  setExpr('neutral');
  newGame(kind, level);
  startMusic();
}
// 新玩家第一次開打前，先建議走教學（可跳過）
function startWithTutorialCheck(kind) {
  if (profile.tutorialDone) return enterGame(kind);
  const lv = Math.min(profile.tutorialLevel || 1, 6);
  showModal('第一次來到陣地？', `
    <p>建議先完成 6 關教學：每一關會介紹一位新隊員，從醫生開始，最後認識全部六種專長。</p>
    <p>已經會玩的話，可以直接跳過。之後隨時能從簡報的「教學」重新進入。</p>`,
  [[lv > 1 ? `從第 ${lv} 關繼續教學` : '開始教學', () => enterGame('tutorial', lv), 'primary'],
    ['跳過教學，直接作戰', () => { finishTutorial(); enterGame(kind); }, 'ghost']]);
}
$('#btnStart').addEventListener('click', () => startWithTutorialCheck('normal'));
$('#btnDaily').addEventListener('click', () => startWithTutorialCheck('daily'));
$('#btnTutorial').addEventListener('click', () => {
  const lv = profile.tutorialDone ? 1 : Math.min(profile.tutorialLevel || 1, 6);
  enterGame('tutorial', lv);
});
$('#btnBoard').addEventListener('click', () => showLeaderboard());
$('#btnSkipTut').addEventListener('click', () => {
  if (state.busy) return;
  $('#modal').classList.add('hidden');
  finishTutorial();
  newGame('normal');
});
function goMenu() {
  if (state.busy) return;
  stopTimer();
  stopMusic(0.8); // 簡報畫面不播音樂，進入陣地時重新開始
  renderDailyInfo();
  renderTutorialInfo();
  renderNames();
  $('#game').classList.add('hidden');
  $('#start').classList.remove('hidden');
}
$('#btnMenu').addEventListener('click', goMenu);
$('#btnNew').addEventListener('click', () => !state.busy && newGame(state.kind === 'tutorial' ? 'tutorial' : 'normal', state.tutorial));
// 音樂與音效開關（記在瀏覽器裡，下次開啟沿用）
const SETTINGS_KEY = 'plague-outpost:settings';
function loadSettings() {
  try { return { music: true, sfx: true, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) }; } catch { return { music: true, sfx: true }; }
}
function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ music: !isMusicMuted(), sfx: !isMuted() }));
}
function renderAudioBtns() {
  $('#btnMusic').textContent = isMusicMuted() ? '音樂關' : '音樂開';
  $('#btnMusic').setAttribute('aria-pressed', String(!isMusicMuted()));
  $('#btnMute').textContent = isMuted() ? '音效關' : '音效開';
  $('#btnMute').setAttribute('aria-pressed', String(!isMuted()));
}
{
  const s = loadSettings();
  setMuted(!s.sfx);
  // 尚未有使用者操作前不能播放聲音，這裡只記住狀態，進入陣地時才開始播
  if (!s.music) setMusicMuted(true);
  renderAudioBtns();
}
$('#btnMusic').addEventListener('click', () => {
  setMusicMuted(!isMusicMuted());
  saveSettings(); renderAudioBtns();
});
$('#btnMute').addEventListener('click', () => {
  setMuted(!isMuted());
  saveSettings(); renderAudioBtns();
});
$('#btnRules').addEventListener('click', showRules);
$$('.tool').forEach((b) => b.addEventListener('click', () => {
  state.tool = b.dataset.tool;
  $$('.tool').forEach((x) => x.classList.toggle('selected', x === b));
}));
$$('.ico[data-mark]').forEach((el) => (el.innerHTML = MARK_SVG[el.dataset.mark]));
$('#btnExec').addEventListener('click', execute);

$('#legendList').innerHTML = Object.entries(ROLE_INFO).map(([t, r]) => `
  <li><div class="lg-art">${roleSVG(t)}</div><div><b>${r.name}</b><p>${r.skill}</p><small>${r.look}</small></div></li>`).join('');

// ───────── 指揮官表情與對話 ─────────
let exprTimer = null;
function setExpr(expr) {
  $('#cmdPortrait').innerHTML = commanderSVG(state.cmd, expr);
}
function say(text, expr = 'talk') {
  const el = $('#cmdSay');
  el.textContent = text;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  setExpr(expr);
  clearTimeout(exprTimer);
  if (expr === 'talk') exprTimer = setTimeout(() => setExpr('neutral'), 1300);
}

// ───────── 遊戲流程 ─────────
function newGame(kind = 'normal', level = 1) {
  let rows, cols, total, difficulty, seed, types, mustInclude;
  state.kind = kind;
  state.daily = null;
  state.tutorial = 0;
  state.playMode = state.mode;
  if (kind === 'daily') {
    [rows, cols, total] = DAILY.size;
    difficulty = DAILY.difficulty;
    state.daily = todayStr();
    seed = hashSeed(`daily-${state.daily}`);
  } else if (kind === 'tutorial') {
    // 教學：固定 4×4、簡單難度、固定題目，只出現已介紹過的隊員
    state.tutorial = level;
    state.playMode = 'normal';
    [rows, cols, total] = [4, 4, level === 1 ? 2 : 3];
    difficulty = 'easy';
    seed = 7000 + level;
    types = TUT_ORDER.slice(0, level);
    mustInclude = types[level - 1];
  } else {
    [rows, cols, total] = state.size;
    difficulty = state.difficulty;
    seed = (Math.random() * 1e9) | 0;
  }
  state.seed = seed;
  startMusic(); // 勝敗後音樂會停，新局重新開始
  state.puzzle = generateByDifficulty({ rows, cols, infected: total, difficulty, seed, types, mustInclude });
  state.marks.clear();
  state.dead.clear();
  state.active = null;
  state.over = false;
  state.busy = false;
  const modeName = state.playMode === 'hardcore' ? '硬派模式' : '一般模式';
  $('#missionTag').textContent = kind === 'daily'
    ? `今日任務 ${state.daily}　${rows}×${cols} ${DIFFICULTY[difficulty].name}　${modeName}`
    : kind === 'tutorial'
      ? `教學 第 ${level} / 6 關　新隊員：${ROLE_INFO[mustInclude].name}`
      : `${rows}×${cols}　${DIFFICULTY[difficulty].name}　${modeName}　編號 ${seed.toString(36).toUpperCase()}`;
  $('#btnNew').textContent = kind === 'tutorial' ? '重試本關' : '換一題';
  $('#btnSkipTut').classList.toggle('hidden', kind !== 'tutorial');
  $('#game').classList.remove('lost');
  buildBoard();
  say(kind === 'tutorial' ? TUT_TIPS[mustInclude]
    : state.playMode === 'hardcore' ? '硬派模式：必須親手處決全部感染者才算完成。' : pick(LINES.start));
  stopTimer();
  state.pausedAt = 0;
  if (state.pauses.size) { state.pauses.clear(); resumeMusic(); }
  state.t0 = Date.now();
  state.timer = setInterval(tick, 1000);
  tick();
  if (kind === 'tutorial') {
    pauseGame('intro'); // 看新隊員介紹時不計時
    showIntro(level);
  }
}

// 暫停中計算時間時，以暫停開始的那一刻為準
const elapsed = () => Math.floor(((state.pausedAt || Date.now()) - state.t0) / 1000);
function stopTimer() { clearInterval(state.timer); state.timer = null; }
function tick() { $('#stTime').textContent = fmt(elapsed()); }

function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 1800);
}

function buildBoard() {
  const { rows, cols, roles } = state.puzzle;
  const board = $('#board');
  board.style.setProperty('--cols', cols);
  board.style.setProperty('--rows', rows);
  let html = '<div class="lbl corner"></div>';
  for (let c = 0; c < cols; c++) html += `<div class="lbl col">${String.fromCharCode(65 + c)}</div>`;
  for (let r = 0; r < rows; r++) {
    html += `<div class="lbl row">${r + 1}</div>`;
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const clue = roles.get(i);
      if (clue) {
        html += `<button class="cell role" data-i="${i}" data-type="${clue.type}" aria-label="${cellName(r, c)} ${ROLE_INFO[clue.type].name}">
          <span class="coord">${cellName(r, c)}</span>
          <div class="art">${roleSVG(clue.type)}</div>
          <div class="clue"><span class="rname">${ROLE_INFO[clue.type].name}</span><span class="ctext">${clueText(clue)}</span></div>
        </button>`;
      } else {
        html += `<button class="cell hidden-cell" data-i="${i}" aria-label="${cellName(r, c)} 未知">
          <span class="coord">${cellName(r, c)}</span>
          <div class="art">${unknownSVG()}<span class="q">?</span></div>
          <div class="mark"></div>
        </button>`;
      }
    }
  }
  board.innerHTML = html;
  board.querySelectorAll('.cell').forEach((el) => {
    el.addEventListener('click', () => onCell(+el.dataset.i));
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); onCell(+el.dataset.i, 'healthy'); });
  });
  updateStatus();
}

const cellEl = (i) => $(`#board .cell[data-i="${i}"]`);

function onCell(i, forceTool) {
  if (state.busy || state.over) return;
  const clue = state.puzzle.roles.get(i);
  if (clue) return toggleRole(i);
  if (state.dead.has(i)) return;
  const tool = forceTool || state.tool;
  const cur = state.marks.get(i);
  if (tool === 'erase' || cur === tool) state.marks.delete(i);
  else {
    if (tool === 'infected' && countInfectedMarks() + state.dead.size >= state.puzzle.total) {
      toast(`感染標記最多 ${state.puzzle.total} 個`);
      return;
    }
    state.marks.set(i, tool);
  }
  sfx('click');
  renderMark(i);
  updateStatus();
  if (Math.random() < 0.3) say(pick(LINES.mark));
  checkWin();
}

function toggleRole(i) {
  const prev = state.active;
  clearRange();
  if (prev === i) { state.active = null; return; }
  state.active = i;
  const { rows, cols, roles } = state.puzzle;
  const clue = roles.get(i);
  const el = cellEl(i);
  el.classList.add('active');
  if (clue.tr !== undefined) {
    const ang = Math.atan2(clue.tc - clue.c, -(clue.tr - clue.r)) * 180 / Math.PI;
    el.style.setProperty('--face', `${ang}deg`);
  } else el.style.setProperty('--face', '0deg');
  for (const [r, c] of clueRange(clue, rows, cols)) cellEl(r * cols + c).classList.add('in-range');
  sfx('servo');
  say(`${ROLE_INFO[clue.type].name}回報：${clueText(clue).replace(/<\/?b>/g, '')}。`);
}

function clearRange() {
  $$('#board .cell.active').forEach((e) => e.classList.remove('active'));
  $$('#board .cell.in-range').forEach((e) => e.classList.remove('in-range'));
}

function renderMark(i) {
  const el = cellEl(i);
  const m = state.marks.get(i);
  el.classList.toggle('m-infected', m === 'infected');
  el.classList.toggle('m-healthy', m === 'healthy');
  el.querySelector('.mark').innerHTML = m ? MARK_SVG[m] : '';
}

function countInfectedMarks() {
  let n = 0;
  for (const v of state.marks.values()) if (v === 'infected') n++;
  return n;
}

function updateStatus() {
  const { total } = state.puzzle;
  const marked = countInfectedMarks();
  $('#stTotal').textContent = total;
  $('#stMarked').textContent = `${marked + state.dead.size} / ${total}`;
  $('#stDead').textContent = state.dead.size;
  const btn = $('#btnExec');
  btn.disabled = marked === 0 || state.over;
  btn.textContent = marked ? `處決已標記的感染者（${marked}）` : '處決已標記的感染者';
}

// 一般模式：所有感染者都被正確標記（或已處決）就勝利
// 硬派模式：標記不會觸發勝利，必須全部處決
function checkWin() {
  const { infected } = state.puzzle;
  for (const i of infected) {
    if (state.dead.has(i)) continue;
    if (state.playMode === 'hardcore' || state.marks.get(i) !== 'infected') return false;
  }
  win();
  return true;
}

// 把要處決的格子分群：8 方向相鄰視為「聚在一起」
function groupTargets(list) {
  const { cols } = state.puzzle;
  const left = new Set(list);
  const groups = [];
  while (left.size) {
    const start = left.values().next().value;
    left.delete(start);
    const g = [start];
    for (let k = 0; k < g.length; k++) {
      const r = Math.floor(g[k] / cols), c = g[k] % cols;
      for (const j of [...left]) {
        const rr = Math.floor(j / cols), cc = j % cols;
        if (Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1) { left.delete(j); g.push(j); }
      }
    }
    groups.push(g);
  }
  return groups;
}

async function execute() {
  if (state.busy || state.over) return;
  const targets = [...state.marks].filter(([, v]) => v === 'infected').map(([i]) => i);
  if (!targets.length) return;
  state.busy = true;
  clearRange(); state.active = null;
  const wrong = await runExecution(targets);
  state.busy = false;
  if (wrong) return lose(wrong);
  updateStatus();
  if (!checkWin()) say(`已清除 ${state.dead.size} 名，還剩 ${state.puzzle.total - state.dead.size} 名感染者。`);
}

async function runExecution(targets) {
  const origin = portraitOrigin();
  for (const g of groupTargets(targets)) {
    const wrong = g.filter((i) => !state.puzzle.infected.has(i));
    if (g.length === 1) {
      say(pick(LINES.pistol), 'grim');
      await fx.pistol(cellEl(g[0]).getBoundingClientRect(), origin, () => killCells(g), sfx);
    } else {
      say(pick(LINES.boom), 'grim');
      await fx.explosion(g.map((i) => cellEl(i).getBoundingClientRect()), () => killCells(g, true), sfx);
    }
    if (wrong.length) return wrong;
  }
  return null;
}

function killCells(list, boom = false) {
  for (const i of list) {
    state.marks.delete(i);
    state.dead.add(i);
    const el = cellEl(i);
    renderMark(i);
    const ok = state.puzzle.infected.has(i);
    el.classList.add('dead', ok ? 'dead-infected' : 'dead-healthy');
    if (boom) el.classList.add('scorched');
    el.querySelector('.mark').innerHTML = `<span class="dead-tag">${ok ? '已清除' : '誤殺'}</span>`;
  }
  updateStatus();
}

function portraitOrigin() {
  const r = $('#cmdPortrait').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height * 0.7 };
}

async function win() {
  state.over = true;
  stopTimer();
  const secs = elapsed();
  clearRange();
  const rest = [...state.marks].filter(([, v]) => v === 'infected').map(([i]) => i);
  if (rest.length) {
    state.busy = true;
    say('全部鎖定，執行清除！', 'grim');
    await runExecution(rest);
    state.busy = false;
  }
  for (const i of state.puzzle.infected) cellEl(i).classList.add('reveal-infected');
  updateStatus();
  say(pick(LINES.win), 'happy');
  stopMusic(1.2);
  sfx('win');
  if (state.daily) saveDaily(state.daily, 'win', secs);
  const r = $('#board').getBoundingClientRect();
  fx.victory({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  if (state.kind === 'tutorial') return setTimeout(() => tutorialWin(state.tutorial, secs), 1200);
  const ranked = isRanked();
  const extra = state.daily ? `<p>今日任務完成。明天會有新的一題。</p>`
    : ranked ? `<p><span id="rankInfo">正在上傳到排行榜…</span></p>` : '';
  const board = ranked ? boardOf() : null;
  setTimeout(() => {
    showModal('陣地淨化完成', `<p>所有感染者都已找出，用時 <b>${fmt(secs)}</b>。</p>${extra}`,
      [['再來一局', () => newGame('normal'), 'primary'], ...(ranked ? [['排行榜', () => showLeaderboard(board.size, board.mode), 'ghost']] : []),
        ['回到簡報', goMenu, 'ghost'], ['檢視盤面', null, 'ghost']]);
    if (ranked) submitScore(secs, board);
  }, 1200);
}

function lose(wrong) {
  state.over = true;
  stopTimer();
  $('#game').classList.add('lost');
  for (const i of state.puzzle.infected) if (!state.dead.has(i)) cellEl(i).classList.add('reveal-infected');
  updateStatus();
  say(pick(LINES.lose), 'grim');
  stopMusic(0.6);
  sfx('lose');
  fx.defeat();
  if (state.daily) saveDaily(state.daily, 'lose', elapsed());
  const names = wrong.map((i) => cellName(Math.floor(i / state.puzzle.cols), i % state.puzzle.cols)).join('、');
  const retry = state.kind === 'daily' ? [['重試今日任務', () => newGame('daily'), 'primary']]
    : state.kind === 'tutorial' ? [['重試本關', () => newGame('tutorial', state.tutorial), 'primary']]
      : [['再來一局', () => newGame('normal'), 'primary']];
  setTimeout(() => showModal('任務失敗', `<p><b>${names}</b> 是健康的隊員。<br>紅框格是真正的感染者位置。</p>`,
    [...retry, ['回到簡報', goMenu, 'ghost'], ['檢視盤面', null, 'ghost']]), 1500);
}

function showModal(title, body, btns, { wide = false } = {}) {
  $('.modal-card').classList.toggle('wide', wide);
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = body;
  const box = $('#modalBtns');
  box.innerHTML = '';
  for (const [label, fn, cls] of btns) {
    const b = document.createElement('button');
    b.textContent = label;
    if (cls) b.className = cls;
    b.addEventListener('click', () => { $('#modal').classList.add('hidden'); fn?.(); });
    box.appendChild(b);
  }
  $('#modal').classList.remove('hidden');
}

// 暫停：停住計時器與背景音樂，繼續時把暫停的時間從計時中扣掉
// 可能同時有多個暫停原因（例如開著規則又切到別的分頁），全部解除才會繼續
function pauseGame(reason) {
  // 看規則只在對局進行中、且沒有處決動畫時才算暫停
  if (reason === 'rules' && (state.over || state.busy || !state.puzzle)) return false;
  if (state.pauses.has(reason)) return true;
  state.pauses.add(reason);
  if (state.pauses.size > 1) return true;
  state.pausedAt = Date.now();
  state.timerWasOn = !!state.timer;
  stopTimer();
  pauseMusic();
  return true;
}
function resumeGame(reason) {
  if (!state.pauses.delete(reason) || state.pauses.size) return;
  if (state.timerWasOn && !state.over) {
    state.t0 += Date.now() - state.pausedAt;
    state.timer = setInterval(tick, 1000);
  }
  state.pausedAt = 0;
  if (state.puzzle) tick();
  resumeMusic();
}

// 切到其他分頁或縮小視窗時自動暫停，回來後繼續
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame('hidden');
  else resumeGame('hidden');
});

function showRules() {
  const paused = pauseGame('rules');
  showModal(paused ? '作戰規則（已暫停）' : '作戰規則', `
    <ul class="rules">
      <li>盤面上的感染者數量固定，答案只有一種。</li>
      <li>有專長的隊員一定健康，回報一定正確。</li>
      <li><b>列</b>是橫排（數字 1、2…），<b>行</b>是直排（字母 A、B…）。</li>
      <li>點隊員會亮出紅色技能範圍，再點一次收回。</li>
      <li>標記只是幫你整理推理，系統不會告訴你對錯。</li>
      <li>一般模式：全部感染者都標記正確就勝利。硬派模式：必須把感染者全部處決。</li>
      <li>處決已標記的感染者時，分散的用手槍，相鄰聚集的用爆破。誤殺健康隊員就失敗。</li>
      <li>難度：簡單只需單一線索；普通要比對兩條線索；困難需要假設與排除。</li>
    </ul>${paused ? '<p class="pause-note">計時器和音樂已暫停，關閉後繼續。</p>' : ''}`, [[paused ? '繼續作戰' : '了解', () => resumeGame('rules'), 'primary']]);
}

// ───────── 教學模式 ─────────
function renderTutorialInfo() {
  $('#tutorialInfo').textContent = profile.tutorialDone ? '已完成，可重玩' : `進度 ${Math.min(profile.tutorialLevel || 1, 7) - 1} / 6`;
}
function finishTutorial() {
  profile.tutorialDone = true;
  saveProfile();
  renderTutorialInfo();
}

// 小地圖：用 5×5 示意這位隊員的技能範圍
const SAFE_TYPES_UI = new Set(['scout', 'patrol']);
function rangeDemo(type) {
  const clue = { type, r: 2, c: 2, tr: type === 'scout' ? 2 : 0, tc: type === 'scout' ? 0 : 2 };
  const hit = new Set(clueRange(clue, 5, 5).map(([r, c]) => r * 5 + c));
  let html = '';
  for (let i = 0; i < 25; i++) {
    const me = i === 12;
    const mark = SAFE_TYPES_UI.has(type) && hit.has(i) ? '✓' : '';
    html += `<span class="${me ? 'me' : hit.has(i) ? 'hit' : ''}">${me ? '我' : mark}</span>`;
  }
  return `<div class="range-demo" aria-label="技能範圍示意">${html}</div>`;
}

function tutorialProgress(level, doneUpTo) {
  return `<div class="tut-progress">${TUT_ORDER.map((_, k) => `<i class="${k < doneUpTo ? 'done' : k === level - 1 ? 'now' : ''}"></i>`).join('')}</div>`;
}

function showIntro(level) {
  const type = TUT_ORDER[level - 1];
  const r = ROLE_INFO[type];
  const basics = level === 1 ? `
    <div class="basics">
      怎麼玩：盤面上有 <b>${state.puzzle.total}</b> 名感染者。有專長的隊員一定健康、回報一定正確。<br>
      點隊員可看紅色技能範圍；用「標記感染／標記健康」整理推理，全部感染者標記正確就過關。<br>
      標錯不會被提醒，但若按「處決」誤殺了健康的人，就會失敗。
    </div>` : '';
  showModal(`第 ${level} 關：新隊員「${r.name}」`, `
    ${tutorialProgress(level, level - 1)}
    <div class="intro">
      <div class="intro-art">${roleSVG(type)}</div>
      <div>
        <h3>${r.name}</h3>
        <p class="skill">${r.skill}</p>
        ${rangeDemo(type)}
        <p class="tip">${TUT_TIPS[type]}</p>
        <small>辨認方式：${r.look}</small>
      </div>
    </div>${basics}`,
  [[`開始第 ${level} 關`, () => resumeGame('intro'), 'primary'],
    ['跳過教學', () => { resumeGame('intro'); finishTutorial(); newGame('normal'); }, 'ghost']], { wide: true });
}

function tutorialWin(level, secs) {
  profile.tutorialLevel = Math.max(profile.tutorialLevel || 1, level + 1);
  if (level >= 6) {
    finishTutorial();
    showModal('教學完成', `
      ${tutorialProgress(7, 6)}
      <p>六種隊員你都認識了，用時 <b>${fmt(secs)}</b>。</p>
      <p>正式作戰可以選擇陣地大小、難度與模式。困難難度的成績會登上排行榜。</p>`,
    [['開始正式作戰', () => newGame('normal'), 'primary'], ['回到簡報', goMenu, 'ghost']]);
    return;
  }
  saveProfile();
  renderTutorialInfo();
  const next = ROLE_INFO[TUT_ORDER[level]].name;
  showModal(`第 ${level} 關完成`, `
    ${tutorialProgress(level + 1, level)}
    <p>用時 <b>${fmt(secs)}</b>。下一關會加入新隊員「${next}」。</p>`,
  [[`下一關：認識${next}`, () => newGame('tutorial', level + 1), 'primary'], ['回到簡報', goMenu, 'ghost'], ['檢視盤面', null, 'ghost']]);
}

// ───────── 排行榜（只收困難難度：3 種陣地 × 2 種模式） ─────────
const MODE_NAMES = { normal: '一般模式', hardcore: '硬派模式' };
const escapeHtml = (v) => String(v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const isRanked = () => state.kind === 'normal' && state.puzzle?.difficulty === 'hard';
function boardOf() {
  return { size: `${state.puzzle.rows}x${state.puzzle.cols}`, mode: state.playMode };
}
const bestKey = (size, mode) => `plague-outpost:best:${size}:${mode}`;
function readBest(size, mode) {
  const v = Number(localStorage.getItem(bestKey(size, mode)));
  return Number.isFinite(v) && v > 0 ? v : null;
}

async function submitScore(secs, board) {
  const prev = readBest(board.size, board.mode);
  if (!prev || secs < prev) localStorage.setItem(bestKey(board.size, board.mode), String(secs));
  const best = Math.min(secs, prev || Infinity);
  const label = `${board.size.replace('x', '×')} 困難・${MODE_NAMES[board.mode]}`;
  const setInfo = (t) => { const el = $('#rankInfo'); if (el) el.textContent = t; };
  try {
    const res = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        size: board.size, mode: board.mode, seed: state.seed, secs,
        answer: [...state.puzzle.infected].sort((a, b) => a - b),
        name: plainName(), pid: profile.id,
      }),
    });
    if (res.status === 503 || res.status === 404) return setInfo(`全球排行榜尚未開通。你在 ${label} 的個人最佳是 ${fmt(best)}。`);
    const data = await res.json();
    if (!res.ok) return setInfo(`排行榜上傳失敗（${data.error || res.status}）。個人最佳 ${fmt(best)}。`);
    setInfo(`排行榜 ${label}：你目前第 ${data.rank} 名（共 ${data.total} 人），最佳 ${fmt(data.best)}。`);
  } catch {
    setInfo(`連不上排行榜。你在 ${label} 的個人最佳是 ${fmt(best)}。`);
  }
}

function showLeaderboard(size = '4x4', mode = 'normal') {
  const sizeTabs = Object.keys(BOARD_SIZES).map((k) => `<button data-size="${k}" class="${k === size ? 'selected' : ''}">${k.replace('x', '×')}</button>`).join('');
  const modeTabs = Object.keys(MODE_NAMES).map((k) => `<button data-mode="${k}" class="${k === mode ? 'selected' : ''}">${MODE_NAMES[k]}</button>`).join('');
  pauseGame('rules'); // 對局中查看排行榜也算暫停
  showModal('排行榜（困難難度）', `
    <div class="lb-tabs" id="lbSize">${sizeTabs}</div>
    <div class="lb-tabs" id="lbMode">${modeTabs}</div>
    <div id="lbBody"><p class="lb-msg">讀取中…</p></div>`,
  [['關閉', () => resumeGame('rules'), 'primary']], { wide: true });
  const load = async () => {
    const body = $('#lbBody');
    const mine = readBest(size, mode);
    const mineLine = `<p class="lb-mine">你的個人最佳：${mine ? fmt(mine) : '尚無紀錄'}</p>`;
    body.innerHTML = '<p class="lb-msg">讀取中…</p>';
    try {
      const res = await fetch(`/api/leaderboard?size=${size}&mode=${mode}&pid=${encodeURIComponent(profile.id)}`);
      if (res.status === 503 || res.status === 404) {
        body.innerHTML = `<p class="lb-msg">全球排行榜尚未開通，目前只記錄你在這台裝置上的成績。</p>${mineLine}`;
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const rows = data.entries.map((e, k) => `<tr class="${e.me ? 'me' : ''}"><td>${k + 1}</td><td>${escapeHtml(e.name)} 少校</td><td>${fmt(e.secs)}</td></tr>`).join('');
      body.innerHTML = data.entries.length
        ? `<table class="lb-table"><thead><tr><th>名次</th><th>指揮官</th><th>最佳用時</th></tr></thead><tbody>${rows}</tbody></table>
           ${data.me ? `<p class="lb-mine">你目前第 ${data.me.rank} 名，最佳 ${fmt(data.me.secs)}</p>` : mineLine}`
        : `<p class="lb-msg">還沒有人登上這個排行榜，搶下第一名吧。</p>${mineLine}`;
    } catch {
      body.innerHTML = `<p class="lb-msg">連不上排行榜，請稍後再試。</p>${mineLine}`;
    }
  };
  $('#lbSize').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    size = b.dataset.size; $$('#lbSize button').forEach((x) => x.classList.toggle('selected', x === b)); load();
  });
  $('#lbMode').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    mode = b.dataset.mode; $$('#lbMode button').forEach((x) => x.classList.toggle('selected', x === b)); load();
  });
  load();
}
