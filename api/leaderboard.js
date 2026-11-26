// 排行榜 API（Vercel Function）
// 只收「困難」難度：3 種陣地 × 2 種模式 = 6 個排行榜，以最佳用時排名（越短越好）
// 資料存在 Upstash Redis（在 Vercel 的 Storage / Marketplace 連接後，環境變數會自動注入）
//
// GET  /api/leaderboard?size=4x4&mode=normal&pid=<玩家 id>  → 前 20 名＋自己的名次
// POST /api/leaderboard  { size, mode, seed, answer, secs, name, pid } → 上傳成績
//
// 防作弊（基本）：伺服器用同一個 seed 重新產生題目，確認送來的答案就是正確解答。
// 用時無法在伺服器驗證，只做合理範圍檢查。
import { generateByDifficulty } from '../js/puzzle.js';

const BOARDS = { '4x4': [4, 4, 3], '5x5': [5, 5, 5], '6x6': [6, 6, 7] };
const MODES = new Set(['normal', 'hardcore']);
const TOP = 20;
const KEEP = 500; // 每個排行榜最多保留的人數

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(commands) {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  return (await res.json()).map((r) => {
    if (r.error) throw new Error(r.error);
    return r.result;
  });
}

const boardKey = (size, mode) => `lb:hard:${size}:${mode}`;
const validPid = (v) => typeof v === 'string' && /^[A-Za-z0-9-]{8,48}$/.test(v);
const cleanName = (v) => String(v ?? '').replace(/[\u0000-\u001f<>&"'`]/g, '').trim().slice(0, 10);

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!REDIS_URL || !REDIS_TOKEN) return res.status(503).json({ error: 'not_configured' });

  try {
    if (req.method === 'GET') {
      const { size, mode, pid } = req.query;
      if (!BOARDS[size] || !MODES.has(mode)) return res.status(400).json({ error: 'bad_board' });
      const key = boardKey(size, mode);
      const me = validPid(pid) ? pid : '-';
      const [range, rank, score] = await redis([
        ['ZRANGE', key, 0, TOP - 1, 'WITHSCORES'],
        ['ZRANK', key, me],
        ['ZSCORE', key, me],
      ]);
      const ids = range.filter((_, i) => i % 2 === 0);
      const secs = range.filter((_, i) => i % 2 === 1).map(Number);
      const [names] = ids.length ? await redis([['HMGET', `${key}:names`, ...ids]]) : [[]];
      return res.status(200).json({
        entries: ids.map((id, i) => ({ name: names[i] || '無名', secs: secs[i], me: id === me })),
        me: rank === null || rank === undefined ? null : { rank: rank + 1, secs: Number(score) },
      });
    }

    if (req.method === 'POST') {
      const b = readBody(req);
      const size = b.size, mode = b.mode;
      if (!BOARDS[size] || !MODES.has(mode)) return res.status(400).json({ error: 'bad_board' });
      if (!validPid(b.pid)) return res.status(400).json({ error: 'bad_player' });
      const secs = Number(b.secs);
      if (!Number.isInteger(secs) || secs < 3 || secs > 24 * 3600) return res.status(400).json({ error: 'bad_time' });
      const seed = Number(b.seed);
      if (!Number.isInteger(seed) || seed < 0 || seed > 2 ** 32) return res.status(400).json({ error: 'bad_seed' });
      const name = cleanName(b.name) || '無名';

      // 用同一個 seed 重新產生困難題，檢查答案是否正確
      const [rows, cols, infected] = BOARDS[size];
      const puzzle = generateByDifficulty({ rows, cols, infected, difficulty: 'hard', seed });
      const answer = Array.isArray(b.answer) ? [...new Set(b.answer.map(Number))].sort((x, y) => x - y) : [];
      const truth = [...puzzle.infected].sort((x, y) => x - y);
      if (answer.length !== truth.length || answer.some((v, i) => v !== truth[i])) {
        return res.status(400).json({ error: 'wrong_answer' });
      }

      const key = boardKey(size, mode);
      const out = await redis([
        ['ZADD', key, 'LT', secs, b.pid], // 只在比原本快時更新
        ['HSET', `${key}:names`, b.pid, name],
        ['ZRANK', key, b.pid],
        ['ZSCORE', key, b.pid],
        ['ZCARD', key],
      ]);
      const total = out[4];
      if (total > KEEP) await redis([['ZREMRANGEBYRANK', key, KEEP, -1]]);
      return res.status(200).json({ rank: out[2] + 1, best: Number(out[3]), total: Math.min(total, KEEP) });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('leaderboard error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
