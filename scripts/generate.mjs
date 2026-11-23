// Genera los SVG animados del perfil con datos reales de GitHub.
// Uso: GH_TOKEN=xxx GH_USER=MelissaApaza2906 node scripts/generate.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const USER = process.env.GH_USER || 'MelissaApaza2906';
const TOKEN = process.env.GH_TOKEN || '';

// ---------- Datos (con valores de respaldo si no hay token) ----------
let data = {
  name: 'Melissa Apaza',
  login: USER,
  contrib: 55,
  repos: 2,
  stars: 0,
  followers: 0,
  weeks: null,
  repoList: [
    { name: 'Escaneo_de_Plantas', lang: 'TypeScript', pushed: '' , desc: '' },
    { name: 'SECRET_FRIEND', lang: 'CSS', pushed: '', desc: '' }
  ],
  langs: ['TypeScript', 'JavaScript', 'HTML', 'CSS']
};

async function fetchData() {
  if (!TOKEN) return;
  const query = `query($login:String!){ user(login:$login){
    name login followers{totalCount}
    contributionsCollection{ contributionCalendar{ totalContributions weeks{ contributionDays{ contributionCount } } } }
    repositories(first:50, privacy:PUBLIC, ownerAffiliations:OWNER, orderBy:{field:PUSHED_AT,direction:DESC}){
      totalCount nodes{ name description pushedAt stargazerCount isFork primaryLanguage{name} languages(first:6){nodes{name}} } }
  } }`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { login: USER } })
  });
  const json = await res.json();
  const u = json?.data?.user;
  if (!u) { console.warn('Sin datos de la API, uso respaldo', JSON.stringify(json).slice(0, 300)); return; }
  const repos = u.repositories.nodes.filter(r => !r.isFork && r.name.toLowerCase() !== USER.toLowerCase());
  const langSet = new Set();
  repos.forEach(r => r.languages.nodes.forEach(l => langSet.add(l.name)));
  data = {
    name: u.name || data.name,
    login: u.login,
    contrib: u.contributionsCollection.contributionCalendar.totalContributions,
    repos: repos.length,
    stars: repos.reduce((s, r) => s + r.stargazerCount, 0),
    followers: u.followers.totalCount,
    weeks: u.contributionsCollection.contributionCalendar.weeks.map(w => w.contributionDays.map(d => d.contributionCount)),
    repoList: repos.map(r => ({ name: r.name, lang: r.primaryLanguage?.name || '—', pushed: r.pushedAt, desc: r.description || '' })),
    langs: langSet.size ? [...langSet] : data.langs
  };
}

// ---------- Utilidades ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ago = iso => {
  if (!iso) return '';
  const d = (Date.now() - new Date(iso)) / 864e5;
  if (d < 1) return 'hoy';
  if (d < 30) return `hace ${Math.round(d)} días`;
  if (d < 365) { const m = Math.round(d / 30); return `hace ${m} ${m === 1 ? 'mes' : 'meses'}`; }
  const y = Math.round(d / 365); return `hace ${y} ${y === 1 ? 'año' : 'años'}`;
};

const FONT = `font-family:'JetBrains Mono','Cascadia Code','Fira Code',Consolas,ui-monospace,monospace;`;
const SANS = `font-family:'Space Grotesk','Segoe UI',system-ui,sans-serif;`;

const BASE_CSS = `
*{box-sizing:border-box}
.root{width:100%;height:100%;background:#06040b;color:#ede9fe;${SANS}}
.mono{${FONT}}
.cut{clip-path:polygon(30px 0,100% 0,100% calc(100% - 30px),calc(100% - 30px) 100%,0 100%,0 30px)}
.cut-s{clip-path:polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)}
.edge{padding:1px;background:linear-gradient(140deg,#a78bfa 0%,#33215a 35%,#1a1030 60%,#e879f9 100%)}
.body{position:relative;background:#07050d;overflow:hidden;height:100%}
.scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(196,181,253,.035) 0 1px,transparent 1px 3px)}
.tab{display:inline-block;clip-path:polygon(0 0,100% 0,calc(100% - 18px) 100%,0 100%);background:#8b5cf6;color:#0b0714;font-size:11px;font-weight:700;letter-spacing:3px;padding:10px 34px 10px 40px;${FONT}}
.pulse{animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes spin{to{transform:rotate(360deg)}}
.shine{background:linear-gradient(90deg,#8b5cf6,#e879f9,#8b5cf6);background-size:200% 100%;animation:shine 4s linear infinite}
@keyframes shine{to{background-position:-200% 0}}
`;

