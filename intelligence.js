// ─────────────────────────────────────────────────────────────────────────────
// TroutAtlas — Fishing Intelligence Module
// Data source: Open-Meteo (free, no API key required)
// ─────────────────────────────────────────────────────────────────────────────

const INTEL_CACHE_TTL = 30 * 60 * 1000; // 30 min

// ── WMO weather code map ──────────────────────────────────────────────────────
const WMO = {
  0:  { label: 'Cielo sereno',           icon: '☀️' },
  1:  { label: 'Prevalentemente sereno', icon: '🌤️' },
  2:  { label: 'Parzialmente nuvoloso',  icon: '⛅' },
  3:  { label: 'Coperto',                icon: '☁️' },
  45: { label: 'Nebbia',                 icon: '🌫️' },
  48: { label: 'Nebbia gelata',          icon: '🌫️' },
  51: { label: 'Pioviggine leggera',     icon: '🌦️' },
  53: { label: 'Pioviggine',             icon: '🌦️' },
  55: { label: 'Pioviggine intensa',     icon: '🌧️' },
  61: { label: 'Pioggia leggera',        icon: '🌧️' },
  63: { label: 'Pioggia moderata',       icon: '🌧️' },
  65: { label: 'Pioggia intensa',        icon: '🌧️' },
  71: { label: 'Neve leggera',           icon: '🌨️' },
  73: { label: 'Neve moderata',          icon: '❄️' },
  75: { label: 'Neve intensa',           icon: '❄️' },
  77: { label: 'Granelli di neve',       icon: '❄️' },
  80: { label: 'Rovesci leggeri',        icon: '🌦️' },
  81: { label: 'Rovesci moderati',       icon: '🌧️' },
  82: { label: 'Rovesci forti',          icon: '⛈️' },
  95: { label: 'Temporale',              icon: '⛈️' },
  96: { label: 'Temporale con grandine', icon: '⛈️' },
  99: { label: 'Temporale forte',        icon: '⛈️' }
};
function getWmo(code) { return WMO[code] || { label: 'Condizioni variabili', icon: '🌡️' }; }

const WIND_DIRS = ['N','NE','E','SE','S','SO','O','NO'];
function windDir(deg) { return WIND_DIRS[Math.round(deg / 45) % 8]; }

