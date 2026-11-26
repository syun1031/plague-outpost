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
 */
export function generatePuzzle({ rows, cols, infected: total, reduce = 1, seed = Date.now() }) {
  const rnd = mulberry32(seed);
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
      const types = Object.keys(TYPE_WEIGHT);
      const w = types.map((t) => TYPE_WEIGHT[t] * (usedTypes.has(t) ? 1 : 3));
      let pick = rnd() * w.reduce((a, b) => a + b, 0);
      let ti = 0;
      while ((pick -= w[ti]) > 0) ti++;
      let clue = buildClue(types[ti], Math.floor(idx / cols), idx % cols, rows, cols, infected, roles, rnd);
      if (!clue) clue = buildClue('doctor', Math.floor(idx / cols), idx % cols, rows, cols, infected, roles, rnd);
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
      // 若其他偵查類角色指定此格為健康，移除後會讓那條線索指向角色以外的格子 → 仍合法
      roles.delete(k);
      if (countSolutions(rows, cols, total, roles) !== 1) roles.set(k, clue);
    }
    // 偵查類目標不可以是角色本身（移除後才可能發生的情況已在上方避免）
    return { rows, cols, total, infected, roles, seed };
  }
  throw new Error('無法產生謎題，請調整參數');
}