const svg = (w, h, css, html, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
<foreignObject x="0" y="0" width="${w}" height="${h}">
<div xmlns="http://www.w3.org/1999/xhtml" class="root">
<style>${BASE_CSS}${css}</style>
${html}
</div>
</foreignObject>
</svg>`;

// ---------- 1. Identidad + terminal ----------
function asciiPortrait() {
  const W = 44, H = 40, ramp = ' .:-=+*#%@', rows = [];
  const inside = (x, y) => {
    const hx = (x - .5) / .19, hy = (y - .33) / .23; if (hx * hx + hy * hy <= 1) return true;
    const a = (x - .5) / .25, b = (y - .42) / .3; if (y > .2 && y < .7 && a * a + b * b <= 1) return true;
    if (y > .52 && y < .68 && x > .43 && x < .57) return true;
    const sx = (x - .5) / .5, sy = (y - 1.08) / .42; return sx * sx + sy * sy <= 1;
  };
  for (let j = 0; j < H; j++) {
    let line = '';
    for (let i = 0; i < W; i++) {
      const x = i / (W - 1), y = j / (H - 1), h = Math.abs((i * 73856093) ^ (j * 19349663)) % 97;
      if (inside(x, y)) {
        const dx = x - .36, dy = y - .24, light = 1 - Math.min(1, Math.hypot(dx, dy) * 1.5);
        line += ramp[Math.max(1, Math.min(9, Math.round(light * 8) + (h % 3) - 1))];
      } else line += h < 4 ? '.' : ' ';
    }
    rows.push(line);
  }
  return rows.map(r => `<div>${esc(r).replace(/ /g, '&#160;')}</div>`).join('');
}

function shieldDots() {
  const out = [], gl = ['·', '•', '+', '*', ':', '0', '1'];
  const inShield = (x, y) => y >= .06 && y <= .96 && (y < .55 ? Math.abs(x - .5) < .4 : Math.abs(x - .5) < .4 * (1 - (y - .55) / .42));
  const inLock = (x, y) => { const body = x > .37 && x < .63 && y > .44 && y < .7; const rx = (x - .5) / .1, ry = (y - .44) / .16, d = rx * rx + ry * ry; return body || (y < .44 && d <= 1 && d >= .4); };
  for (let b = 0; b < 16; b++) for (let a = 0; a < 16; a++) {
    const x = a / 15, y = b / 15, h = Math.abs((a * 2654435761) ^ (b * 40503)) % 100;
    const lock = inLock(x, y), sh = inShield(x, y);
    const edge = sh && (!inShield(x + .07, y) || !inShield(x - .07, y) || !inShield(x, y + .07));
    if (lock || edge || (sh && h < 14)) {
      out.push(`<span class="dot mono" style="left:${(x * 94).toFixed(1)}%;top:${(y * 90).toFixed(1)}%;font-size:${lock ? 11 : 10}px;color:${lock ? '#f0abfc' : edge ? '#c4b5fd' : '#7c5fc9'};animation-delay:${(((b * 16 + a) % 50) * .07).toFixed(2)}s">${lock ? '#' : gl[h % gl.length]}</span>`);
    }
  }
  return out.join('');
}

function identity() {
  const glyphs = ['#', '$', '%', '&amp;', '@', '*', '0', '1', '&lt;', '&gt;', '/', '{', '}', '[', ']', '?', '!'];
  const [first, ...rest] = data.name.split(' ');
  const letters = (word, off) => [...word].map((ch, i) =>
    `<span class="ch"><span class="r" style="animation-delay:${((off + i) * .09).toFixed(2)}s">${esc(ch)}</span><span class="f" style="animation-delay:${((off + i) * .09).toFixed(2)}s">${glyphs[(i * 7 + off * 3) % glyphs.length]}</span></span>`).join('');
  const orbitLangs = data.langs.slice(0, 6);
  const orbit = orbitLangs.map((t, i) => {
    const a = Math.round(i * (360 / orbitLangs.length) + 45);
    const c = i % 2 ? '#f0abfc' : '#c4b5fd';
    return `<div style="position:absolute;left:50%;top:50%;width:0;height:0;transform:rotate(${a}deg) translateX(168px) rotate(-${a}deg)"><div class="spin-r" style="position:relative;width:0;height:0"><span class="mono chip" style="border-color:${c};color:${c}">${esc(t)}</span></div></div>`;
  }).join('');
  const info = [
    ['Subject', data.name, '#ede9fe'],
    ['Handle', '@' + data.login.toLowerCase(), '#c4b5fd'],
    ['Role', 'Full Stack → Security', '#ede9fe'],
    ['Stack', data.langs.slice(0, 4).join(' · '), '#c4b5fd'],
    ['Focus', 'Ciberseguridad (en formación)', '#f0abfc'],
    ['Location', 'Bolivia · UTC−4', '#ede9fe'],
    ['Contact', 'github.com/' + data.login, '#c4b5fd']
  ].map((r, i) => `<div class="irow"><span style="color:#4c2f8a">0x0${i + 1}</span><span style="color:#a39bbd">${r[0]}</span><span class="row" style="color:${r[2]};animation-delay:${(1 + i * .45).toFixed(2)}s">${esc(r[1])}</span><span class="tick" style="animation-delay:${(1 + i * .45).toFixed(2)}s">✓</span></div>`).join('');
  const digits = String(data.contrib).split('').map(d =>
    `<span class="roll" style="--to:-${Number(d) * 38}px">${[...'0123456789'].map(n => `<span>${n}</span>`).join('')}</span>`).join('');
  const items = ['OPEN TO FREELANCE', 'FULL STACK', 'TYPESCRIPT', 'CIBERSEGURIDAD EN FORMACIÓN', 'BOLIVIA · UTC−4', 'NASA SPACE APPS 2026', 'SECURE BY DESIGN'];
  const ticker = [...items, ...items].map(s => `<span style="padding:0 18px">${esc(s)}</span><span style="color:#e879f9">◆</span>`).join('');

  const css = `
.ch{position:relative;display:inline-block}
.ch .r{animation:chin 7s steps(1) infinite}
.ch .f{position:absolute;left:0;top:0;color:#e879f9;animation:chout 7s steps(1) infinite}
@keyframes chin{0%{opacity:0}18%,100%{opacity:1}}
@keyframes chout{0%{opacity:1}18%,100%{opacity:0}}
.glitch{animation:glitch 7s infinite}
@keyframes glitch{0%,17%{text-shadow:3px 0 #e879f9,-3px 0 #8b5cf6}19%,100%{text-shadow:0 0 22px rgba(167,139,250,.5)}}
.type{animation:type 7s steps(30) infinite}
@keyframes type{0%,20%{clip-path:inset(0 100% 0 0)}45%,100%{clip-path:inset(0 0 0 0)}}
.caret{display:inline-block;width:10px;height:18px;background:#a78bfa;margin-left:6px;vertical-align:-3px;animation:blink 1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.spin{animation:spin 26s linear infinite}.spin-r{animation:spin 26s linear infinite reverse}
.chip{position:absolute;left:0;top:0;transform:translate(-50%,-50%);font-size:10px;font-weight:700;padding:4px 8px;border-radius:6px;white-space:nowrap;background:#0e0918;border:1px solid}
.sweep{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,rgba(167,139,250,.4),rgba(167,139,250,0) 22%,transparent 100%);animation:spin 4s linear infinite}
.reveal{animation:reveal 9s cubic-bezier(.4,0,.2,1) infinite}
@keyframes reveal{0%{clip-path:inset(0 0 100% 0)}35%,90%{clip-path:inset(0 0 0 0);opacity:1}100%{clip-path:inset(0 0 0 0);opacity:0}}
.beam{position:absolute;left:8%;right:8%;height:2px;background:#c4b5fd;box-shadow:0 0 14px 3px rgba(167,139,250,.8);animation:beam 9s cubic-bezier(.4,0,.2,1) infinite}
@keyframes beam{0%{top:10%;opacity:1}35%{top:90%;opacity:1}38%,100%{top:90%;opacity:0}}
.wire{stroke-dasharray:5 9;animation:wire 1.2s linear infinite}
@keyframes wire{to{stroke-dashoffset:-28}}
.packet{position:absolute;left:0;top:0;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:#f0abfc;box-shadow:0 0 12px 3px rgba(232,121,249,.8);animation:travel 2.6s cubic-bezier(.5,0,.5,1) infinite}
@keyframes travel{from{offset-distance:0%;opacity:0}10%,90%{opacity:1}to{offset-distance:100%;opacity:0}}
.irow{display:grid;grid-template-columns:38px 96px 1fr 16px;gap:8px;align-items:center;padding:7px 0;border-bottom:1px dashed #1f1436;font-size:12px;${FONT}}
.row{white-space:nowrap;overflow:hidden;animation:row 10s steps(22) infinite;clip-path:inset(0 100% 0 0)}
@keyframes row{0%{clip-path:inset(0 100% 0 0)}7%,90%{clip-path:inset(0 0 0 0)}100%{clip-path:inset(0 100% 0 0)}}
.tick{color:#c4b5fd;opacity:0;animation:tick 10s ease infinite}
@keyframes tick{0%,7%{opacity:0}10%,90%{opacity:1}100%{opacity:0}}
.words{display:flex;flex-direction:column;animation:words 7.5s cubic-bezier(.7,0,.3,1) infinite}
.words span{height:34px;line-height:34px;font-weight:700}
@keyframes words{0%,28%{transform:translateY(0)}33%,61%{transform:translateY(-34px)}66%,94%{transform:translateY(-68px)}100%{transform:translateY(-102px)}}
.roll{display:flex;flex-direction:column;animation:roll 9s cubic-bezier(.2,.8,.2,1) infinite}
.roll span{height:38px}
@keyframes roll{0%{transform:translateY(0)}30%,100%{transform:translateY(var(--to))}}
.dot{position:absolute;line-height:1;opacity:0;text-shadow:0 0 6px rgba(167,139,250,.7);animation:dot 10s ease infinite}
@keyframes dot{0%{opacity:0}6%,88%{opacity:1}100%{opacity:0}}
.marquee{display:flex;width:max-content;height:40px;align-items:center;font-size:12px;letter-spacing:2px;color:#c4b5fd;white-space:nowrap;animation:marquee 26s linear infinite}
@keyframes marquee{to{transform:translateX(-50%)}}
.float{animation:float 6s ease-in-out infinite}
@keyframes float{50%{transform:translateY(-6px) rotate(-4deg)}}
`;
  const W = 840, H = 1000;
  const html = `
<div class="cut edge" style="height:${H}px"><div class="cut body">
<div style="position:absolute;width:520px;height:520px;right:-140px;top:-180px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,.35),transparent 65%)"></div>
<div style="position:absolute;width:420px;height:420px;left:-160px;top:420px;border-radius:50%;background:radial-gradient(circle,rgba(232,121,249,.18),transparent 65%)"></div>
<div class="scan"></div>
<div style="position:relative;display:flex;justify-content:space-between;align-items:center;padding-right:26px">
<span class="tab">${esc(first.toUpperCase())} // LIVING IDENTITY</span>
<span class="mono" style="display:inline-flex;align-items:center;gap:8px;font-size:11px;color:#c4b5fd"><span class="pulse" style="width:7px;height:7px;border-radius:50%;background:#e879f9;display:inline-block"></span>@${esc(data.login.toLowerCase())} · LIVE</span>
</div>
<div style="position:relative;display:flex;gap:10px;align-items:center;padding:18px 44px 0 40px;height:370px">
<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:14px">
<div class="mono" style="font-size:11px;letter-spacing:4px;color:#a39bbd">HELLO, WORLD. I'M</div>
<div class="mono glitch" style="font-size:48px;line-height:1.04;font-weight:700;color:#f5f3ff;white-space:nowrap">${letters(first, 0)}<br/><span style="color:#c4b5fd">${letters(rest.join(' ') || '', 8)}</span></div>
<div class="shine" style="width:120px;height:3px;border-radius:2px"></div>
<div class="mono" style="font-size:15px;display:flex;align-items:center"><span class="type" style="white-space:nowrap"><span style="color:#a78bfa">&gt;</span> Full Stack Dev <span style="color:#a78bfa">⟶</span> Security Engineer</span><span class="caret"></span></div>
<div style="font-size:14px;color:#a39bbd;max-width:330px;line-height:1.5">Ingeniera de Sistemas. Construyo productos web completos y aprendo a romperlos para protegerlos.</div>
<div style="display:flex;align-items:center;gap:10px">
<span class="mono" style="display:inline-flex;align-items:center;gap:8px;font-size:11px;padding:6px 12px;border-radius:999px;border:1px solid #8b5cf6;background:rgba(139,92,246,.14)"><span class="pulse" style="width:7px;height:7px;border-radius:50%;background:#c4b5fd;display:inline-block"></span>Disponible para freelance</span>
<span class="mono float" style="display:inline-block;font-size:10px;letter-spacing:2px;padding:5px 10px;background:#e879f9;color:#0b0714;font-weight:700;transform:rotate(-4deg)">DEV + SEC</span>
</div></div>
<div style="position:relative;width:340px;height:340px;flex:none">
<div class="spin" style="position:absolute;inset:0;border-radius:50%;border:1px dashed #4c2f8a">${orbit}</div>
<div style="position:absolute;inset:26px;border-radius:50%;border:1px solid #4c2f8a;background:radial-gradient(circle,rgba(59,31,115,.5),rgba(10,6,18,.2) 70%);overflow:hidden">
<div style="position:absolute;inset:44px;border-radius:50%;border:1px dashed #33215a"></div>
<div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:#2a1a47"></div>
<div style="position:absolute;top:50%;left:0;right:0;height:1px;background:#2a1a47"></div>
<div class="sweep"></div>
<div class="reveal mono" style="position:absolute;inset:22px 20px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:7px;line-height:6.4px;color:#c4b5fd;white-space:pre;text-shadow:0 0 6px rgba(167,139,250,.6)">${asciiPortrait()}</div>
<div class="beam"></div>
</div></div></div>
<div style="position:relative;height:96px">
<svg width="${W - 2}" height="96" viewBox="0 0 ${W - 2} 96" fill="none" style="position:absolute;inset:0">
<path class="wire" d="M582 0 C582 50, 210 40, 190 96" stroke="#8b5cf6" stroke-width="1.5"/>
<path class="wire" d="M582 0 C582 55, 440 45, 430 96" stroke="#a78bfa" stroke-width="1.5"/>
<path class="wire" d="M582 0 C582 50, 640 50, 650 96" stroke="#e879f9" stroke-width="1.5"/>
<circle cx="582" cy="2" r="5" fill="#e879f9"/></svg>
<span class="packet" style="offset-path:path('M582 0 C582 50, 210 40, 190 96')"></span>
<span class="packet" style="offset-path:path('M582 0 C582 55, 440 45, 430 96');animation-delay:.8s"></span>
<span class="packet" style="offset-path:path('M582 0 C582 50, 640 50, 650 96');animation-delay:1.6s"></span>
<span class="mono" style="position:absolute;left:40px;top:34px;font-size:10px;letter-spacing:3px;color:#a39bbd">DECODING IDENTITY → SYSTEM.INFO</span>
</div>
<div style="position:relative;padding:0 26px 22px">
<div class="cut-s" style="padding:1px;background:linear-gradient(90deg,#6d4bc4,#2a1a47 50%,#6d4bc4)"><div class="cut-s" style="position:relative;background:#0a0613">
<div class="mono" style="display:flex;justify-content:space-between;padding:10px 16px 10px 24px;border-bottom:1px solid #2a1a47;font-size:11px;color:#a39bbd"><span><span style="color:#c4b5fd">${esc(data.login.toLowerCase())}@github</span> ~ $ ./decode-identity.sh --live</span><span style="color:#f0abfc"><span class="pulse">●</span> REC</span></div>
<div style="display:grid;grid-template-columns:1.45fr 1fr;gap:16px;padding:14px 16px 16px 24px">
<div>${info}
<div class="irow" style="grid-template-columns:38px 96px 1fr;border:none"><span style="color:#4c2f8a">0x08</span><span style="color:#a39bbd">Status</span>
<span style="height:34px;overflow:hidden;display:block;margin:-8px 0"><span class="words"><span style="color:#f5f3ff">▸ Building_</span><span style="color:#c4b5fd">▸ Learning_</span><span style="color:#f0abfc">▸ Securing_</span><span style="color:#f5f3ff">▸ Building_</span></span></span></div>
</div>
<div style="display:flex;flex-direction:column;gap:12px">
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
<div class="cut-s" style="background:rgba(139,92,246,.1);padding:12px 14px"><div class="mono" style="font-size:9px;letter-spacing:2px;color:#a39bbd">CONTRIB / AÑO</div><div class="mono" style="display:flex;font-size:32px;font-weight:700;color:#f5f3ff;height:38px;line-height:38px;overflow:hidden;margin-top:4px">${digits}</div></div>
<div class="cut-s" style="background:rgba(232,121,249,.08);padding:12px 14px"><div class="mono" style="font-size:9px;letter-spacing:2px;color:#a39bbd">REPOS · STARS</div><div class="mono" style="font-size:32px;font-weight:700;color:#f5f3ff;margin-top:4px;line-height:38px">${data.repos}<span style="color:#4c2f8a"> · </span>${data.stars}</div></div>
</div>
<div class="cut-s" style="position:relative;height:200px;background:#07050d;border:1px solid #2a1a47;overflow:hidden">
<div class="mono" style="position:absolute;left:12px;top:8px;font-size:9px;letter-spacing:3px;color:#a39bbd">THREAT.MAP</div>
<div style="position:absolute;inset:24px 30px 18px">${shieldDots()}</div>
<div class="mono" style="position:absolute;right:10px;bottom:6px;font-size:9px;color:#c4b5fd">integrity: OK</div>
</div></div></div></div></div></div>
<div style="position:absolute;left:0;right:0;bottom:0;border-top:1px solid #2a1a47;background:rgba(139,92,246,.08);overflow:hidden;height:40px"><div class="marquee mono">${ticker}</div></div>
</div></div>`;
  return svg(W, H, css, html, `${data.name} — Full Stack Developer en camino a Security Engineer`);
}

// ---------- 2. Skills ----------
function skills() {
  const meta = {
    TypeScript: ['TS', '#a78bfa', 'linear-gradient(135deg,#6d4bc4,#3b1f73)'],
    JavaScript: ['JS', '#f0abfc', 'linear-gradient(135deg,#a2399f,#4a1650)'],
    HTML: ['&lt;/&gt;', '#c4b5fd', 'linear-gradient(135deg,#5b3fa8,#2a1a47)'],
    CSS: ['{ }', '#e879f9', 'linear-gradient(135deg,#8b2f9a,#3b1450)']
  };
  const where = l => {
    const r = data.repoList.filter(x => x.lang === l).map(x => x.name);
    return r.length ? r.slice(0, 2).join(', ') : 'mis repositorios';
  };
  const list = data.langs.slice(0, 4);
  const cards = list.map((l, i) => {
    const [short, c, bg] = meta[l] || [esc(l.slice(0, 2).toUpperCase()), i % 2 ? '#f0abfc' : '#a78bfa', 'linear-gradient(135deg,#6d4bc4,#2a1a47)'];
    return `<div class="cut-s lit" style="padding:1px;background:linear-gradient(160deg,${c},#2a1a47);animation-delay:${i * 2}s"><div class="cut-s" style="background:#0b0714;padding:18px 14px;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;height:100%">
<div style="position:relative;width:78px;height:78px"><svg class="hex" width="78" height="78" viewBox="0 0 78 78" fill="none" style="position:absolute;inset:0"><path d="M39 3l31 18v36L39 75 8 57V21z" stroke="${c}" stroke-width="1.4" stroke-dasharray="4 6"/></svg>
<div class="mono" style="position:absolute;inset:12px;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);background:${bg};display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:#f5f3ff">${short}</div></div>
<div style="font-size:17px;font-weight:600;color:#f5f3ff">${esc(l)}</div>
<div class="mono" style="font-size:10px;letter-spacing:1px;color:#a39bbd">VISTO EN</div>
<div class="mono" style="font-size:11px;color:${c};line-height:1.4">${esc(where(l))}</div></div></div>`;
  }).join('');
  const css = `.lit{animation:lit 8s ease-in-out infinite}@keyframes lit{10%,22%{filter:drop-shadow(0 0 12px rgba(167,139,250,.7))}0%,30%,100%{filter:none}}.hex{animation:spin 18s linear infinite}`;
  const html = `<div class="cut edge" style="height:400px"><div class="cut body">
<div style="position:absolute;width:460px;height:460px;left:-160px;top:-200px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,.3),transparent 65%)"></div><div class="scan"></div>
<div style="position:relative;display:flex;justify-content:space-between;align-items:center;padding-right:26px"><span class="tab">SKILLS // EN USO</span><span class="mono" style="font-size:11px;color:#a39bbd">$ ls ~/skills</span></div>
<div style="position:relative;padding:18px 30px 0 40px"><div style="font-size:26px;font-weight:700;color:#f5f3ff">Tecnologías que uso</div><div style="font-size:14px;color:#a39bbd;margin-top:4px">Solo lo que aparece en mis repositorios de GitHub.</div><div class="shine" style="width:100px;height:3px;border-radius:2px;margin-top:10px"></div></div>
<div style="position:relative;display:grid;grid-template-columns:repeat(${list.length},1fr);gap:16px;padding:22px 30px 0 40px;height:250px">${cards}</div>
</div></div>`;
  return svg(840, 400, css, html, 'Tecnologías que uso: ' + list.join(', '));
}

// ---------- 3. Actividad (monitor + señal) ----------
function activity() {
  let weeks = data.weeks;
  if (!weeks) { weeks = Array.from({ length: 52 }, (_, w) => Array.from({ length: 7 }, (_, d) => { const h = (w * 31 + d * 17) % 23; return w > 40 && h < 7 ? (h < 2 ? 4 : 1) : 0; })); }
  weeks = weeks.slice(-52);
  const max = Math.max(1, ...weeks.flat());
  const pal = ['#1a1030', '#4c2f8a', '#8b5cf6', '#e879f9'];
  const grid = weeks.map(w => `<div style="display:flex;flex-direction:column;gap:3px">${w.map(c => { const v = c === 0 ? 0 : c / max > .66 ? 3 : c / max > .33 ? 2 : 1; return `<span style="width:11px;height:11px;border-radius:2px;display:block;background:${pal[v]};${v === 3 ? 'box-shadow:0 0 8px rgba(232,121,249,.7)' : ''}"></span>`; }).join('')}</div>`).join('');
  const meters = [['CONTRIBUCIONES', data.contrib, Math.min(100, data.contrib), '#a78bfa'], ['REPOS', data.repos, Math.min(100, data.repos * 5), '#c4b5fd'], ['STARS', data.stars, Math.min(100, data.stars * 5 + 2), '#e879f9'], ['FOLLOWERS', data.followers, Math.min(100, data.followers * 5 + 2), '#8b5cf6']]
    .map((m, i) => `<div class="mono"><div style="display:flex;justify-content:space-between;font-size:11px;letter-spacing:2px;color:#a39bbd"><span>${m[0]}</span><span style="color:#f5f3ff;font-size:18px;font-weight:700">${m[1]}</span></div><div style="height:8px;margin-top:8px;background:#1a1030"><div class="fill" style="height:8px;width:${m[2]}%;background:${m[3]};animation-delay:${i * .3}s"></div></div></div>`).join('');
  const css = `.fill{transform-origin:left;animation:fill 3.5s cubic-bezier(.2,.8,.2,1) infinite alternate}@keyframes fill{from{transform:scaleX(.05)}to{transform:scaleX(1)}}
.sweepx{position:absolute;top:0;bottom:0;width:90px;background:linear-gradient(90deg,transparent,rgba(167,139,250,.3),transparent);animation:sx 5s linear infinite}@keyframes sx{from{left:-90px}to{left:100%}}`;
  const html = `<div class="cut edge" style="height:430px"><div class="cut body">
<div class="scan"></div>
<div style="position:relative;display:flex;justify-content:space-between;align-items:center;padding-right:26px"><span class="tab" style="background:#e879f9">SIGNAL.CAPTURE</span><span class="mono" style="font-size:11px;color:#c4b5fd"><span class="pulse" style="color:#e879f9">●</span> LIVE</span></div>
<div style="position:relative;padding:18px 30px 0 40px">
<div style="font-size:24px;font-weight:700;color:#f5f3ff">${data.contrib} contribuciones interceptadas</div>
<div class="mono" style="font-size:12px;color:#a39bbd;margin:4px 0 16px">$ tcpdump -i github0 'author == ${esc(data.login.toLowerCase())}' · último año</div>
<div style="position:relative;overflow:hidden;padding:6px 0"><div class="sweepx"></div><div style="display:flex;gap:3px">${grid}</div></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px 30px;margin-top:22px">${meters}</div>
</div></div></div>`;
  return svg(840, 430, css, html, `${data.contrib} contribuciones en el último año`);
}

// ---------- 4. Tarjetas de proyecto (una por repo, para poder enlazarlas) ----------
function caseCard(r, i) {
  const active = r.pushed && (Date.now() - new Date(r.pushed)) / 864e5 < 120;
  const html = `<div class="cut-s" style="padding:1px;height:170px;background:linear-gradient(160deg,${active ? '#8b5cf6' : '#33215a'},#1a1030)"><div class="cut-s body" style="padding:16px 18px;display:flex;flex-direction:column;gap:8px">
<div class="scan"></div>
<div class="mono" style="position:relative;display:flex;justify-content:space-between;font-size:10px;letter-spacing:2px;color:#a39bbd"><span>CASE #00${i + 2}</span><span style="color:${active ? '#c4b5fd' : '#a39bbd'}"><span class="pulse">●</span> ${active ? 'ACTIVO' : 'ARCHIVADO'}</span></div>
<div class="mono" style="position:relative;font-size:17px;font-weight:700;color:#f5f3ff">${esc(r.name)}</div>
<div style="position:relative;font-size:13px;color:#a39bbd;height:34px;overflow:hidden">${esc(r.desc || 'Proyecto en mi GitHub.')}</div>
<div class="mono" style="position:relative;display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-top:auto"><span style="padding:3px 10px;border-radius:999px;border:1px solid #8b5cf6;color:#c4b5fd">${esc(r.lang)}</span><span style="color:#a39bbd">${esc(ago(r.pushed) || '')} →</span></div>
</div></div>`;
  return svg(410, 170, '', html, `Proyecto ${r.name}`);
}

// ---------- 5. Ruta ----------
function roadmap() {
  const lv = [['01', 'COMPLETADO', 'Full Stack', 'Proyectos freelance', 'done'], ['02', 'EN CURSO', 'Fundamentos de seguridad', 'Especialización en curso', 'now'], ['03', 'SIGUIENTE', 'Certificación', 'Por definir', 'next'], ['04', 'OBJETIVO', 'Ciberseguridad profesional', 'Seguridad para clientes reales', 'next']]
    .map(([n, tag, t, sub, s]) => { const ring = s === 'done' ? '#8b5cf6' : s === 'now' ? '#e879f9' : '#4c2f8a'; const fill = s === 'done' ? '#8b5cf6' : s === 'now' ? 'rgba(232,121,249,.15)' : '#0e0918';
      return `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px"><div class="mono ${s === 'now' ? 'glow' : ''}" style="width:44px;height:44px;transform:rotate(45deg);display:flex;align-items:center;justify-content:center;border:2px solid ${ring};background:${fill}"><span style="transform:rotate(-45deg);font-size:13px;font-weight:700;color:${s === 'done' ? '#0b0714' : '#f5f3ff'}">${n}</span></div><span class="mono" style="font-size:10px;letter-spacing:2px;padding:3px 8px;border:1px solid ${ring};color:${s === 'now' ? '#f0abfc' : s === 'done' ? '#c4b5fd' : '#a39bbd'}">${tag}</span><div style="font-size:15px;font-weight:600;color:#f5f3ff">${t}</div><div style="font-size:12px;color:#a39bbd">${sub}</div></div>`; }).join('');
  const css = `.glow{animation:glow 2s ease-in-out infinite}@keyframes glow{50%{box-shadow:0 0 22px rgba(232,121,249,.8)}}.prog{animation:prog 4s ease-in-out infinite alternate}@keyframes prog{from{width:30%}to{width:45%}}`;
  const html = `<div class="cut edge" style="height:290px"><div class="cut body"><div class="scan"></div>
<div style="position:relative;display:flex;justify-content:space-between;align-items:center;padding-right:26px"><span class="tab">CLEARANCE.LEVELS</span><span class="mono" style="font-size:11px;color:#a39bbd">$ sudo -l · ruta hacia ciberseguridad</span></div>
<div style="position:relative;padding:30px 30px 0 40px"><div style="position:absolute;left:14%;right:12%;top:52px;height:2px;background:#33215a"><div class="prog shine" style="height:2px"></div></div>
<div style="position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:12px">${lv}</div></div></div></div>`;
  return svg(840, 290, css, html, 'Ruta: Full Stack completado, seguridad en curso');
}

// ---------- 6. Botones de contacto ----------
function button(label, icon) {
  const html = `<div class="cut-s" style="padding:1px;height:44px;background:linear-gradient(90deg,#8b5cf6,#e879f9)"><div class="cut-s mono" style="height:42px;background:#0b0714;display:flex;align-items:center;justify-content:center;gap:10px;font-size:13px;color:#ede9fe">${icon}${esc(label)}</div></div>`;
  return svg(170, 44, '', html, label);
}
const I = d => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

// ---------- Escribir archivos ----------
try { await fetchData(); } catch (e) { console.warn('API no disponible, uso datos de respaldo:', e.message); }
mkdirSync('assets', { recursive: true });
writeFileSync('assets/identity.svg', identity());
writeFileSync('assets/skills.svg', skills());
writeFileSync('assets/activity.svg', activity());
writeFileSync('assets/roadmap.svg', roadmap());
data.repoList.slice(0, 4).forEach((r, i) => writeFileSync(`assets/case-${i + 1}.svg`, caseCard(r, i)));
writeFileSync('assets/btn-github.svg', button('GitHub', I('<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3.1-.3 6.4-1.5 6.4-7A5.4 5.4 0 0 0 20 4.8 5 5 0 0 0 19.9 1S18.7.6 16 2.5a13.4 13.4 0 0 0-7 0C6.3.6 5.1 1 5.1 1A5 5 0 0 0 5 4.8a5.4 5.4 0 0 0-1.5 3.7c0 5.4 3.3 6.6 6.4 7A3.4 3.4 0 0 0 9 18.1V22"/>')));
writeFileSync('assets/btn-linkedin.svg', button('LinkedIn', I('<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>')));
writeFileSync('assets/btn-mail.svg', button('Email', I('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>')));

// README con enlaces a cada repo
const cases = data.repoList.slice(0, 4).map((r, i) =>
  `  <a href="https://github.com/${data.login}/${r.name}"><img src="assets/case-${i + 1}.svg" width="49%" alt="${esc(r.name)}"/></a>`).join('\n');
const readme = `<p align="center">
  <img src="assets/identity.svg" width="100%" alt="${esc(data.name)} — Full Stack Developer → Security Engineer"/>
</p>

<p align="center">
  <img src="assets/skills.svg" width="100%" alt="Tecnologías que uso"/>
</p>

<p align="center">
${cases}
</p>

<p align="center">
  <img src="assets/activity.svg" width="100%" alt="Actividad en GitHub"/>
</p>

<p align="center">
  <img src="assets/roadmap.svg" width="100%" alt="Ruta hacia ciberseguridad"/>
</p>

<p align="center">
  <b>¿Tienes un proyecto full stack o quieres revisar la seguridad de tu web?</b><br/><br/>
  <a href="https://github.com/${data.login}"><img src="assets/btn-github.svg" height="44" alt="GitHub"/></a>
  <a href="https://www.linkedin.com/in/TU-USUARIO"><img src="assets/btn-linkedin.svg" height="44" alt="LinkedIn"/></a>
  <a href="mailto:TU@CORREO.com"><img src="assets/btn-mail.svg" height="44" alt="Email"/></a>
</p>

<!-- Se actualiza solo cada día con .github/workflows/update.yml -->
`;
writeFileSync('README.md', readme);
console.log('OK', { contrib: data.contrib, repos: data.repos, langs: data.langs });
