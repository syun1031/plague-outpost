// 美術：俯視角角色、指揮官立繪、標記圖示（全部是內嵌 SVG，不需外部圖檔）
import { cellName, COL_LETTERS } from './puzzle.js';

export const ROLE_INFO = {
  doctor:   { name: '醫生',   skill: '周圍 8 格（含斜角）有幾個感染者', look: '白帽紅十字＋聽診器' },
  sentry:   { name: '哨兵',   skill: '這一列（橫排）有幾個感染者',      look: '綠色鋼盔＋望遠鏡' },
  scout:    { name: '偵查兵', skill: '這一列的某一格是健康的',          look: '寬邊叢林帽＋大背包' },
  radar:    { name: '雷達兵', skill: '這一行（直排）有幾個感染者',      look: '背負雷達天線碟' },
  patrol:   { name: '巡邏兵', skill: '這一行的某一格是健康的',          look: '紅色貝雷帽＋手電筒' },
  engineer: { name: '工兵',   skill: '上下左右 4 格有幾個感染者',       look: '黃色工程帽＋金屬探測器' },
};

export function clueText(clue) {
  switch (clue.type) {
    case 'doctor': return `周圍 <b>${clue.value}</b> 個`;
    case 'engineer': return `十字 <b>${clue.value}</b> 個`;
    case 'sentry': return `第${clue.r + 1}列 <b>${clue.value}</b> 個`;
    case 'radar': return `${COL_LETTERS[clue.c]}行 <b>${clue.value}</b> 個`;
    case 'scout':
    case 'patrol': return `<b>${cellName(clue.tr, clue.tc)}</b> 健康`;
  }
  return '';
}

// 共同底座：陰影＋肩膀＋手臂。俯視角，人物面向上方
const base = (body, trim, arms = '') => `
  <ellipse cx="50" cy="60" rx="34" ry="24" fill="rgba(0,0,0,.28)"/>
  ${arms}
  <ellipse cx="50" cy="56" rx="30" ry="17" fill="${body}" stroke="${trim}" stroke-width="2.5"/>
  <path d="M30 56 Q50 66 70 56" fill="none" stroke="${trim}" stroke-width="2" opacity=".55"/>`;

const armsForward = (col, trim) => `
  <path d="M26 52 Q22 38 36 30" fill="none" stroke="${trim}" stroke-width="10" stroke-linecap="round"/>
  <path d="M74 52 Q78 38 64 30" fill="none" stroke="${trim}" stroke-width="10" stroke-linecap="round"/>
  <path d="M26 52 Q22 38 36 30" fill="none" stroke="${col}" stroke-width="6.5" stroke-linecap="round"/>
  <path d="M74 52 Q78 38 64 30" fill="none" stroke="${col}" stroke-width="6.5" stroke-linecap="round"/>`;

