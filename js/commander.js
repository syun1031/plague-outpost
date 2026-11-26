// 指揮官立繪（正面半身，含表情：neutral 平常 / talk 說話 / happy 高興 / grim 凝重）

const EXPR = {
  male: {
    brows: {
      neutral: ['M76 99 Q85 96 95 100', 'M105 100 Q115 96 124 99'],
      talk:    ['M76 97 Q85 94 95 98', 'M105 98 Q115 94 124 97'],
      happy:   ['M76 98 Q85 93 95 98', 'M105 98 Q115 93 124 98'],
      grim:    ['M76 96 Q86 98 96 103', 'M104 103 Q114 98 124 96'],
    },
    mouth: {
      neutral: '<path d="M90 137 Q100 139 110 137" stroke="#6e3b2a" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
      talk:    '<path d="M90 135 Q100 133 110 135 Q107 145 100 145 Q93 145 90 135Z" fill="#5a2018"/><path d="M92 136 Q100 135 108 136 L107 138 Q100 137 93 138Z" fill="#f4efe6"/>',
      happy:   '<path d="M87 134 Q100 146 113 134" stroke="#6e3b2a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M84 131 Q86 134 87 136 M116 131 Q114 134 113 136" stroke="#b07856" stroke-width="1.6" fill="none"/>',
      grim:    '<path d="M90 140 Q100 135 110 140" stroke="#6e3b2a" stroke-width="2.8" fill="none" stroke-linecap="round"/>',
    },
  },
  female: {
    brows: {
      neutral: ['M77 99 Q86 94 95 98', 'M105 98 Q114 94 123 99'],
      talk:    ['M77 97 Q86 92 95 96', 'M105 96 Q114 92 123 97'],
      happy:   ['M77 97 Q86 91 95 96', 'M105 96 Q114 91 123 97'],
      grim:    ['M77 96 Q87 97 96 102', 'M104 102 Q113 97 123 96'],
    },
    mouth: {
      neutral: '<path d="M92 136 Q96 134 100 135.5 Q104 134 108 136 Q100 140 92 136Z" fill="#b5504a"/>',
      talk:    '<path d="M92 135 Q100 132 108 135 Q105 144 100 144 Q95 144 92 135Z" fill="#6a2422"/><path d="M93.5 135.6 Q100 134.5 106.5 135.6 L106 137.5 Q100 136.6 94 137.5Z" fill="#f6f0e8"/><path d="M92 135 Q100 132 108 135" stroke="#b5504a" stroke-width="2" fill="none"/>',
      happy:   '<path d="M89 133 Q100 145 111 133 Q100 138 89 133Z" fill="#b5504a"/><path d="M91 134 Q100 137.5 109 134 L108 136 Q100 139 92 136Z" fill="#f6f0e8"/>',
      grim:    '<path d="M92 139 Q100 134.5 108 139 Q100 137.5 92 139Z" fill="#a8463f" stroke="#a8463f" stroke-width="1.6" stroke-linejoin="round"/>',
    },
  },
};

const eye = (cx, cy, iris, lash) => `
  <ellipse cx="${cx}" cy="${cy}" rx="6.8" ry="4.3" fill="#fbf8f2"/>
  <circle cx="${cx + 0.4}" cy="${cy + 0.2}" r="3.4" fill="${iris}"/>
  <circle cx="${cx + 0.4}" cy="${cy + 0.2}" r="1.7" fill="#120d0a"/>
  <circle cx="${cx + 1.6}" cy="${cy - 1.1}" r="1.1" fill="#fff"/>
  <path d="M${cx - 7.5} ${cy - 0.6} Q${cx} ${cy - 6.4} ${cx + 7.5} ${cy - 0.6}" stroke="#2a1d16" stroke-width="${lash}" fill="none" stroke-linecap="round"/>
  <path d="M${cx - 6} ${cy + 3.6} Q${cx} ${cy + 5.6} ${cx + 6} ${cy + 3.6}" stroke="#b9805e" stroke-width="1" fill="none" opacity=".7"/>`;

