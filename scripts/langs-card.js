// Draws assets/langs.svg: "Most Used Languages" as a full-width card, a pie on the left and a
// leaderboard on the right (gold / silver / bronze medals for the top 3, then #4 to #6).
// Data: the share of code per language across your public repositories (forks left out), the same
// source as github-readme-stats. The top 6 are shown as shares of 100%.
// Run by .github/workflows/langs-card.yml once a day; locally: GITHUB_USER=<name> node scripts/langs-card.js
const fs = require('fs');
const path = require('path');

const USER = process.env.GITHUB_USER || process.env.GITHUB_REPOSITORY_OWNER;
const TOKEN = process.env.GITHUB_TOKEN || '';
const OUT = path.join(__dirname, '..', 'assets', 'langs.svg');
const TOP = 6, W = 800, H = 300;
const COLORS = { JavaScript: '#f1e05a', TypeScript: '#3178c6', CSS: '#663399', SCSS: '#c6538c', HTML: '#e34c26', Dart: '#00B4AB',
  PHP: '#4F5D95', Java: '#b07219', Kotlin: '#A97BFF', Swift: '#F05138', Python: '#3572A5', Go: '#00ADD8', 'C++': '#f34b7d',
  C: '#555555', 'C#': '#178600', Ruby: '#701516', Rust: '#dea584', Vue: '#41b883', Blade: '#f7523f', Shell: '#89e051', CMake: '#DA3434' };
const T = { bg: '#141321', title: '#fe428e', text: '#a9fef7', muted: '#a9fef7aa', track: '#2a2840', gold: '#f8d847', silver: '#c9d1e0', bronze: '#d08a4f' };

async function gh(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'langs-card', Accept: 'application/vnd.github+json', ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }) } });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

async function languages() {
  const totals = {};
  for (let page = 1; ; page++) {
    const repos = await gh(`https://api.github.com/users/${USER}/repos?type=owner&per_page=100&page=${page}`);
    for (const repo of repos.filter(r => !r.fork && !r.archived)) {
      for (const [name, bytes] of Object.entries(await gh(repo.languages_url))) totals[name] = (totals[name] || 0) + bytes;
    }
    if (repos.length < 100) break;
  }
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, TOP);
  const sum = top.reduce((s, [, v]) => s + v, 0);
  return top.map(([name, v]) => ({ name, pct: v / sum * 100, color: COLORS[name] || '#8b949e' }));
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f1 = n => n.toFixed(1);

function render(langs) {
  // pie (left)
  let a = -Math.PI / 2, pie = '';
  const cx = 160, cy = 170, r = 100, pt = t => `${(cx + r * Math.cos(t)).toFixed(2)} ${(cy + r * Math.sin(t)).toFixed(2)}`;
  for (const l of langs) {
    const b = a + l.pct / 100 * Math.PI * 2;
    pie += l.pct >= 99.99 ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${l.color}"/>`
      : `<path d="M${cx} ${cy} L${pt(a)} A${r} ${r} 0 ${b - a > Math.PI ? 1 : 0} 1 ${pt(b)} Z" fill="${l.color}" stroke="${T.bg}" stroke-width="2"/>`;
    a = b;
  }
  // leaderboard (right)
  const x0 = 330, y0 = 82, w = W - x0 - 30, rowH = 38, max = langs[0]?.pct || 1;
  const medal = (i, x, y) => {
    const c = [T.gold, T.silver, T.bronze][i];
    return c ? `<circle cx="${x}" cy="${y}" r="13" fill="${c}"/><circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#00000033" stroke-width="2"/>
      <text x="${x}" y="${y + 4.5}" text-anchor="middle" class="medal">${i + 1}</text>`
      : `<text x="${x}" y="${y + 5}" text-anchor="middle" class="rank">#${i + 1}</text>`;
  };
  const rows = langs.map((l, i) => {
    const y = y0 + i * rowH, bx = x0 + 150, bw = w - 150 - 62;
    return `<g class="row" style="animation-delay:${i * 120}ms">${medal(i, x0 + 14, y)}
      <text x="${x0 + 38}" y="${y + 5}" class="name">${esc(l.name)}</text>
      <rect x="${bx}" y="${y - 6}" width="${bw}" height="12" rx="6" fill="${T.track}"/>
      <rect x="${bx}" y="${y - 6}" width="${(bw * l.pct / max).toFixed(1)}" height="12" rx="6" fill="${l.color}"/>
      <text x="${x0 + w}" y="${y + 5}" text-anchor="end" class="pct">${f1(l.pct)}%</text></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
<title id="t">Most Used Languages</title>
<desc id="d">${langs.map((l, i) => `${i + 1}. ${esc(l.name)} ${f1(l.pct)}%`).join(', ')}</desc>
<style>
  .title { font: 600 20px 'Segoe UI', Ubuntu, sans-serif; fill: ${T.title}; }
  .tag { font: 600 13px 'Segoe UI', Ubuntu, sans-serif; fill: ${T.title}; }
  .name { font: 600 15px 'Segoe UI', Ubuntu, sans-serif; fill: ${T.text}; }
  .pct { font: 700 14px 'Segoe UI', Ubuntu, sans-serif; fill: ${T.text}; }
  .rank { font: 800 14px 'Segoe UI', Ubuntu, sans-serif; fill: ${T.muted}; }
  .medal { font: 800 13px 'Segoe UI', Ubuntu, sans-serif; fill: #141321; }
  .row { opacity: 0; animation: in .5s ease forwards; }
  @keyframes in { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .row { animation: none; opacity: 1; } }
</style>
<rect width="${W}" height="${H}" rx="6" fill="${T.bg}"/>
<text x="30" y="42" class="title">Most Used Languages</text>
<text x="${W - 30}" y="42" text-anchor="end" class="tag">Leaderboard</text>
${pie}
${rows}
</svg>
`;
}

(async () => {
  if (!USER) throw new Error('Set GITHUB_USER (or run inside GitHub Actions)');
  const langs = await languages();
  if (!langs.length) throw new Error('No languages found');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, render(langs));
  console.log(`Wrote ${OUT}: ${langs.map(l => `${l.name} ${f1(l.pct)}%`).join(', ')}`);
})().catch(e => { console.error(e.message); process.exit(1); });