const ROLE_SVG = {
  doctor: () => `
    <g class="fig">
      ${base('#f3f1ea', '#9aa3a8', `
        <path d="M25 54 Q16 46 22 36" fill="none" stroke="#9aa3a8" stroke-width="10" stroke-linecap="round"/>
        <path d="M25 54 Q16 46 22 36" fill="none" stroke="#f3f1ea" stroke-width="6.5" stroke-linecap="round"/>
        <g class="part-kit"><rect x="66" y="58" width="20" height="15" rx="3" fill="#c8312f" stroke="#7a1715" stroke-width="2"/>
        <path d="M76 61v9M71.5 65.5h9" stroke="#fff" stroke-width="2.6"/></g>`)}
      <path class="part-steth" d="M34 50 Q38 70 50 70 Q62 70 66 50" fill="none" stroke="#2f3538" stroke-width="2.6"/>
      <circle class="part-steth" cx="50" cy="71" r="3.4" fill="#b7c0c4" stroke="#2f3538" stroke-width="1.8"/>
      <g class="part-head">
        <circle cx="50" cy="50" r="15" fill="#fbfaf6" stroke="#9aa3a8" stroke-width="2.5"/>
        <rect x="46" y="40" width="8" height="20" rx="1.5" fill="#d23a35"/>
        <rect x="40" y="46" width="20" height="8" rx="1.5" fill="#d23a35"/>
      </g>
      <circle class="led" cx="50" cy="50" r="3" fill="#ff5b5b"/>
    </g>`,

  sentry: () => `
    <g class="fig">
      ${base('#5d6b3a', '#2e3519', armsForward('#5d6b3a', '#2e3519'))}
      <g class="part-bino">
        <rect x="36" y="20" width="11" height="15" rx="4" fill="#1d1f1c" stroke="#000" stroke-width="1.5"/>
        <rect x="53" y="20" width="11" height="15" rx="4" fill="#1d1f1c" stroke="#000" stroke-width="1.5"/>
        <rect x="46" y="25" width="8" height="5" fill="#3a3d38"/>
        <circle class="lens" cx="41.5" cy="21" r="3" fill="#7fd0ff"/>
        <circle class="lens" cx="58.5" cy="21" r="3" fill="#7fd0ff"/>
      </g>
      <g class="part-head">
        <circle cx="50" cy="48" r="16" fill="#6f7d45" stroke="#2e3519" stroke-width="2.5"/>
        <circle cx="50" cy="48" r="11" fill="none" stroke="#2e3519" stroke-width="1.6" opacity=".6" stroke-dasharray="3 3"/>
        <path d="M38 40 L62 56 M62 40 L38 56" stroke="#2e3519" stroke-width="1.2" opacity=".35"/>
      </g>
      <circle class="led" cx="50" cy="48" r="2.6" fill="#9cff6b"/>
    </g>`,

  scout: () => `
    <g class="fig">
      <ellipse cx="50" cy="60" rx="34" ry="24" fill="rgba(0,0,0,.28)"/>
      <g class="part-pack">
        <rect x="33" y="60" width="34" height="26" rx="6" fill="#7a5a33" stroke="#3e2b14" stroke-width="2.5"/>
        <rect x="38" y="64" width="24" height="9" rx="3" fill="#946f42" stroke="#3e2b14" stroke-width="1.5"/>
        <path d="M37 79h26" stroke="#3e2b14" stroke-width="2"/>
        <line x1="62" y1="62" x2="74" y2="80" stroke="#222" stroke-width="2"/>
        <circle class="led" cx="74" cy="80" r="2.6" fill="#ffcc33"/>
      </g>
      <ellipse cx="50" cy="56" rx="29" ry="15" fill="#a08a5a" stroke="#4d4024" stroke-width="2.5"/>
      <path d="M30 52 l8 4 M66 50 l-6 6 M44 62 l6 -3" stroke="#6f6038" stroke-width="3" stroke-linecap="round"/>
      <path d="M37 50 L44 66 M63 50 L56 66" stroke="#3e2b14" stroke-width="3"/>
      <g class="part-head">
        <circle cx="50" cy="46" r="20" fill="#b9a26a" stroke="#4d4024" stroke-width="2.5"/>
        <circle cx="50" cy="46" r="11" fill="#a38c55" stroke="#4d4024" stroke-width="2"/>
        <path d="M33 40 Q50 30 67 40" fill="none" stroke="#4d4024" stroke-width="1.4" opacity=".5"/>
      </g>
    </g>`,

  radar: () => `
    <g class="fig">
      <ellipse cx="50" cy="60" rx="34" ry="24" fill="rgba(0,0,0,.28)"/>
      <ellipse cx="50" cy="56" rx="30" ry="17" fill="#2f4a6b" stroke="#14243a" stroke-width="2.5"/>
      <rect x="38" y="60" width="24" height="18" rx="3" fill="#3c4f63" stroke="#14243a" stroke-width="2"/>
      <g class="part-dish">
        <ellipse cx="50" cy="72" rx="24" ry="9" fill="#cfd8df" stroke="#55626d" stroke-width="2.5"/>
        <ellipse cx="50" cy="72" rx="15" ry="5" fill="none" stroke="#8a97a1" stroke-width="1.5"/>
        <line x1="50" y1="72" x2="50" y2="58" stroke="#55626d" stroke-width="2.5"/>
        <circle cx="50" cy="58" r="3" fill="#ff5b5b"/>
      </g>
      <g class="part-head">
        <circle cx="50" cy="46" r="14" fill="#203247" stroke="#0c1826" stroke-width="2.5"/>
        <path d="M35 46 Q50 28 65 46" fill="none" stroke="#9fb0bf" stroke-width="3.5"/>
        <rect x="31" y="42" width="7" height="10" rx="2" fill="#9fb0bf"/>
        <rect x="62" y="42" width="7" height="10" rx="2" fill="#9fb0bf"/>
      </g>
      <circle class="led" cx="50" cy="58" r="3" fill="#ff5b5b"/>
    </g>`,

  patrol: () => `
    <g class="fig">
      <path class="part-beam" d="M58 26 L44 -14 L88 -6 Z" fill="url(#beamGrad)" opacity="0"/>
      ${base('#33373a', '#121416', `
        <path d="M74 52 Q80 40 64 30" fill="none" stroke="#121416" stroke-width="10" stroke-linecap="round"/>
        <path d="M74 52 Q80 40 64 30" fill="none" stroke="#33373a" stroke-width="6.5" stroke-linecap="round"/>
        <path d="M26 54 Q18 48 22 40" fill="none" stroke="#121416" stroke-width="10" stroke-linecap="round"/>
        <path d="M26 54 Q18 48 22 40" fill="none" stroke="#33373a" stroke-width="6.5" stroke-linecap="round"/>`)}
      <g class="part-torch">
        <rect x="56" y="18" width="9" height="16" rx="2" transform="rotate(20 60 26)" fill="#c9cdd1" stroke="#444" stroke-width="1.5"/>
        <circle class="lens" cx="57" cy="19" r="3.4" fill="#fff6c2"/>
      </g>
      <g class="part-head">
        <circle cx="50" cy="48" r="14" fill="#2a2420" stroke="#120e0b" stroke-width="2"/>
        <path d="M36 50 Q34 32 54 33 Q70 36 66 48 Q58 44 36 50Z" fill="#9b1f2a" stroke="#4e0b12" stroke-width="2.2"/>
        <circle cx="42" cy="43" r="3" fill="#e5c14a"/>
      </g>
    </g>`,

  engineer: () => `
    <g class="fig">
      <ellipse cx="50" cy="60" rx="34" ry="24" fill="rgba(0,0,0,.28)"/>
      <g class="part-detector">
        <line x1="62" y1="40" x2="70" y2="6" stroke="#2a2a2a" stroke-width="3.2"/>
        <ellipse cx="71" cy="6" rx="11" ry="6" fill="#3b3f44" stroke="#111" stroke-width="2"/>
        <ellipse cx="71" cy="6" rx="6" ry="3" fill="none" stroke="#7bdcff" stroke-width="1.5"/>
        <circle class="led" cx="64" cy="30" r="2.6" fill="#7bdcff"/>
      </g>
      ${base('#e07a1f', '#7a3b05', `
        <path d="M74 52 Q78 42 64 38" fill="none" stroke="#7a3b05" stroke-width="10" stroke-linecap="round"/>
        <path d="M74 52 Q78 42 64 38" fill="none" stroke="#e07a1f" stroke-width="6.5" stroke-linecap="round"/>`)}
      <path d="M28 54 L72 54" stroke="#e8f05a" stroke-width="3.2"/>
      <path d="M40 46 L40 66 M60 46 L60 66" stroke="#e8f05a" stroke-width="3.2"/>
      <g class="part-head">
        <circle cx="50" cy="47" r="16" fill="#f5c518" stroke="#8a6a00" stroke-width="2.5"/>
        <path d="M50 31 L50 63" stroke="#c99e00" stroke-width="4"/>
        <path d="M36 54 Q50 64 64 54" fill="none" stroke="#8a6a00" stroke-width="2.5"/>
      </g>
    </g>`,
};