function getSeason() {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

// ── Data fetching with localStorage cache ─────────────────────────────────────
async function fetchIntel(lat, lng) {
  const key = `troutatlas_intel_${lat}_${lng}`;
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null');
    if (cached && Date.now() - cached.ts < INTEL_CACHE_TTL) return cached.data;
  } catch (_) {}

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,surface_pressure,` +
    `wind_speed_10m,wind_direction_10m,cloud_cover,visibility` +
    `&hourly=temperature_2m,precipitation` +
    `&daily=sunrise,sunset,precipitation_sum` +
    `&timezone=Europe%2FRome&past_days=1&forecast_days=1`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = await res.json();

  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch (_) {}
  return data;
}

// ── Precipitation in last 24 h from hourly array ──────────────────────────────
function rain24h(hourly) {
  const now = Date.now();
  return hourly.time.reduce((sum, t, i) => {
    const diff = (now - new Date(t).getTime()) / 3_600_000;
    return (diff >= 0 && diff <= 24) ? sum + (hourly.precipitation[i] || 0) : sum;
  }, 0);
}

// ── Water clarity model ───────────────────────────────────────────────────────
const CLARITY_LEVELS = [
  { label: 'Cristallina',          emoji: '🟢', color: '#22c55e', confidence: 90 },
  { label: 'Limpida',              emoji: '🟢', color: '#86efac', confidence: 82 },
  { label: 'Leggermente torbida',  emoji: '🟡', color: '#eab308', confidence: 75 },
  { label: 'Torbida',              emoji: '🟠', color: '#f97316', confidence: 70 },
  { label: 'Fangosa',              emoji: '🔴', color: '#ef4444', confidence: 85 }
];

function waterClarity(mm24, windSpeed, waterType) {
  const isLake = waterType && waterType.includes('lago');
  let idx;

  if (isLake) {
    // Lakes: wind stirs sediment; rainfall less direct
    if      (windSpeed > 40) idx = 4;
    else if (windSpeed > 25) idx = 3;
    else if (windSpeed > 15) idx = 2;
    else idx = mm24 < 5 ? 0 : mm24 < 20 ? 1 : 3;
  } else {
    // Rivers/streams: rainfall-driven turbidity
    if      (mm24 < 2)  idx = 0;
    else if (mm24 < 8)  idx = 1;
    else if (mm24 < 20) idx = 2;
    else if (mm24 < 40) idx = 3;
    else                idx = 4;
  }

  const bodyLabel = isLake ? 'lago' : 'corso d\'acqua';
  const REASONS = [
    `Assenza di precipitazioni recenti — acque cristalline nel ${bodyLabel}.`,
    `Piogge leggere (${mm24.toFixed(1)} mm/24h) — acqua generalmente limpida.`,
    `Precipitazioni moderate (${mm24.toFixed(1)} mm/24h) — torbidità lieve. Privilegiare artificiali vistosi.`,
    `Piogge abbondanti (${mm24.toFixed(1)} mm/24h) — acqua torbida. Streamer e spinning consigliati.`,
    `Piogge intense (${mm24.toFixed(1)} mm/24h) — acqua fangosa. Pesca molto difficile.`
  ];

  return { ...CLARITY_LEVELS[idx], reason: REASONS[idx], mm24 };
}

// ── Overall fishing score ─────────────────────────────────────────────────────
function fishingScore(current, clarityLabel, season) {
  const temp     = current.temperature_2m;
  const pressure = current.surface_pressure;
  const wind     = current.wind_speed_10m;
  const cloud    = current.cloud_cover;
  let pts = 0;

  // Air temperature (ideal for trout: 10–15 °C)
  if      (temp >= 10 && temp <= 15)  pts += 25;
  else if (temp >= 8  && temp <= 18)  pts += 18;
  else if (temp >= 5  && temp < 8)    pts += 10;
  else if (temp > 18  && temp <= 22)  pts += 8;
  else                                 pts += 2;

  // Atmospheric pressure
  if      (pressure >= 1018 && pressure <= 1028) pts += 25;
  else if (pressure >  1028)                      pts += 18;
  else if (pressure >= 1010)                      pts += 15;
  else                                             pts += 5;

  // Wind
  if      (wind < 10) pts += 20;
  else if (wind < 20) pts += 14;
  else if (wind < 30) pts += 7;

  // Cloud cover (overcast good for dry fly; too clear = bright sun = bad)
  if      (cloud >= 40 && cloud <= 80) pts += 15;
  else if (cloud < 40)                 pts += 10;
  else                                  pts += 8;

  // Water clarity
  const clarityPts = { 'Cristallina': 15, 'Limpida': 12, 'Leggermente torbida': 8, 'Torbida': 3, 'Fangosa': 0 };
  pts += clarityPts[clarityLabel] ?? 5;

  // Season bonus
  if (season === 'spring' || season === 'autumn') pts += 5;

  if (pts >= 80) return { label: 'Eccellente',   color: '#22c55e', bg: 'rgba(34,197,94,.15)',  icon: '🎯' };
  if (pts >= 65) return { label: 'Buono',         color: '#86efac', bg: 'rgba(134,239,172,.1)', icon: '👍' };
  if (pts >= 50) return { label: 'Nella media',   color: '#eab308', bg: 'rgba(234,179,8,.1)',   icon: '😐' };
  if (pts >= 35) return { label: 'Scarso',        color: '#f97316', bg: 'rgba(249,115,22,.1)',  icon: '👎' };
  return           { label: 'Molto scarso',  color: '#ef4444', bg: 'rgba(239,68,68,.1)',    icon: '🚫' };
}

// ── Technique recommendations ─────────────────────────────────────────────────
function techniques(current, clarity, river) {
  const temp    = current.temperature_2m;
  const cloud   = current.cloud_cover;
  const wind    = current.wind_speed_10m;
  const isFly   = river.flyFriendly;
  const isLake  = river.waterType && river.waterType.includes('lago');
  const cGood   = ['Cristallina', 'Limpida'].includes(clarity.label);
  const cMid    = clarity.label === 'Leggermente torbida';
  const cBad    = ['Torbida', 'Fangosa'].includes(clarity.label);
  const overcast = cloud > 60;
  const warm     = temp > 14;

  // Dry Fly
  let df = 1;
  if      (cGood && overcast && isFly && temp > 10 && wind < 15) df = 5;
  else if (cGood && isFly && temp > 12)                           df = 4;
  else if (cGood && isFly)                                        df = 3;
  else if (cMid && isFly)                                         df = 2;

  // Nymph
  let ny = 1;
  if      (cGood && isFly && !warm) ny = 5;
  else if (cGood && isFly)          ny = 4;
  else if (cMid && isFly)           ny = 3;
  else if (isFly)                   ny = 2;

  // Streamer
  let st = cBad ? 5 : cMid ? 4 : 3;
  if (isLake) st = Math.min(5, st + 1);

  // Spinning / Minnow / Spoon
  let sp = cBad ? 4 : cMid ? 4 : 3;
  if (isLake) sp = Math.min(5, sp + 1);

  const list = [
    {
      name: 'Mosca Secca', icon: '🪰', stars: df,
      note: overcast && cGood ? 'Ideale con cielo coperto e acqua limpida — emergenze attive.' :
            cBad ? 'Difficile: acqua torbida limita la visione del pesce.' :
            'Efficace nelle ore di maggiore attività degli insetti.'
    },
    {
      name: 'Ninfa', icon: '🐛', stars: ny,
      note: temp < 12 ? 'Ideale con acqua fredda — le ninfe sono il pasto principale.' :
            cBad ? 'Ancora efficace con ninfe di colore vivo su acqua torbida.' :
            'Ottima per tutto il giorno, specialmente nelle rapide.'
    },
    {
      name: 'Streamer', icon: '🐠', stars: st,
      note: cBad ? 'Prima scelta su acqua torbida — usa colori accesi (arancio, chartreuse).' :
            isLake ? 'Molto efficace a lago per le grandi trote lacustri.' :
            'Efficace nelle buche profonde e sotto le sponde.'
    },
    {
      name: 'Spinning / Spoon', icon: '🎣', stars: sp,
      note: isLake ? 'Tecnica versatile a lago con spoon e minnow.' :
            cGood ? 'Funziona nelle buche e nei tratti veloci.' :
            'Preferire artificiali fluo con acqua torbida.'
    }
  ];

  return list.sort((a, b) => b.stars - a.stars);
}

// ── Activity timeline ─────────────────────────────────────────────────────────
function activityTimes(hourly, daily, current) {
  const now = new Date();
  const todayStr = now.toDateString();

  const todayH = hourly.time
    .map((t, i) => ({ h: new Date(t).getHours(), temp: hourly.temperature_2m[i], dateStr: new Date(t).toDateString() }))
    .filter(x => x.dateStr === todayStr);

  function avgTemp(from, to) {
    const vals = todayH.filter(x => x.h >= from && x.h < to);
    if (!vals.length) return current.temperature_2m;
    return vals.reduce((s, x) => s + x.temp, 0) / vals.length;
  }

  // Trout activity vs temperature
  function tempAct(t) {
    if (t >= 10 && t <= 16) return 90;
    if (t >= 8  && t <= 18) return 70;
    if (t >= 6  && t <  8)  return 45;
    if (t >  18 && t <= 20) return 50;
    if (t >  20)             return 30;
    return 25;
  }

  const pBonus = current.surface_pressure >= 1015 ? 10 : current.surface_pressure < 1005 ? -15 : 0;
  const cBonus = current.cloud_cover > 60 ? 12 : current.cloud_cover < 25 ? -8 : 0;

  // Try to parse today's sunrise/sunset (index 1 = today with past_days=1)
  function fmtTime(isoStr) {
    if (!isoStr) return null;
    const d = new Date(isoStr);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const sunrise = fmtTime(daily.sunrise && daily.sunrise[1]);
  const sunset  = fmtTime(daily.sunset  && daily.sunset[1]);

  const clamp = v => Math.min(100, Math.max(5, v));

  return [
    {
      label: 'Mattino',    icon: '🌅',
      time:  sunrise ? `${sunrise} – 10:00` : '06:00 – 10:00',
      activity: clamp(tempAct(avgTemp(5, 10)) + pBonus + cBonus + 8)
    },
    {
      label: 'Pomeriggio', icon: '☀️',
      time:  '12:00 – 17:00',
      activity: clamp(tempAct(avgTemp(12, 17)) + pBonus + cBonus - 10)
    },
    {
      label: 'Sera',       icon: '🌇',
      time:  sunset ? `17:00 – ${sunset}` : '17:00 – 20:00',
      activity: clamp(tempAct(avgTemp(17, 21)) + pBonus + cBonus + 15)
    },
    {
      label: 'Notte',      icon: '🌙',
      time:  '21:00 – 05:00',
      activity: clamp(25 + pBonus)
    }
  ];
}

// ── HTML helpers ──────────────────────────────────────────────────────────────
function starsHtml(n) {
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="intel-star${i < n ? ' on' : ''}">★</span>`).join('');
}

