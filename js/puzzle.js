// 謎題核心：線索定義、解題器（計算解的數量）、謎題產生器
// 座標慣例：r = 列（橫排，用數字 1..rows），c = 行（直排，用字母 A..）

export const COL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function cellName(r, c) {
  return `${COL_LETTERS[c]}${r + 1}`;
}

// 各角色的「技能範圍」：回傳 [r, c] 陣列
export function clueRange(clue, rows, cols) {
  const out = [];
  const inB = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;
  switch (clue.type) {
    case 'doctor': // 周圍 8 格
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          if ((dr || dc) && inB(clue.r + dr, clue.c + dc)) out.push([clue.r + dr, clue.c + dc]);
      break;
    case 'engineer': // 上下左右 4 格
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]])
        if (inB(clue.r + dr, clue.c + dc)) out.push([clue.r + dr, clue.c + dc]);
      break;
    case 'sentry': // 同一列（橫排）
      for (let c = 0; c < cols; c++) if (c !== clue.c) out.push([clue.r, c]);
      break;
    case 'radar': // 同一行（直排）
      for (let r = 0; r < rows; r++) if (r !== clue.r) out.push([r, clue.c]);
      break;
    case 'scout': // 同一列的某一格
    case 'patrol': // 同一行的某一格
      out.push([clue.tr, clue.tc]);
      break;
  }
  return out;
}

export const COUNT_TYPES = new Set(['doctor', 'engineer', 'sentry', 'radar']);
export const SAFE_TYPES = new Set(['scout', 'patrol']);

// 計算謎題解的數量（找到 limit 個就停）
// roles: Map<idx, clue>；角色本身一定是健康的
export function countSolutions(rows, cols, total, roles, limit = 2) {
  const n = rows * cols;
  const val = new Int8Array(n).fill(-1); // -1 未知, 0 健康, 1 感染
  for (const idx of roles.keys()) val[idx] = 0;
  for (const clue of roles.values()) {
    if (SAFE_TYPES.has(clue.type)) val[clue.tr * cols + clue.tc] = 0;
  }

  // 限制式：{ cells, value }
  const cons = [];
  for (const clue of roles.values()) {
    if (!COUNT_TYPES.has(clue.type)) continue;
    const cells = clueRange(clue, rows, cols).map(([r, c]) => r * cols + c);
    cons.push({ cells, value: clue.value });
  }
  const all = [];
  for (let i = 0; i < n; i++) all.push(i);
  cons.push({ cells: all, value: total });

  const byCell = Array.from({ length: n }, () => []);
  cons.forEach((k, ki) => k.cells.forEach((i) => byCell[i].push(ki)));

  const ones = new Int16Array(cons.length);
  const unknown = new Int16Array(cons.length);
  cons.forEach((k, ki) => {
    for (const i of k.cells) {
      if (val[i] === 1) ones[ki]++;
      else if (val[i] === -1) unknown[ki]++;
    }
  });
  for (let ki = 0; ki < cons.length; ki++) {
    if (ones[ki] > cons[ki].value || ones[ki] + unknown[ki] < cons[ki].value) return 0;
  }

  // 優先處理被最多限制式涵蓋的格子，剪枝較快
  const order = [];
  for (let i = 0; i < n; i++) if (val[i] === -1) order.push(i);
  order.sort((a, b) => byCell[b].length - byCell[a].length);

  let found = 0;
  const assign = (i, v) => {
    val[i] = v;
    let ok = true;
    for (const ki of byCell[i]) {
      unknown[ki]--;
      if (v === 1) ones[ki]++;
      if (ones[ki] > cons[ki].value || ones[ki] + unknown[ki] < cons[ki].value) ok = false;
    }
    return ok;
  };
  const undo = (i, v) => {
    val[i] = -1;
    for (const ki of byCell[i]) {
      unknown[ki]++;
      if (v === 1) ones[ki]--;
    }
  };
  const dfs = (k) => {
    if (found >= limit) return;
    if (k === order.length) { found++; return; }
    const i = order[k];
    for (const v of [0, 1]) {
      if (assign(i, v)) dfs(k + 1);
      undo(i, v);
      if (found >= limit) return;
    }
  };
  dfs(0);
  return found;
}