export function roleSVG(type) {
  return `<svg class="role-svg role-${type}" viewBox="8 8 84 84" aria-hidden="true">
    <defs><linearGradient id="beamGrad" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#fff3a8" stop-opacity=".85"/><stop offset="1" stop-color="#fff3a8" stop-opacity="0"/>
    </linearGradient></defs>
    ${ROLE_SVG[type]()}</svg>`;
}

// 未知人員：灰色兜帽，俯視
export function unknownSVG() {
  return `<svg class="unknown-svg" viewBox="8 8 84 84" aria-hidden="true">
    <ellipse cx="50" cy="60" rx="32" ry="22" fill="rgba(0,0,0,.22)"/>
    <ellipse cx="50" cy="57" rx="28" ry="16" fill="#6e6a62" stroke="#3b3833" stroke-width="2.5"/>
    <circle cx="50" cy="48" r="15" fill="#7d786f" stroke="#3b3833" stroke-width="2.5"/>
    <path d="M38 52 Q50 62 62 52" fill="none" stroke="#3b3833" stroke-width="2" opacity=".5"/>
  </svg>`;
}

export const MARK_SVG = {
  healthy: `<svg viewBox="0 0 40 40" aria-hidden="true">
    <path d="M20 3 L34 8 V19 C34 28 27 34 20 37 C13 34 6 28 6 19 V8 Z" fill="#2f9e5b" stroke="#0f4d28" stroke-width="2.5"/>
    <path d="M13 20 L18 25 L28 14" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  infected: `<svg viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="17" fill="#c8312f" stroke="#5c0c0b" stroke-width="2.5"/>
    <g fill="none" stroke="#fff" stroke-width="2.6">
      <circle cx="20" cy="20" r="3.2"/>
      <path d="M20 16.8 a7 7 0 1 1 0.01 0 M20 9 v4 M20 27 v4 M9 20 h4 M27 20 h4"/>
    </g>
    <g fill="#fff"><circle cx="20" cy="11" r="2.2"/><circle cx="12.2" cy="24.5" r="2.2"/><circle cx="27.8" cy="24.5" r="2.2"/></g></svg>`,
};

// 指揮官立繪（正面半身）
export function commanderSVG(kind) {
  if (kind === 'female') {
    return `<svg viewBox="0 0 200 220" class="cmd-svg" aria-hidden="true">
      <defs><linearGradient id="fUni" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5a3a"/><stop offset="1" stop-color="#2f3a24"/></linearGradient></defs>
      <path d="M58 92 Q44 150 60 168 L140 168 Q156 150 142 92 Z" fill="#2b1d16"/>
      <path d="M20 220 Q24 168 70 156 L100 172 L130 156 Q176 168 180 220 Z" fill="url(#fUni)"/>
      <path d="M70 156 L100 200 L130 156 L118 152 L100 176 L82 152 Z" fill="#ece6d6"/>
      <path d="M92 176 L100 210 L108 176 L100 170Z" fill="#7a1d24"/>
      <rect x="36" y="178" width="28" height="9" rx="2" fill="#d8b24a"/>
      <rect x="40" y="190" width="20" height="5" rx="2" fill="#b83a3a"/><rect x="40" y="198" width="20" height="5" rx="2" fill="#3a6ab8"/>
      <path d="M86 140 h28 v22 q-14 8 -28 0z" fill="#e8b996"/>
      <ellipse cx="100" cy="104" rx="36" ry="42" fill="#f1c6a4"/>
      <path d="M62 100 Q60 56 100 54 Q142 56 138 104 Q132 80 114 74 Q96 88 66 92Z" fill="#3a271c"/>
      <path d="M62 100 Q56 128 66 140 Q64 116 68 100Z" fill="#3a271c"/>
      <path d="M138 100 Q146 128 134 140 Q136 116 132 100Z" fill="#3a271c"/>
      <ellipse cx="100" cy="58" rx="46" ry="16" fill="#7a1d24" transform="rotate(-8 100 58)"/>
      <path d="M58 64 Q100 44 146 52 Q150 60 140 66 Q100 58 60 72Z" fill="#5a1219"/>
      <circle cx="74" cy="58" r="8" fill="#e5c14a" stroke="#8a6a00" stroke-width="2"/>
      <path d="M80 104 q6 -4 12 0 M108 104 q6 -4 12 0" stroke="#2b1d16" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="86" cy="110" rx="3.6" ry="4.4" fill="#2b1d16"/><ellipse cx="114" cy="110" rx="3.6" ry="4.4" fill="#2b1d16"/>
      <path d="M77 98 q9 -6 18 -1 M105 97 q9 -5 18 1" stroke="#3a271c" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M100 112 q-3 10 1 12" stroke="#c99878" stroke-width="2.4" fill="none"/>
      <path d="M90 130 q10 6 20 0" stroke="#a8433f" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <ellipse cx="80" cy="122" rx="6" ry="3.5" fill="#f2a89a" opacity=".5"/><ellipse cx="120" cy="122" rx="6" ry="3.5" fill="#f2a89a" opacity=".5"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 200 220" class="cmd-svg" aria-hidden="true">
    <defs><linearGradient id="mUni" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d4f5e"/><stop offset="1" stop-color="#25323d"/></linearGradient></defs>
    <path d="M14 220 Q18 164 68 152 L100 170 L132 152 Q182 164 186 220 Z" fill="url(#mUni)"/>
    <path d="M68 152 L100 198 L132 152 L120 148 L100 174 L80 148 Z" fill="#e9e4d8"/>
    <path d="M93 174 L100 212 L107 174 L100 168Z" fill="#20272e"/>
    <rect x="30" y="176" width="30" height="9" rx="2" fill="#d8b24a"/>
    <rect x="34" y="188" width="22" height="5" rx="2" fill="#2f8f5a"/><rect x="34" y="196" width="22" height="5" rx="2" fill="#b83a3a"/>
    <path d="M150 170 l8 -6 l8 6 l-8 6z" fill="#d8b24a"/><path d="M150 184 l8 -6 l8 6 l-8 6z" fill="#d8b24a"/>
    <path d="M84 136 h32 v24 q-16 8 -32 0z" fill="#d8a582"/>
    <path d="M62 100 Q60 150 100 152 Q140 150 138 100 Z" fill="#e7b48f"/>
    <ellipse cx="100" cy="104" rx="38" ry="44" fill="#e7b48f"/>
    <path d="M66 120 Q70 150 100 150 Q130 150 134 120 Q126 140 100 140 Q74 140 66 120Z" fill="#c69273" opacity=".55"/>
    <path d="M62 96 Q62 72 76 70 L124 70 Q138 72 138 96 L132 86 L68 86 Z" fill="#2a211b"/>
    <path d="M52 70 Q100 30 148 70 L144 80 Q100 66 56 80Z" fill="#26323d"/>
    <path d="M50 80 Q100 64 150 80 L146 88 Q100 76 54 88Z" fill="#1a232b"/>
    <path d="M56 82 Q100 98 144 82 Q138 96 100 100 Q62 96 56 82Z" fill="#14191e"/>
    <path d="M90 60 l10 -8 l10 8 l-10 8z" fill="#d8b24a" stroke="#8a6a00" stroke-width="1.5"/>
    <path d="M78 108 h16 M106 108 h16" stroke="#2a211b" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="86" cy="116" rx="3.6" ry="4" fill="#20180f"/><ellipse cx="114" cy="116" rx="3.6" ry="4" fill="#20180f"/>
    <path d="M100 116 q-4 12 2 14" stroke="#b98262" stroke-width="2.6" fill="none"/>
    <path d="M88 136 q12 4 24 0" stroke="#7a3f30" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path d="M122 124 l8 10" stroke="#b98262" stroke-width="2" opacity=".7"/>
  </svg>`;
}
