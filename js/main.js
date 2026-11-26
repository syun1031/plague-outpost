import { generateByDifficulty, clueRange, cellName, DIFFICULTY } from './puzzle.js';
import { ROLE_INFO, roleSVG, unknownSVG, MARK_SVG, clueText } from './art.js';
import { commanderSVG } from './commander.js';
import { FX } from './fx.js';
import { sfx, setMuted, isMuted } from './audio.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const CMD = { male: '霍克 少校', female: '薇拉 少校' };
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
  mode: 'normal', // normal：標記全對即勝利；hardcore：必須處決全部感染者
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
  const rec = { result, secs, mode: state.mode };
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

// ───────── 開始畫面 ─────────
$$('.cmd-art').forEach((el) => (el.innerHTML = commanderSVG(el.dataset.art)));
$$('.cmd-opt').forEach((b) => b.addEventListener('click', () => {
  $$('.cmd-opt').forEach((x) => x.classList.toggle('selected', x === b));
  state.cmd = b.dataset.cmd;
  sfx('click');
}));
$$('.seg').forEach((seg) => seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
  seg.querySelectorAll('button').forEach((x) => x.classList.toggle('selected', x === b));
  const v = b.dataset.v;
  if (seg.dataset.key === 'size') state.size = v.split('x').map(Number);
  else state[seg.dataset.key] = v;
  sfx('click');
})));
renderDailyInfo();

function enterGame(daily) {
  $('#start').classList.add('hidden');
  $('#game').classList.remove('hidden');
  $('#cmdName').textContent = `指揮官 ${CMD[state.cmd]}`;
  setExpr('neutral');
  newGame(daily);
}
$('#btnStart').addEventListener('click', () => enterGame(false));
$('#btnDaily').addEventListener('click', () => enterGame(true));
$('#btnMenu').addEventListener('click', () => {
  if (state.busy) return;
  clearInterval(state.timer);
  renderDailyInfo();
  $('#game').classList.add('hidden');
  $('#start').classList.remove('hidden');
});
$('#btnNew').addEventListener('click', () => !state.busy && newGame(false));
$('#btnMute').addEventListener('click', () => {
  setMuted(!isMuted());
  $('#btnMute').textContent = isMuted() ? '音效關' : '音效開';
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
function newGame(daily) {
  let rows, cols, total, difficulty, seed;
  if (daily) {
    [rows, cols, total] = DAILY.size;
    difficulty = DAILY.difficulty;
    state.daily = todayStr();
    seed = hashSeed(`daily-${state.daily}`);
  } else {
    [rows, cols, total] = state.size;
    difficulty = state.difficulty;
    state.daily = null;
    seed = (Math.random() * 1e9) | 0;
  }
  state.puzzle = generateByDifficulty({ rows, cols, infected: total, difficulty, seed });
  state.marks.clear();
  state.dead.clear();
  state.active = null;
  state.over = false;
  state.busy = false;
  const modeName = state.mode === 'hardcore' ? '硬派模式' : '一般模式';
  $('#missionTag').textContent = daily
    ? `今日任務 ${state.daily}　${rows}×${cols} ${DIFFICULTY[difficulty].name}　${modeName}`
    : `${rows}×${cols}　${DIFFICULTY[difficulty].name}　${modeName}　編號 ${seed.toString(36).toUpperCase()}`;
  $('#game').classList.remove('lost');
  buildBoard();
  say(state.mode === 'hardcore' ? '硬派模式：必須親手處決全部感染者才算完成。' : pick(LINES.start));
  clearInterval(state.timer);
  state.t0 = Date.now();
  state.timer = setInterval(tick, 1000);
  tick();
}

const elapsed = () => Math.floor((Date.now() - state.t0) / 1000);
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
    if (state.mode === 'hardcore' || state.marks.get(i) !== 'infected') return false;
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
  clearInterval(state.timer);
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
  sfx('win');
  if (state.daily) saveDaily(state.daily, 'win', secs);
  const r = $('#board').getBoundingClientRect();
  fx.victory({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  const extra = state.daily ? `<p>今日任務完成。明天會有新的一題。</p>` : '';
  setTimeout(() => showModal('陣地淨化完成', `<p>所有感染者都已找出，用時 <b>${fmt(secs)}</b>。</p>${extra}`,
    [['再來一局', () => newGame(false), 'primary'], ['檢視盤面', null, 'ghost']]), 1200);
}

function lose(wrong) {
  state.over = true;
  clearInterval(state.timer);
  $('#game').classList.add('lost');
  for (const i of state.puzzle.infected) if (!state.dead.has(i)) cellEl(i).classList.add('reveal-infected');
  updateStatus();
  say(pick(LINES.lose), 'grim');
  sfx('lose');
  fx.defeat();
  if (state.daily) saveDaily(state.daily, 'lose', elapsed());
  const names = wrong.map((i) => cellName(Math.floor(i / state.puzzle.cols), i % state.puzzle.cols)).join('、');
  const retry = state.daily ? [['重試今日任務', () => newGame(true), 'primary']] : [['再來一局', () => newGame(false), 'primary']];
  setTimeout(() => showModal('任務失敗', `<p><b>${names}</b> 是健康的隊員。<br>紅框格是真正的感染者位置。</p>`,
    [...retry, ['檢視盤面', null, 'ghost']]), 1500);
}

function showModal(title, body, btns) {
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

function showRules() {
  showModal('作戰規則', `
    <ul class="rules">
      <li>盤面上的感染者數量固定，答案只有一種。</li>
      <li>有專長的隊員一定健康，回報一定正確。</li>
      <li><b>列</b>是橫排（數字 1、2…），<b>行</b>是直排（字母 A、B…）。</li>
      <li>點隊員會亮出紅色技能範圍，再點一次收回。</li>
      <li>標記只是幫你整理推理，系統不會告訴你對錯。</li>
      <li>一般模式：全部感染者都標記正確就勝利。硬派模式：必須把感染者全部處決。</li>
      <li>處決已標記的感染者時，分散的用手槍，相鄰聚集的用爆破。誤殺健康隊員就失敗。</li>
      <li>難度：簡單只需單一線索；普通要比對兩條線索；困難需要假設與排除。</li>
    </ul>`, [['了解', null, 'primary']]);
}