/**
 * 模擬玩家的邏輯推理（不猜測），回傳能否解開與用到的最高規則等級
 * 等級 1：單一線索直接推出（剩下的格子要嘛全感染、要嘛全健康）
 * 等級 2：兩條線索相減（一條的範圍包含另一條，差集可直接判斷）
 */
export function logicSolve(rows, cols, total, roles, maxLevel = 2) {
  const n = rows * cols;
  const val = new Int8Array(n).fill(-1);
  for (const idx of roles.keys()) val[idx] = 0;
  for (const clue of roles.values()) if (SAFE_TYPES.has(clue.type)) val[clue.tr * cols + clue.tc] = 0;
  const cons = [];
  for (const clue of roles.values()) {
    if (!COUNT_TYPES.has(clue.type)) continue;
    cons.push({ cells: clueRange(clue, rows, cols).map(([r, c]) => r * cols + c), value: clue.value });
  }
  cons.push({ cells: [...Array(n).keys()], value: total });

  let level = 0;
  const view = (k) => {
    const unk = [];
    let ones = 0;
    for (const i of k.cells) { if (val[i] === 1) ones++; else if (val[i] === -1) unk.push(i); }
    return { unk, need: k.value - ones };
  };
  for (;;) {
    let progress = false;
    for (const k of cons) {
      const { unk, need } = view(k);
      if (!unk.length) continue;
      if (need === 0 || need === unk.length) {
        for (const i of unk) val[i] = need === 0 ? 0 : 1;
        progress = true;
      }
    }
    if (progress) { level = Math.max(level, 1); continue; }
    if (maxLevel >= 2) {
      const views = cons.map(view).filter((v) => v.unk.length);
      outer: for (const a of views) {
        const setA = new Set(a.unk);
        for (const b of views) {
          if (a === b || b.unk.length <= a.unk.length) continue;
          if (!a.unk.every((i) => b.unk.includes(i))) continue;
          const rest = b.unk.filter((i) => !setA.has(i));
          const d = b.need - a.need;
          if (d === 0 || d === rest.length) {
            for (const i of rest) val[i] = d === 0 ? 0 : 1;
            progress = true;
            break outer;
          }
        }
      }
      if (progress) { level = 2; continue; }
    }
    break;
  }
  return { solved: !val.includes(-1), level };
}

export const DIFFICULTY = {
  easy:   { name: '簡單', reduce: 0.45 },
  normal: { name: '普通', reduce: 1 },
  hard:   { name: '困難', reduce: 1 },
};

/**
 * 依難度產生謎題（同樣的 seed 一定產生同一題，可用於每日題）
 * 簡單：只靠單一線索就能解完
 * 普通：需要用到「兩條線索相減」，但不需要猜
 * 困難：以上兩種規則解不完，需要更深的推理（假設與排除）
 */
export function generateByDifficulty({ rows, cols, infected, difficulty = 'normal', seed = Date.now(), types, mustInclude }) {
  const { reduce } = DIFFICULTY[difficulty];
  let fallback = null;
  for (let k = 0; k < 120; k++) {
    const p = generatePuzzle({ rows, cols, infected, reduce, seed: seed + k * 101, types, mustInclude });
    if (mustInclude && ![...p.roles.values()].some((c) => c.type === mustInclude)) continue;
    const r = logicSolve(rows, cols, infected, p.roles, 2);
    p.difficulty = difficulty;
    if (difficulty === 'easy' && r.solved && r.level <= 1) return p;
    if (difficulty === 'normal' && r.solved && r.level === 2) return p;
    if (difficulty === 'hard' && !r.solved) return p;
    if (!fallback && (difficulty !== 'easy' || r.solved)) fallback = p;
  }
  return fallback || generatePuzzle({ rows, cols, infected, reduce, seed, types, mustInclude });
}

function shuffle(a, rnd) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 可重現的亂數（用種子產生同一題）
export function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const TYPE_WEIGHT = { doctor: 3, sentry: 2, radar: 2, engineer: 2, scout: 1.4, patrol: 1.4 };