function male(expr) {
  const b = EXPR.male.brows[expr];
  return `
  <defs>
    <radialGradient id="mSkin" cx=".46" cy=".42" r=".68"><stop offset="0" stop-color="#f2c8a5"/><stop offset=".72" stop-color="#dca680"/><stop offset="1" stop-color="#bd825d"/></radialGradient>
    <linearGradient id="mJacket" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#626d45"/><stop offset="1" stop-color="#353c24"/></linearGradient>
    <linearGradient id="mCap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a7449"/><stop offset="1" stop-color="#424a2d"/></linearGradient>
    <linearGradient id="mVisor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2e24"/><stop offset="1" stop-color="#0d0e0a"/></linearGradient>
  </defs>
  <!-- 脖子 -->
  <path d="M83 126 L83 160 Q100 170 117 160 L117 126 Z" fill="#cf966f"/>
  <path d="M83 140 Q100 154 117 140 L117 160 Q100 170 83 160Z" fill="#a66d4c" opacity=".55"/>
  <!-- 外套 -->
  <path d="M6 220 Q8 180 48 166 L82 153 L100 174 L118 153 L152 166 Q192 180 194 220Z" fill="url(#mJacket)"/>
  <path d="M100 174 L100 220" stroke="#2c321d" stroke-width="2"/>
  <path d="M88 155 L100 174 L112 155 Q100 162 88 155Z" fill="#2a2d22"/>
  <path d="M83 150 L60 162 L77 192 L97 170 Z" fill="#535e3a" stroke="#2c321d" stroke-width="1.6"/>
  <path d="M117 150 L140 162 L123 192 L103 170 Z" fill="#535e3a" stroke="#2c321d" stroke-width="1.6"/>
  <!-- 領章 -->
  <g transform="translate(72 172) rotate(-28)"><rect x="-6" y="-3.5" width="12" height="7" rx="1" fill="#e3bf57" stroke="#8a6a12"/><rect x="-6" y="-.6" width="12" height="1.2" fill="#8a6a12"/></g>
  <g transform="translate(128 172) rotate(28)"><path d="M0 -6 L1.8 -1.8 L6 -1.6 L2.8 1.2 L3.8 5.6 L0 3.2 L-3.8 5.6 L-2.8 1.2 L-6 -1.6 L-1.8 -1.8Z" fill="#e3bf57" stroke="#8a6a12" stroke-width=".8"/></g>
  <!-- 肩章 -->
  <path d="M24 182 L58 168 L61 175 L28 190Z" fill="#454e2f" stroke="#2c321d"/>
  <path d="M176 182 L142 168 L139 175 L172 190Z" fill="#454e2f" stroke="#2c321d"/>
  <path d="M36 181 l3 6 M42 178 l3 6 M164 181 l-3 6 M158 178 l-3 6" stroke="#e3bf57" stroke-width="2.4"/>
  <!-- 口袋、名牌、勳表 -->
  <path d="M34 196 h40 v24 h-40z" fill="#56613c" stroke="#2c321d" stroke-width="1.4"/>
  <path d="M33 194 h42 l-2 8 h-38z" fill="#4b5534" stroke="#2c321d" stroke-width="1.4"/>
  <path d="M126 196 h40 v24 h-40z" fill="#56613c" stroke="#2c321d" stroke-width="1.4"/>
  <path d="M125 194 h42 l-2 8 h-38z" fill="#4b5534" stroke="#2c321d" stroke-width="1.4"/>
  <rect x="128" y="184" width="36" height="8" rx="1" fill="#2f3521"/>
  <text x="146" y="190.4" font-size="6.4" fill="#ddd2a8" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" letter-spacing="1.2">HAWK</text>
  <g transform="translate(38 184)"><rect width="10" height="4" fill="#9b2b2b"/><rect x="11" width="10" height="4" fill="#2a5aa8"/><rect x="22" width="10" height="4" fill="#d9b13c"/><rect y="5" width="10" height="4" fill="#2f7d4a"/><rect x="11" y="5" width="10" height="4" fill="#e9e2cf"/></g>
  <!-- 耳朵 -->
  <ellipse cx="66" cy="112" rx="7" ry="11" fill="#d49b75"/><path d="M64 106 Q60 112 65 119" stroke="#a8704f" stroke-width="1.6" fill="none"/>
  <ellipse cx="134" cy="112" rx="7" ry="11" fill="#d49b75"/><path d="M136 106 Q140 112 135 119" stroke="#a8704f" stroke-width="1.6" fill="none"/>
  <!-- 臉 -->
  <path d="M67 98 Q66 138 87 152 Q100 159 113 152 Q134 138 133 98 Q132 70 100 68 Q68 70 67 98Z" fill="url(#mSkin)"/>
  <path d="M70 122 Q76 148 100 155 Q124 148 130 122 Q126 144 100 148 Q74 144 70 122Z" fill="#4a3a30" opacity=".16"/>
  <path d="M68 96 Q66 84 74 80 L75 108 Q70 104 68 96Z M132 96 Q134 84 126 80 L125 108 Q130 104 132 96Z" fill="#2b211a"/>
  <!-- 眉、眼、鼻 -->
  <path d="${b[0]}" stroke="#2b211a" stroke-width="4.2" fill="none" stroke-linecap="round"/>
  <path d="${b[1]}" stroke="#2b211a" stroke-width="4.2" fill="none" stroke-linecap="round"/>
  ${eye(86, 110, '#5a3d27', 2.2)}${eye(114, 110, '#5a3d27', 2.2)}
  <path d="M101 108 Q99 120 95 127 Q100 131 105 128" stroke="#a66d4c" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M96 128 Q100 130 104 128" stroke="#8f5a3d" stroke-width="1.4" fill="none"/>
  ${EXPR.male.mouth[expr]}
  <path d="M121 120 l6 9" stroke="#b07856" stroke-width="1.6" opacity=".8"/>
  <!-- 帽子 -->
  <path d="M59 86 Q56 50 100 44 Q144 50 141 86 Z" fill="url(#mCap)"/>
  <path d="M74 54 Q100 46 126 54" stroke="#7b8656" stroke-width="2" fill="none" opacity=".7"/>
  <path d="M61 80 Q100 72 139 80 L139 90 Q100 82 61 90Z" fill="#2f3521"/>
  <path d="M68 98 Q100 90 132 98 L132 106 Q100 97 68 106Z" fill="#6e4430" opacity=".33"/>
  <path d="M58 89 Q100 78 142 89 Q148 97 137 101 Q100 91 63 101 Q52 97 58 89Z" fill="url(#mVisor)"/>
  <path d="M66 92 Q100 84 134 92" stroke="#5a5e4c" stroke-width="1.4" fill="none"/>
  <g transform="translate(100 64)">
    <path d="M-4 0 Q-14 -4 -22 2 Q-14 1 -12 4 Q-8 2 -4 3Z M4 0 Q14 -4 22 2 Q14 1 12 4 Q8 2 4 3Z" fill="#e3bf57" stroke="#8a6a12" stroke-width=".8"/>
    <circle r="5.2" fill="#e3bf57" stroke="#8a6a12"/><path d="M0 -3.4 L1 -1 L3.4 -1 L1.5 .5 L2.2 3 L0 1.6 L-2.2 3 L-1.5 .5 L-3.4 -1 L-1 -1Z" fill="#8a6a12"/>
  </g>
  <!-- 耳機麥克風 -->
  <rect x="57" y="101" width="13" height="20" rx="5" fill="#1e201b" stroke="#000"/>
  <circle cx="63.5" cy="111" r="2.5" fill="#4ad66d"/>
  <path d="M63 120 Q68 140 87 141" stroke="#1e201b" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <rect x="85" y="138" width="8" height="6" rx="2.5" fill="#33362d"/>`;
}