function actBar(pct) {
  const col = pct >= 70 ? '#22c55e' : pct >= 45 ? '#eab308' : '#475569';
  return `<div class="intel-act-bar-wrap"><div class="intel-act-bar" style="width:${pct}%;background:${col}"></div></div>`;
}

function skeleton() {
  return `<div class="intel-skeleton">
    <div class="intel-pulse"></div>
    <div class="intel-pulse" style="width:72%;margin-top:9px"></div>
    <div class="intel-pulse" style="width:88%;margin-top:9px"></div>
    <div class="intel-pulse" style="width:60%;margin-top:9px"></div>
  </div>`;
}

function errHtml(msg) {
  return `<div class="intel-error"><span>⚠️</span><span>${msg}</span></div>`;
}

// ── Full render ───────────────────────────────────────────────────────────────
function renderIntel(data, river) {
  const c       = data.current;
  const season  = getSeason();
  const mm      = rain24h(data.hourly);
  const clarity = waterClarity(mm, c.wind_speed_10m, river.waterType);
  const score   = fishingScore(c, clarity.label, season);
  const techs   = techniques(c, clarity, river);
  const times   = activityTimes(data.hourly, data.daily, c);
  const wmo     = getWmo(c.weather_code);
  const pres    = c.surface_pressure;
  const presLbl = pres > 1020 ? '↑ Alta' : pres < 1010 ? '↓ Bassa' : '→ Stabile';
  const visKm   = c.visibility >= 10000 ? '>10 km' : (c.visibility / 1000).toFixed(1) + ' km';

  return `
<!-- §1 Live Weather ──────────────────────────────── -->
<div class="intel-card">
  <div class="intel-card-header">
    <span class="intel-icon">🌤️</span>
    <span>Meteo in tempo reale</span>
    <a class="intel-badge" href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a>
  </div>
  <div class="intel-weather-hero">
    <div class="intel-temp">${Math.round(c.temperature_2m)}°C</div>
    <div class="intel-wmo-label">${wmo.icon} ${wmo.label}</div>
  </div>
  <div class="intel-grid-2">
    <div class="intel-stat"><div class="intel-stat-label">Umidità</div><div class="intel-stat-value">${c.relative_humidity_2m}%</div></div>
    <div class="intel-stat"><div class="intel-stat-label">Vento</div><div class="intel-stat-value">${Math.round(c.wind_speed_10m)} km/h ${windDir(c.wind_direction_10m)}</div></div>
    <div class="intel-stat"><div class="intel-stat-label">Pressione</div><div class="intel-stat-value">${Math.round(pres)} hPa <span class="intel-sub">${presLbl}</span></div></div>
    <div class="intel-stat"><div class="intel-stat-label">Visibilità</div><div class="intel-stat-value">${visKm}</div></div>
    <div class="intel-stat"><div class="intel-stat-label">Nuvolosità</div><div class="intel-stat-value">${c.cloud_cover}%</div></div>
    <div class="intel-stat"><div class="intel-stat-label">Pioggia 24h</div><div class="intel-stat-value">${mm.toFixed(1)} mm</div></div>
  </div>
</div>

<!-- §2 Water Conditions ─────────────────────────── -->
<div class="intel-card">
  <div class="intel-card-header">
    <span class="intel-icon">💧</span>
    <span>Condizioni idriche</span>
  </div>
  <div class="intel-notice">
    📡 I dati idrometrici ufficiali (livello, portata, temperatura acqua) non sono disponibili in tempo reale per questo ${river.waterType || 'corso d\'acqua'}. Per dati precisi consulta <strong>ARPA Piemonte</strong> o <strong>ARPA Valle d'Aosta</strong>.
  </div>
  <div class="intel-grid-2" style="margin-top:12px">
    <div class="intel-stat">
      <div class="intel-stat-label">Temperatura acqua</div>
      <div class="intel-stat-value intel-na">N/D</div>
    </div>
    <div class="intel-stat">
      <div class="intel-stat-label">Piogge recenti</div>
      <div class="intel-stat-value">${mm < 2 ? '💧 Assenti' : mm < 15 ? `⚠️ Moderate (${mm.toFixed(1)} mm)` : `🔴 Abbondanti (${mm.toFixed(1)} mm)`}</div>
    </div>
    <div class="intel-stat">
      <div class="intel-stat-label">Livello fiume</div>
      <div class="intel-stat-value intel-na">N/D — dati ARPA</div>
    </div>
    <div class="intel-stat">
      <div class="intel-stat-label">Portata</div>
      <div class="intel-stat-value intel-na">N/D — dati ARPA</div>
    </div>
  </div>
</div>

<!-- §3 AI Water Analysis ────────────────────────── -->
<div class="intel-card">
  <div class="intel-card-header">
    <span class="intel-icon">🔬</span>
    <span>Analisi AI dell'acqua</span>
  </div>
  <div class="intel-clarity-row">
    <div class="intel-clarity-pill" style="background:${clarity.color}1a;border-color:${clarity.color}44;color:${clarity.color}">
      ${clarity.emoji} ${clarity.label}
    </div>
    <div class="intel-conf">
      <div class="intel-conf-label">Affidabilità</div>
      <div class="intel-conf-bar-wrap"><div class="intel-conf-bar" style="width:${clarity.confidence}%;background:${clarity.color}"></div></div>
      <div class="intel-conf-pct">${clarity.confidence}%</div>
    </div>
  </div>
  <div class="intel-clarity-reason">${clarity.reason}</div>
</div>

<!-- §4 Fishing Score ────────────────────────────── -->
<div class="intel-card">
  <div class="intel-card-header">
    <span class="intel-icon">📊</span>
    <span>Condizioni di pesca</span>
  </div>
  <div class="intel-score-box" style="background:${score.bg};border-color:${score.color}33">
    <div class="intel-score-icon">${score.icon}</div>
    <div class="intel-score-label" style="color:${score.color}">${score.label}</div>
    <div class="intel-score-chips">
      ${['Meteo','Pressione','Acqua','Stagione'].map(f =>
        `<span class="intel-score-chip" style="background:${score.bg};color:${score.color}">${f}</span>`).join('')}
    </div>
  </div>
</div>

<!-- §5 Best Techniques ──────────────────────────── -->
<div class="intel-card">
  <div class="intel-card-header">
    <span class="intel-icon">🏆</span>
    <span>Tecniche consigliate oggi</span>
  </div>
  <div class="intel-techs">
    ${techs.map(t => `
    <div class="intel-tech">
      <div class="intel-tech-icon">${t.icon}</div>
      <div class="intel-tech-body">
        <div class="intel-tech-name">${t.name}</div>
        <div class="intel-tech-stars">${starsHtml(t.stars)}</div>
        <div class="intel-tech-note">${t.note}</div>
      </div>
    </div>`).join('')}
  </div>
</div>

<!-- §6 Activity Timeline ────────────────────────── -->
<div class="intel-card">
  <div class="intel-card-header">
    <span class="intel-icon">⏰</span>
    <span>Attività del pesce</span>
  </div>
  <div class="intel-timeline">
    ${times.map(p => `
    <div class="intel-period">
      <div class="intel-period-meta">
        <span class="intel-period-label">${p.icon} ${p.label}</span>
        <span class="intel-period-time">${p.time}</span>
      </div>
      ${actBar(p.activity)}
      <div class="intel-period-pct">${p.activity}%</div>
    </div>`).join('')}
  </div>
  <div class="intel-tl-note">Basato su temperatura, pressione, copertura nuvolosa e biologia della trota.</div>
</div>`;
}

// ── Entry point (called from river.js) ───────────────────────────────────────
async function loadFishingIntelligence(river) {
  const section = document.getElementById('intel-section');
  if (!section || !river.coordinates) return;

  const { lat, lng } = river.coordinates;

  section.innerHTML =
    `<div class="intel-section-title">🧠 Fishing Intelligence</div>${skeleton()}`;

  try {
    const data = await fetchIntel(lat, lng);
    section.innerHTML =
      `<div class="intel-section-title">🧠 Fishing Intelligence</div>${renderIntel(data, river)}`;
  } catch (e) {
    section.innerHTML =
      `<div class="intel-section-title">🧠 Fishing Intelligence</div>` +
      errHtml('Impossibile caricare i dati meteo. Verifica la connessione e riprova.');
  }
}