function buildClue(type, r, c, rows, cols, infected, roles, rnd) {
  const clue = { type, r, c };
  if (SAFE_TYPES.has(type)) {
    // 目標必須是：健康、還不是角色、也還沒被其他偵查類角色指定過
    const taken = new Set([...roles.values()].filter((k) => SAFE_TYPES.has(k.type)).map((k) => k.tr * cols + k.tc));
    const cands = [];
    if (type === 'scout') for (let x = 0; x < cols; x++) cands.push([r, x]);
    else for (let y = 0; y < rows; y++) cands.push([y, c]);
    const ok = cands.filter(([y, x]) => {
      const i = y * cols + x;
      return !(y === r && x === c) && !infected.has(i) && !roles.has(i) && !taken.has(i);
    });
    if (!ok.length) return null;
    const [tr, tc] = ok[Math.floor(rnd() * ok.length)];
    clue.tr = tr; clue.tc = tc;
  } else {
    clue.value = clueRange(clue, rows, cols).filter(([y, x]) => infected.has(y * cols + x)).length;
  }
  return clue;
}

/**
 * 產生一題唯一解的謎題
 * @param {{rows:number, cols:number, infected:number, reduce?:number, seed?:number}} opt
 *   reduce：0~1，移除多餘線索的比例（越高越難）
 *   types：可出現的角色（教學關卡用），預設全部
 *   mustInclude：一定要出現的角色，刪線索時會保留至少一位
 */
export function generatePuzzle({ rows, cols, infected: total, reduce = 1, seed = Date.now(), types: allowed, mustInclude }) {
  const rnd = mulberry32(seed);
  const types = Object.keys(TYPE_WEIGHT).filter((t) => !allowed || allowed.includes(t));
  const fallbackType = types.find((t) => COUNT_TYPES.has(t)) || 'doctor';
  const n = rows * cols;
  for (let attempt = 0; attempt < 200; attempt++) {
    const infected = new Set(shuffle([...Array(n).keys()], rnd).slice(0, total));
    const roles = new Map();
    const usedTypes = new Set();
    let unique = false;
    let guard = 0;
    while (!unique && guard++ < n * 3) {
      const safeTargets = new Set([...roles.values()].filter((k) => SAFE_TYPES.has(k.type)).map((k) => k.tr * cols + k.tc));
      const free = [...Array(n).keys()].filter((i) => !infected.has(i) && !roles.has(i) && !safeTargets.has(i));
      if (!free.length) break;
      const idx = free[Math.floor(rnd() * free.length)];
      // 依權重挑角色，還沒出現過的角色權重加倍，讓盤面角色多樣
      const w = types.map((t) => TYPE_WEIGHT[t] * (usedTypes.has(t) ? 1 : 3));
      let pick = rnd() * w.reduce((a, b) => a + b, 0);
      let ti = 0;
      while ((pick -= w[ti]) > 0) ti++;
      let clue = buildClue(types[ti], Math.floor(idx / cols), idx % cols, rows, cols, infected, roles, rnd);
      if (!clue) clue = buildClue(fallbackType, Math.floor(idx / cols), idx % cols, rows, cols, infected, roles, rnd);
      roles.set(idx, clue);
      usedTypes.add(clue.type);
      unique = countSolutions(rows, cols, total, roles) === 1;
    }
    if (!unique) continue;

    // 刪掉多餘線索，讓題目更精簡（仍保持唯一解）
    const keys = shuffle([...roles.keys()], rnd);
    for (const k of keys) {
      if (rnd() > reduce) continue;
      const clue = roles.get(k);
      if (clue.type === mustInclude && [...roles.values()].filter((c) => c.type === mustInclude).length === 1) continue;
      // 若其他偵查類角色指定此格為健康，移除後會讓那條線索指向角色以外的格子 → 仍合法
      roles.delete(k);
      if (countSolutions(rows, cols, total, roles) !== 1) roles.set(k, clue);
    }
    // 偵查類目標不可以是角色本身（移除後才可能發生的情況已在上方避免）
    return { rows, cols, total, infected, roles, seed };
  }
  throw new Error('無法產生謎題，請調整參數');
}