function female(expr) {
  const b = EXPR.female.brows[expr];
  return `
  <defs>
    <radialGradient id="fSkin" cx=".46" cy=".42" r=".68"><stop offset="0" stop-color="#f8d6bd"/><stop offset=".72" stop-color="#ecbd9c"/><stop offset="1" stop-color="#d39d7a"/></radialGradient>
    <linearGradient id="fHair" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a4a2a"/><stop offset="1" stop-color="#4e2816"/></linearGradient>
    <linearGradient id="fJacket" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b6a4a"/><stop offset="1" stop-color="#323c28"/></linearGradient>
    <linearGradient id="fBeret" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a42a36"/><stop offset="1" stop-color="#5e121c"/></linearGradient>
  </defs>
  <!-- 後方頭髮與馬尾 -->
  <path d="M64 96 Q58 60 100 56 Q142 60 136 98 Q140 128 132 146 L124 112 L76 112 L68 146 Q60 128 64 96Z" fill="url(#fHair)"/>
  <path d="M128 120 Q146 140 140 168 Q136 190 148 204 Q126 198 126 172 Q126 150 120 132Z" fill="url(#fHair)"/>
  <path d="M132 138 Q140 160 136 184" stroke="#3a1d10" stroke-width="1.4" fill="none" opacity=".6"/>
  <!-- 脖子 -->
  <path d="M86 128 L86 160 Q100 168 114 160 L114 128 Z" fill="#dfab88"/>
  <path d="M86 142 Q100 154 114 142 L114 160 Q100 168 86 160Z" fill="#b87e5d" opacity=".5"/>
  <!-- 外套與圍巾 -->
  <path d="M10 220 Q14 182 52 168 L84 156 L100 176 L116 156 L148 168 Q186 182 190 220Z" fill="url(#fJacket)"/>
  <path d="M80 154 Q100 170 120 154 L126 164 Q100 184 74 164Z" fill="#c9b48a" stroke="#8a7650" stroke-width="1.4"/>
  <path d="M86 166 Q92 172 100 174 M110 166 Q106 171 100 174" stroke="#8a7650" stroke-width="1.2" fill="none"/>
  <path d="M74 164 L58 170 L74 196 L94 178 Z" fill="#4e5c3e" stroke="#29321f" stroke-width="1.6"/>
  <path d="M126 164 L142 170 L126 196 L106 178 Z" fill="#4e5c3e" stroke="#29321f" stroke-width="1.6"/>
  <g transform="translate(69 180) rotate(-30)"><rect x="-6" y="-3.5" width="12" height="7" rx="1" fill="#e3bf57" stroke="#8a6a12"/><rect x="-6" y="-.6" width="12" height="1.2" fill="#8a6a12"/></g>
  <g transform="translate(131 180) rotate(30)"><path d="M0 -6 L1.8 -1.8 L6 -1.6 L2.8 1.2 L3.8 5.6 L0 3.2 L-3.8 5.6 L-2.8 1.2 L-6 -1.6 L-1.8 -1.8Z" fill="#e3bf57" stroke="#8a6a12" stroke-width=".8"/></g>
  <path d="M28 186 L58 173 L61 180 L32 193Z" fill="#414d33" stroke="#29321f"/>
  <path d="M40 185 l3 6 M46 182 l3 6" stroke="#e3bf57" stroke-width="2.4"/>
  <path d="M130 198 h36 v22 h-36z" fill="#52603f" stroke="#29321f" stroke-width="1.4"/>
  <path d="M129 196 h38 l-2 7 h-34z" fill="#47543a" stroke="#29321f" stroke-width="1.4"/>
  <rect x="132" y="187" width="32" height="7.5" rx="1" fill="#2c3522"/>
  <text x="148" y="193" font-size="6.2" fill="#ddd2a8" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" letter-spacing="1.2">VERA</text>
  <g transform="translate(40 196)"><rect width="10" height="4" fill="#2f7d4a"/><rect x="11" width="10" height="4" fill="#9b2b2b"/><rect x="22" width="10" height="4" fill="#2a5aa8"/></g>
  <!-- 臉 -->
  <ellipse cx="68" cy="113" rx="6" ry="9.5" fill="#e3ad8a"/>
  <ellipse cx="132" cy="113" rx="6" ry="9.5" fill="#e3ad8a"/>
  <path d="M69 98 Q68 134 88 149 Q100 156 112 149 Q132 134 131 98 Q130 70 100 68 Q70 70 69 98Z" fill="url(#fSkin)"/>
  <ellipse cx="81" cy="124" rx="7" ry="4" fill="#f09a8a" opacity=".35"/><ellipse cx="119" cy="124" rx="7" ry="4" fill="#f09a8a" opacity=".35"/>
  <!-- 瀏海 -->
  <path d="M67 104 Q62 70 100 64 Q138 66 134 102 Q128 86 112 80 Q100 92 84 96 Q74 100 67 104Z" fill="url(#fHair)"/>
  <path d="M84 96 Q98 88 110 80 M76 100 Q88 90 100 76" stroke="#3a1d10" stroke-width="1.2" fill="none" opacity=".5"/>
  <!-- 眉、眼、鼻、嘴 -->
  <path d="${b[0]}" stroke="#4e2816" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="${b[1]}" stroke="#4e2816" stroke-width="3" fill="none" stroke-linecap="round"/>
  ${eye(86, 110, '#3f6a4e', 2.8)}${eye(114, 110, '#3f6a4e', 2.8)}
  <path d="M78.5 108 l-2.6 -2 M121.5 108 l2.6 -2" stroke="#2a1d16" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M100.5 112 Q99 121 96 125 Q100 128 104 125.5" stroke="#c48b6a" stroke-width="1.9" fill="none" stroke-linecap="round"/>
  ${EXPR.female.mouth[expr]}
  <!-- 貝雷帽 -->
  <path d="M58 80 Q58 50 106 46 Q152 48 150 70 Q146 82 104 82 Q74 84 58 80Z" fill="url(#fBeret)"/>
  <path d="M84 56 Q110 48 140 58" stroke="#c4414f" stroke-width="2" fill="none" opacity=".6"/>
  <path d="M62 80 Q100 74 138 78 L138 86 Q100 81 62 88Z" fill="#3e0b12"/>
  <g transform="translate(78 68)"><path d="M0 -8 L7 -3 L5 6 L-5 6 L-7 -3Z" fill="#e3bf57" stroke="#8a6a12"/><circle r="2.4" fill="#8a6a12"/></g>
  <!-- 耳機麥克風 -->
  <rect x="61" y="102" width="12" height="19" rx="5" fill="#1e201b" stroke="#000"/>
  <circle cx="67" cy="111.5" r="2.4" fill="#4ad66d"/>
  <path d="M66 120 Q70 138 88 140" stroke="#1e201b" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <rect x="86" y="137" width="7.5" height="5.5" rx="2.5" fill="#33362d"/>`;
}

let uid = 0;
export function commanderSVG(kind, expr = 'neutral') {
  // 每張圖的漸層 id 都要唯一，否則隱藏畫面裡的同名 id 會讓漸層失效
  const u = `c${++uid}`;
  const body = (kind === 'female' ? female(expr) : male(expr))
    .replace(/id="(\w+)"/g, `id="$1-${u}"`).replace(/url\(#(\w+)\)/g, `url(#$1-${u})`);
  return `<svg viewBox="0 0 200 220" class="cmd-svg" aria-hidden="true">${body}</svg>`;
}
