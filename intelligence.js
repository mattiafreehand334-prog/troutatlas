// ═══════════════════════════════════════════════════════════════════════════════
// TroutAtlas — Fishing Intelligence 3.0
// Data: Open-Meteo (free, no key) · ARPA Piemonte / Valle d'Aosta (graceful fallback)
// ═══════════════════════════════════════════════════════════════════════════════

// ── §0 Config ─────────────────────────────────────────────────────────────────
const CFG = {
  WEATHER_TTL:  15 * 60 * 1000, // 15 min
  HYDRO_TTL:    20 * 60 * 1000, // 20 min
  FETCH_TIMEOUT: 5000,
  CHART_WINDOW: '24h'           // default
};

// Module-level state (for chart tab switching)
let _intelHourly = null;
let _intelChartWindow = CFG.CHART_WINDOW;

// ── §1 Constants ───────────────────────────────────────────────────────────────
const WMO = {
  0:{ l:'Cielo sereno',i:'☀️' }, 1:{ l:'Prevalentemente sereno',i:'🌤️' },
  2:{ l:'Parzialmente nuvoloso',i:'⛅' }, 3:{ l:'Coperto',i:'☁️' },
  45:{ l:'Nebbia',i:'🌫️' }, 48:{ l:'Nebbia gelata',i:'🌫️' },
  51:{ l:'Pioviggine leggera',i:'🌦️' }, 53:{ l:'Pioviggine',i:'🌦️' },
  55:{ l:'Pioviggine intensa',i:'🌧️' }, 61:{ l:'Pioggia leggera',i:'🌧️' },
  63:{ l:'Pioggia moderata',i:'🌧️' }, 65:{ l:'Pioggia intensa',i:'🌧️' },
  71:{ l:'Neve leggera',i:'🌨️' }, 73:{ l:'Neve moderata',i:'❄️' },
  75:{ l:'Neve intensa',i:'❄️' }, 77:{ l:'Granelli di neve',i:'❄️' },
  80:{ l:'Rovesci leggeri',i:'🌦️' }, 81:{ l:'Rovesci moderati',i:'🌧️' },
  82:{ l:'Rovesci forti',i:'⛈️' }, 85:{ l:'Rovesci di neve',i:'🌨️' },
  95:{ l:'Temporale',i:'⛈️' }, 96:{ l:'Temporale con grandine',i:'⛈️' },
  99:{ l:'Temporale forte',i:'⛈️' }
};
function getWmo(c){ return WMO[c] || { l:'Condizioni variabili', i:'🌡️' }; }

const WDIRS = ['N','NE','E','SE','S','SO','O','NO'];
function windDir(d){ return WDIRS[Math.round(d/45)%8]; }

// ── §2 Utility functions ───────────────────────────────────────────────────────
function getSeason(){
  const m = new Date().getMonth();
  return m>=2&&m<=4?'spring': m>=5&&m<=7?'summer': m>=8&&m<=10?'autumn':'winter';
}

function fmtTime(isoStr){
  if(!isoStr) return '--:--';
  const d = new Date(isoStr);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function fmtHour(isoStr){
  if(!isoStr) return '';
  return `${new Date(isoStr).getHours()}:00`;
}

function fmtDayHour(isoStr){
  if(!isoStr) return '';
  const d = new Date(isoStr);
  const days = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  return `${days[d.getDay()]} ${d.getHours()}:00`;
}

function secondsToHM(s){
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60);
  return `${h}h ${m}m`;
}

// ── §3 Moon phase ─────────────────────────────────────────────────────────────
function moonAge(date){
  const knownNew = new Date(Date.UTC(2000,0,6,18,14));
  const SYNODIC = 29.53058770576;
  const days = (date - knownNew) / 86400000;
  return ((days % SYNODIC) + SYNODIC) % SYNODIC;
}
function moonIllum(age){
  return 0.5*(1 - Math.cos(2*Math.PI * age / 29.53058770576));
}
function moonName(age){
  if(age<1.85) return ['🌑','Luna Nuova'];
  if(age<7.38) return ['🌒','Crescente'];
  if(age<9.22) return ['🌓','Primo Quarto'];
  if(age<14.77) return ['🌔','Gibbosa Crescente'];
  if(age<16.61) return ['🌕','Luna Piena'];
  if(age<22.15) return ['🌖','Gibbosa Calante'];
  if(age<24.00) return ['🌗','Ultimo Quarto'];
  return ['🌘','Calante'];
}
// Fishing quality from moon (0=worst, 1=best)
function moonFishingFactor(age){
  // Best: 1-3 days after new moon; Good: days 8-10 (1st quarter); 
  // Decent: full moon; Worst: 5-7d after full moon
  const illum = moonIllum(age);
  if(age < 3) return 0.9;
  if(age < 5) return 0.7;
  if(age < 9) return 0.75;
  if(age < 11) return 0.7;
  if(age < 14) return 0.6;
  if(age < 17) return 0.65;
  if(age < 21) return 0.5;
  if(age < 24) return 0.7;
  return 0.8;
}

// ── §4 Cache ──────────────────────────────────────────────────────────────────
function cacheGet(key, ttl){
  try{
    const v = JSON.parse(localStorage.getItem('troutatlas_'+key)||'null');
    if(v && Date.now()-v.ts < ttl) return v.data;
  }catch(_){}
  return null;
}
function cacheSet(key, data){
  try{ localStorage.setItem('troutatlas_'+key, JSON.stringify({ts:Date.now(), data})); }catch(_){}
}

// ── §5 Fetch helpers ──────────────────────────────────────────────────────────
function withTimeout(promise, ms){
  return Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')), ms))
  ]);
}

async function safeFetch(url, ttlMs=CFG.WEATHER_TTL){
  const cacheKey = btoa(url.slice(-80));
  const cached = cacheGet(cacheKey, ttlMs);
  if(cached) return cached;
  const res = await withTimeout(fetch(url), CFG.FETCH_TIMEOUT);
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  cacheSet(cacheKey, data);
  return data;
}

// ── §6 Open-Meteo fetch ───────────────────────────────────────────────────────
async function fetchWeather(lat, lng){
  const url = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,` +
    `weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,` +
    `cloud_cover,visibility,precipitation,uv_index` +
    `&hourly=temperature_2m,apparent_temperature,precipitation,precipitation_probability,` +
    `surface_pressure,wind_speed_10m,wind_gusts_10m,cloud_cover,dew_point_2m` +
    `&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,` +
    `apparent_temperature_min,sunrise,sunset,daylight_duration,precipitation_sum,` +
    `precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max` +
    `&timezone=Europe%2FRome&past_days=7&forecast_days=2`;
  return safeFetch(url, CFG.WEATHER_TTL);
}

// ── §7 ARPA hydro attempt (silent fallback chain) ─────────────────────────────
// These will fail with CORS in the browser — caught silently, no errors shown.
const ARPA_SOURCES = [
  { name:'ARPA Piemonte', url:'https://webgis.arpa.piemonte.it/aggiornati/idrologia/data/stazioni.json' },
  { name:'ARPA Valle d\'Aosta', url:'https://presenze.arpa.vda.it/api/idro/latest.json' },
  { name:'Protezione Civile', url:'https://api.github.com/repos/pcm-dpc/DPC-Bollettini-Vigilanza-Meteorologica/contents' }
];
async function fetchHydro(){
  for(const src of ARPA_SOURCES){
    try{
      const data = await withTimeout(fetch(src.url), 3000).then(r=>{ if(!r.ok) throw 0; return r.json(); });
      if(data) return { source: src.name, data };
    }catch(_){ /* silent */ }
  }
  return null; // all sources unavailable
}

// ── §8 Derived calculations ───────────────────────────────────────────────────
// Sum precipitation for hours in [hoursAgo-range, hoursAgo]
function precipSum(hourly, hoursAgo, range=24){
  const now = Date.now();
  return hourly.time.reduce((s,t,i)=>{
    const h = (now - new Date(t).getTime()) / 3600000;
    return (h >= hoursAgo && h < hoursAgo+range) ? s+(hourly.precipitation[i]||0) : s;
  }, 0);
}

function precipSums(hourly){
  return {
    h24:  precipSum(hourly, 0, 24),
    h48:  precipSum(hourly, 24, 24),
    h72:  precipSum(hourly, 48, 24),
    next24: (() => {
      const now = Date.now();
      return hourly.time.reduce((s,t,i)=>{
        const h = (new Date(t).getTime() - now) / 3600000;
        return (h >= 0 && h < 24) ? s+(hourly.precipitation[i]||0) : s;
      }, 0);
    })()
  };
}

function pressureTrend(hourly){
  const now = Date.now();
  const pressures = [];
  hourly.time.forEach((t,i)=>{
    const h = (now - new Date(t).getTime()) / 3600000;
    if(h >= 0 && h <= 9) pressures.push({ h, p: hourly.surface_pressure[i] });
  });
  pressures.sort((a,b)=>a.h-b.h);
  if(pressures.length < 2) return { label:'→ Stabile', icon:'→', direction:'stable', delta:0 };
  const current = pressures[0].p;
  const ref3h  = pressures.find(x=>x.h>=2.5)?.p || current;
  const ref6h  = pressures.find(x=>x.h>=5.0)?.p || current;
  const delta3h = current - ref3h;
  const delta6h = current - ref6h;
  if(delta3h > 1.5 || delta6h > 3) return { label:'↑ In aumento', icon:'↑', direction:'up', delta: delta6h };
  if(delta3h < -1.5 || delta6h < -3) return { label:'↓ In calo', icon:'↓', direction:'down', delta: delta6h };
  return { label:'→ Stabile', icon:'→', direction:'stable', delta: delta6h };
}

// Estimated water temperature (labeled Stima AI)
function waterTempEstimate(wx, river){
  const season = getSeason();
  const daily = wx.daily;
  // Average of last 3 days' mean temperatures
  const recentDays = daily.temperature_2m_max.slice(-4, -1);
  const recentMins = daily.temperature_2m_min.slice(-4, -1);
  const avgAir = recentDays.reduce((s,v,i)=>s+(v+recentMins[i])/2,0) / (recentDays.length||1);
  
  const offsets = { spring:-1.5, summer:1.0, autumn:0, winter:-1.0 };
  const offset = offsets[season] || 0;
  
  // Alpine river correction based on altitude
  const alt = river.altitude || 400;
  const altCorrect = alt > 400 ? -((alt-400)/200)*0.4 : 0;
  
  const tw = Math.max(0.5, Math.min(22, 0.68*avgAir + offset + altCorrect));
  return { value: tw.toFixed(1), isEstimate: true };
}

// Water clarity model (4 levels)
const CLARITY = [
  { label:'Cristallina',          emoji:'🟢', color:'#22c55e', confidence:90 },
  { label:'Leggermente Velata',   emoji:'🟡', color:'#eab308', confidence:78 },
  { label:'Velata',               emoji:'🟠', color:'#f97316', confidence:72 },
  { label:'Torbida',              emoji:'🔴', color:'#ef4444', confidence:82 }
];

function waterClarity(pSums, windSpeed, waterType){
  const mm = pSums.h24;
  const isLake = waterType?.includes('lago');
  let idx;
  if(isLake){
    if(windSpeed > 35) idx = 3;
    else if(windSpeed > 22) idx = 2;
    else if(windSpeed > 12) idx = 1;
    else idx = mm < 8 ? 0 : mm < 25 ? 1 : 2;
  } else {
    if(mm < 3)  idx = 0;
    else if(mm < 12) idx = 1;
    else if(mm < 30) idx = 2;
    else idx = 3;
  }
  
  const bodyLabel = isLake ? 'lago' : 'corso d\'acqua';
  const REASONS = [
    `Assenza di precipitazioni significative nelle ultime 24h — acque cristalline nel ${bodyLabel}.`,
    `Piogge moderate (${mm.toFixed(1)} mm/24h) — leggera velatura. La visibilità è ridotta ma le trote rimangono attive.`,
    `Precipitazioni abbondanti (${mm.toFixed(1)} mm/24h) — acqua velata. Privilegiare artificiali vistosi e streamer.`,
    `Piogge intense (${mm.toFixed(1)} mm/24h) — acqua torbida. Pesca molto difficile; attendere 24-48h di bello stabile.`
  ];
  
  // Yesterday comparison
  const delta = mm - pSums.h48;
  const trend = delta > 3 ? '⬆️ In peggioramento rispetto a ieri' :
                delta < -3 ? '⬇️ In miglioramento rispetto a ieri' : '→ Stabile rispetto a ieri';
  
  // 24h forecast
  const forecast = pSums.next24 < 2 ? '☀️ Atteso miglioramento nelle prossime 24h' :
                   pSums.next24 < 10 ? '⛅ Condizioni simili attese domani' :
                   '⛈️ Peggioramento previsto nelle prossime 24h';
  
  const factors = ['Precipitazioni 24h','Precipitazioni 48h','Tipologia corso d\'acqua'];
  if(!isLake) factors.push('Portata stimata');
  
  return { ...CLARITY[idx], reason: REASONS[idx], trend, forecast, factors, idx };
}

// ── §9 AI Fishing Score ───────────────────────────────────────────────────────
function computeScore(wx, clarity, pTrend, waterTemp, moon, season){
  const c = wx.current;
  const temp    = c.temperature_2m;
  const wTemp   = parseFloat(waterTemp.value);
  const pressure= c.surface_pressure;
  const wind    = c.wind_speed_10m;
  const cloud   = c.cloud_cover;
  const precip  = c.precipitation || 0;
  const humid   = c.relative_humidity_2m;

  const positives = [], negatives = [];
  let total = 0;

  function factor(name, pts, maxPts, posLabel, negLabel){
    total += pts;
    const pct = pts / maxPts;
    if(pct >= 0.7 && posLabel) positives.push(posLabel);
    if(pct <= 0.3 && negLabel) negatives.push(negLabel);
  }

  // Air temperature (15 pts) — ideal 10–16°C
  let tPts;
  if(temp>=10&&temp<=16)     tPts=15;
  else if(temp>=8&&temp<=18) tPts=11;
  else if(temp>=5&&temp<8)   tPts=7;
  else if(temp>18&&temp<=22) tPts=6;
  else                        tPts=2;
  factor('temp', tPts, 15, temp>=10&&temp<=16?'Temperatura aria ideale per la trota':null, temp>22?'Temperatura aria troppo elevata':temp<5?'Temperatura aria troppo fredda':null);

  // Water temperature (12 pts) — ideal 8–15°C
  let wtPts;
  if(wTemp>=8&&wTemp<=15)   wtPts=12;
  else if(wTemp>=6&&wTemp<=17) wtPts=8;
  else if(wTemp>=4&&wTemp<6) wtPts=4;
  else if(wTemp>17&&wTemp<=20) wtPts=5;
  else                          wtPts=1;
  factor('wtemp', wtPts, 12, wTemp>=8&&wTemp<=15?'Temperatura acqua ottimale (Stima AI)':null, wTemp>20?'Acqua troppo calda (Stima AI)':null);

  // Pressure (12 pts) — ideal 1015–1028 hPa
  let pPts;
  if(pressure>=1015&&pressure<=1028) pPts=12;
  else if(pressure>1028)              pPts=9;
  else if(pressure>=1008)             pPts=7;
  else                                pPts=2;
  factor('pres', pPts, 12, pressure>=1015?'Pressione stabile e favorevole':null, pressure<1005?'Pressione bassa — attività ridotta':null);

  // Pressure trend (10 pts)
  let ptPts = pTrend.direction==='up'?10 : pTrend.direction==='stable'?7 : 2;
  factor('ptend', ptPts, 10, pTrend.direction==='up'?'Pressione in aumento':null, pTrend.direction==='down'?'Pressione in calo — sfavorevole':null);

  // Wind (10 pts)
  let wPts = wind<8?10 : wind<15?8 : wind<25?4 : 1;
  factor('wind', wPts, 10, wind<8?'Vento calmo':null, wind>25?'Vento forte — difficile gestire la lenza':null);

  // Precipitation at time of check (8 pts)
  let ppPts = precip===0?8 : precip<1?5 : precip<3?2 : 0;
  factor('prec', ppPts, 8, precip===0?'Nessuna precipitazione in corso':null, precip>=3?'Pioggia intensa in corso':null);

  // Cloud cover (8 pts) — 40-75% ideal
  let cPts = (cloud>=40&&cloud<=75)?8 : cloud<40?5 : cloud>90?5 : 7;
  factor('cloud', cPts, 8, cloud>=40&&cloud<=75?'Nuvolosità ideale per le emergenze':null, null);

  // Water clarity (12 pts)
  const clarityPts = [12, 8, 3, 0];
  let clPts = clarityPts[clarity.idx];
  factor('clarity', clPts, 12, clarity.idx===0?'Acqua cristallina':null, clarity.idx>=3?'Acqua torbida — visibilità minima':null);

  // Moon phase (5 pts)
  const moonPts = Math.round(moon.factor * 5);
  factor('moon', moonPts, 5, moonPts>=4?`${moon.icon} ${moon.name} favorevole`:null, moonPts<=1?`${moon.icon} ${moon.name} sfavorevole`:null);

  // Season (8 pts)
  const seasPts = season==='spring'?8 : season==='autumn'?7 : season==='summer'?5 : 3;
  factor('season', seasPts, 8, (season==='spring'||season==='autumn')?'Stagione ottimale per la pesca':null, season==='winter'?'Stagione invernale poco favorevole':null);

  const score = Math.min(100, Math.max(0, Math.round(total)));
  
  let label, color, bg, scoreEmoji;
  if(score>=86){ label='Condizioni Eccezionali'; color='#3b82f6'; bg='rgba(59,130,246,.15)'; scoreEmoji='🔵'; }
  else if(score>=71){ label='Condizioni Ottime'; color='#22c55e'; bg='rgba(34,197,94,.15)'; scoreEmoji='🟢'; }
  else if(score>=51){ label='Condizioni Buone'; color='#eab308'; bg='rgba(234,179,8,.12)'; scoreEmoji='🟡'; }
  else if(score>=31){ label='Condizioni Discrete'; color='#f97316'; bg='rgba(249,115,22,.12)'; scoreEmoji='🟠'; }
  else { label='Condizioni Scarse'; color='#ef4444'; bg='rgba(239,68,68,.12)'; scoreEmoji='🔴'; }

  const reliability = 72 + (clarity.idx===0?5:0) + (pTrend.direction==='stable'?3:0);

  return { score, label, color, bg, scoreEmoji, positives, negatives, reliability };
}

// ── §10 Stream Status ─────────────────────────────────────────────────────────
function computeStreamStatus(score, pSums, pTrend, clarity){
  const mm24 = pSums.h24;
  const mm72 = pSums.h24 + pSums.h48 + pSums.h72;
  
  if(clarity.idx >= 3 || mm72 > 80){
    return { level:'Critico', emoji:'🔴', color:'#ef4444', bg:'rgba(239,68,68,.12)',
      desc: `Precipitazioni intense (${mm72.toFixed(0)} mm negli ultimi 3 giorni) rendono il corso d'acqua pericoloso e impescabile. Attendere almeno 48-72h di tempo stabile prima di uscire.` };
  }
  if(clarity.idx >= 2 || mm24 > 20 || pTrend.direction==='down'){
    return { level:'Attenzione', emoji:'🟠', color:'#f97316', bg:'rgba(249,115,22,.12)',
      desc: 'Acqua velata con corrente più sostenuta del normale. Pesca difficile ma possibile con tecniche adatte (streamer, artificiali colorati). Prestare attenzione alla sicurezza in guado.' };
  }
  if(clarity.idx === 1 || score.score < 50){
    return { level:'Buono', emoji:'🟡', color:'#eab308', bg:'rgba(234,179,8,.1)',
      desc: 'Condizioni generalmente buone con qualche limitazione. Acqua in leggero recupero — aspettarsi una pesca selettiva. Preferire buche profonde e correnti laterali.' };
  }
  return { level:'Perfetto', emoji:'🟢', color:'#22c55e', bg:'rgba(34,197,94,.12)',
    desc: 'Condizioni ideali per la pesca. Acqua limpida, portata regolare e pressione favorevole. La trota è attiva e in alimentazione.' };
}

// ── §11 Activity timeline (6 periods) ────────────────────────────────────────
function computeActivity(hourly, daily, current){
  const now = new Date();
  const todayStr = now.toDateString();
  const todayH = hourly.time.map((t,i)=>({
    h: new Date(t).getHours(), temp: hourly.temperature_2m[i],
    ds: new Date(t).toDateString()
  })).filter(x=>x.ds===todayStr);

  function avgT(from, to){
    const v = todayH.filter(x=>x.h>=from&&x.h<to);
    return v.length ? v.reduce((s,x)=>s+x.temp,0)/v.length : current.temperature_2m;
  }

  function tempAct(t){
    if(t>=10&&t<=16) return 95;
    if(t>=8&&t<=18)  return 75;
    if(t>=6&&t<8)    return 50;
    if(t>18&&t<=21)  return 45;
    if(t>21)         return 25;
    return 20;
  }

  const pBonus = current.surface_pressure>=1015?8 : current.surface_pressure<1005?-18 : 0;
  const cBonus = current.cloud_cover>60?10 : current.cloud_cover<20?-6 : 0;
  const pTrendBonus = 0; // computed separately

  const sunrise = daily.sunrise?.[1] ? fmtTime(daily.sunrise[1]) : '06:00';
  const sunset  = daily.sunset?.[1]  ? fmtTime(daily.sunset[1])  : '21:00';
  const [srH] = sunrise.split(':').map(Number);
  const [ssH] = sunset.split(':').map(Number);

  const clamp = v=>Math.min(100, Math.max(5, Math.round(v)));

  const periods = [
    { label:'Alba',          icon:'🌅', time:`${sunrise} – ${srH+2}:00`,     activity: clamp(tempAct(avgT(srH, srH+2)) + pBonus + cBonus + 15) },
    { label:'Mattino',       icon:'☀️',  time:`${srH+2}:00 – 11:00`,          activity: clamp(tempAct(avgT(srH+2, 11)) + pBonus + cBonus + 8) },
    { label:'Tarda mattina', icon:'🌤️', time:'11:00 – 13:30',                 activity: clamp(tempAct(avgT(11, 14)) + pBonus + cBonus - 5) },
    { label:'Pomeriggio',    icon:'🌞', time:'13:30 – 17:30',                  activity: clamp(tempAct(avgT(14, 18)) + pBonus + cBonus - 12) },
    { label:'Sera',          icon:'🌇', time:`17:30 – ${sunset}`,              activity: clamp(tempAct(avgT(18, ssH)) + pBonus + cBonus + 18) },
    { label:'Notte',         icon:'🌙', time:`${sunset} – ${sunrise}`,         activity: clamp(28 + pBonus) }
  ];

  const best  = periods.reduce((a,b)=>a.activity>b.activity?a:b);
  const worst = periods.reduce((a,b)=>a.activity<b.activity?a:b);
  return { periods, best, worst };
}

// ── §12 Technique recommendations ────────────────────────────────────────────
function computeTechniques(wx, clarity, river){
  const temp  = wx.current.temperature_2m;
  const cloud = wx.current.cloud_cover;
  const wind  = wx.current.wind_speed_10m;
  const isFly = river.flyFriendly;
  const isLake = river.waterType?.includes('lago');
  const cGood  = clarity.idx === 0;
  const cMid   = clarity.idx === 1;
  const cBad   = clarity.idx >= 2;
  const overcast = cloud > 60;
  const warm   = temp > 14;

  // Star ratings 1-5
  let df = 1;
  if(cGood && overcast && isFly && temp>10 && wind<15) df = 5;
  else if(cGood && isFly && temp>12) df = 4;
  else if(cGood && isFly) df = 3;
  else if(cMid && isFly) df = 2;

  let ny = 1;
  if(cGood && isFly && !warm) ny = 5;
  else if(cGood && isFly) ny = 4;
  else if(cMid && isFly) ny = 3;
  else if(isFly) ny = 2;

  let st = cBad ? 5 : cMid ? 4 : 3;
  if(isLake) st = Math.min(5, st+1);

  let sp = cBad ? 4 : cMid ? 4 : 3;
  if(isLake) sp = Math.min(5, sp+1);

  let spoon = cBad ? 3 : cMid ? 4 : isLake ? 4 : 3;

  const data = [
    {
      name:'Mosca Secca', icon:'🪰', stars:df,
      depth:'Superficie', conditions: cGood && overcast ? 'Ideale — schiusi attivi' : cBad ? 'Non consigliata' : 'Selettiva',
      color: overcast ? 'Oliva, Elk Hair Caddis' : 'Parachute Adams, CDC',
      hook:'12–18', weight:'N/A', retrieval:'Deriva naturale senza tensione',
      note: overcast&&cGood?'Cielo coperto e acqua limpida — emergenze molto attive. Ottimo momento per la secca.' :
            cBad?'Acqua torbida: la trota non vede l\'artificiale in superficie.' :
            'Efficace nelle ore serali con le prime emergenze serotine.'
    },
    {
      name:'Ninfa', icon:'🐛', stars:ny,
      depth:'0.3–1.5 m', conditions: cGood ? 'Ideale tutto il giorno' : cMid ? 'Buona' : 'Discreta',
      color: temp<12?'Marrone, nero, oliva scuro':'Oliva, ambra, perla',
      hook:'14–18', weight:'1–3 g (jig)', retrieval:'Deriva naturale; rimbalzo sul fondo nelle buche',
      note: temp<12?'Acqua fredda: le ninfe sono il pasto principale. Lavora vicino al fondo.' :
            cBad?'Ancora efficace con ninfe di colore vivo su acque velate.' :
            'Ottima tutto il giorno, specialmente sotto le rapide e le cascatelle.'
    },
    {
      name:'Streamer', icon:'🐠', stars:st,
      depth:'1–3 m', conditions: cBad?'Prima scelta' : isLake?'Molto efficace':'Buono',
      color: cBad?'Arancio, chartreuse, giallo' : 'Bianco/argento, oliva, marrone',
      hook:'8–12', weight:'4–8 g', retrieval:'Strip lento con pause di 2–3 secondi',
      note: cBad?'Prima scelta con acqua torbida: usa colori accesi e mantenilo vicino al fondo.' :
            isLake?'Molto efficace a lago per le grandi trote lacustri nelle zone profonde.' :
            'Cerca le buche e gli under-cut banks; recupero lento e irregolare.'
    },
    {
      name:'Spinning / Minnow', icon:'🎣', stars:sp,
      depth:'0.5–2 m', conditions: cBad?'Efficace':'Buono',
      color: cGood?'Colori naturali (perch, trout)':'Fluo, arancio, giallo',
      hook:'6–10', weight:'3–7 g', retrieval:'Lineare con pause e cambi di velocità',
      note: isLake?'Versatile a lago, ottimo lungo le rive e vicino ai fondali.' :
            cGood?'Funziona nelle buche e nei tratti veloci con corrente uniforme.' :
            'Con acqua colorata usa minnow colorati e recupero più lento.'
    },
    {
      name:'Spoon', icon:'✨', stars:spoon,
      depth:'0.3–1.5 m', conditions: isLake?'Eccellente':'Buono',
      color: cloud>50?'Oro, rame':'Argento, cromo',
      hook:'Integrato', weight:'3–9 g', retrieval:'Lineare lento con leggere oscillazioni',
      note: isLake?'Lo spoon è micidiale a lago nelle acque aperte; varia il peso per trovare la profondità giusta.' :
            cloud>50?'Con cielo coperto preferire i toni caldi (oro, rame) — più visibili.' :
            'In acqua limpida e sole usare argento/cromo per il riflesso naturale.'
    }
  ];

  return data.sort((a,b)=>b.stars-a.stars);
}

// ── §13 AI Fishing Coach ──────────────────────────────────────────────────────
function generateCoach(wx, river, clarity, scoreData, activity, techniques){
  const c       = wx.current;
  const temp    = c.temperature_2m;
  const pressure= c.surface_pressure;
  const cloud   = c.cloud_cover;
  const wind    = c.wind_speed_10m;
  const season  = getSeason();
  const isLake  = river.waterType?.includes('lago');
  const best    = activity.best;
  const bestTech = techniques[0];
  const pTrend  = pressureTrend(wx.hourly);

  const parts = [];

  // § Dove saranno le trote
  if(isLake){
    if(temp > 18)      parts.push('Con acque calde, le trote lacustri si sono ritirate in profondità (4–8 m) dove la temperatura è più fresca e l\'ossigenazione migliore.');
    else if(temp < 8)  parts.push('Con acque fredde, le trote stazionano vicino al fondo nella parte più profonda del lago, con attività alimentare ridotta.');
    else               parts.push('Le trote sono distribuite a mezza acqua, preferendo le zone con ossigenazione elevata vicino agli immissari e alle correnti di ventilazione.');
  } else {
    if(temp < 10)      parts.push('Con acque fredde, le trote si concentrano nelle buche più profonde e nelle correnti laterali a flusso ridotto, dove riescono a metabolizzare con meno sforzo.');
    else if(temp > 20) parts.push('Con temperature elevate, le trote cercano rifugio nelle buche ombreggiate, sotto le sponde con vegetazione e nelle zone con corrente d\'aria: evitano le acque basse e soleggiate.');
    else if(cloud > 65) parts.push('Il cielo coperto favorisce l\'attività in superficie: le trote si spostano verso correnti aperte e zone di riffle, dove cacciano con più coraggio.');
    else               parts.push('Le trote tendono a stare vicino alle sponde ombreggiate, nelle buche con corrente laterale e sotto le cascatelle — dove l\'ombra e l\'ossigenazione sono maggiori.');
  }

  // § Miglior orario
  const timeMap = { 'Alba':'all\'alba','Mattino':'al mattino','Tarda mattina':'a tarda mattina','Pomeriggio':'nel pomeriggio','Sera':'in serata','Notte':'di notte' };
  parts.push(`Le migliori probabilità di cattura sono previste ${timeMap[best.label]||'al mattino'} (${best.time}), con un\'attività stimata dell\'${best.activity}%.`);

  // § Tecnica
  const techPhrases = {
    'Mosca Secca':      'Lavora la mosca secca nelle zone di riffle e in superficie: osserva gli schiusi prima di scegliere il pattern e varia la misura dell\'amo.',
    'Ninfa':            'Presenta la ninfa con deriva naturale nelle buche e sotto le rapide — usa un\'esca di colore neutro e mantienila vicino al fondo.',
    'Streamer':         'Recupera lo streamer lentamente con pause irregolari: le trote attaccano nella fase di pausa. Cerca le zone d\'ombra e le buche profonde.',
    'Spinning / Minnow':'Usa il minnow con recupero lineare e piccole pause — varia la velocità e la profondità fino a trovare la quota attiva del pesce.',
    'Spoon':            'Con lo spoon usa un recupero lineare e costante: varia il peso per trovare la profondità giusta e sfrutta le zone con corrente moderata.',
    'Soft Bait':        'Presenta la soft bait con Texas rig nelle buche profonde: recupero lentissimo con pause frequenti sul fondo.'
  };
  parts.push(techPhrases[bestTech.name] || `La tecnica più efficace oggi è ${bestTech.name.toLowerCase()}.`);

  // § Pressione
  if(pressure < 1005 || pTrend.direction === 'down'){
    parts.push('⚠️ Pressione bassa o in calo: le trote riducono l\'attività alimentare. Rallenta il recupero, usa esche più piccole e sii paziente — possono esserci finestre brevi di caccia attiva.');
  } else if(pressure > 1018 && pTrend.direction === 'up'){
    parts.push('✅ Pressione alta e in aumento: condizioni eccellenti per la caccia attiva. Le trote tendono a nutrirsi con regolarità — sfrutta le prime ore del giorno e la sera.');
  } else if(pTrend.direction === 'stable'){
    parts.push('Pressione stabile: le trote hanno avuto il tempo di adattarsi alle condizioni attuali — il comportamento alimentare sarà prevedibile e costante.');
  }

  return parts.join(' ');
}

// ── §14 SVG Charts ─────────────────────────────────────────────────────────────
function lineChart(values, { color='#3b82f6', fill=true, w=300, h=60 }={}){
  if(!values||values.length<2) return '<div class="intel-chart-empty">Dati non disponibili</div>';
  const min = Math.min(...values), max = Math.max(...values);
  const range = max-min || 1;
  const pts = values.map((v,i)=>{
    const x = (i/(values.length-1))*w;
    const y = h - ((v-min)/range)*(h-4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pStr = pts.join(' ');
  const first = pts[0], last = pts[pts.length-1];
  const fillPath = fill
    ? `<path d="M${first} L${pStr} L${last.split(',')[0]},${h+4} L${pts[0].split(',')[0]},${h+4} Z" fill="${color}" opacity="0.12"/>`
    : '';
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${h}px;overflow:visible;display:block">
    ${fillPath}
    <polyline points="${pStr}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${last.split(',')[0]}" cy="${last.split(',')[1]}" r="3" fill="${color}"/>
  </svg>`;
}

function barChart(values, { color='#3b82f6', w=300, h=40 }={}){
  if(!values||!values.length) return '';
  const max = Math.max(...values, 0.1);
  const bw  = Math.max(1, w/values.length - 1);
  const bars = values.map((v,i)=>{
    const x = (i/values.length)*w;
    const bh = Math.max(0, (v/max)*h);
    const y = h - bh;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="1" fill="${color}" opacity="0.75"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${h}px;display:block">${bars}</svg>`;
}

function chartAxisLabels(times, count=4){
  if(!times||!times.length) return '';
  const step = Math.floor(times.length/(count-1));
  const labels = [];
  for(let i=0;i<count-1;i++) labels.push(fmtDayHour(times[i*step]));
  labels.push(fmtDayHour(times[times.length-1]));
  return `<div class="intel-chart-axis">${labels.map(l=>`<span>${l}</span>`).join('')}</div>`;
}

function getChartData(hourly, windowHours){
  // Slice to time window (past N hours + a bit of future)
  const now = Date.now();
  const filtered = hourly.time.map((t,i)=>({ t:new Date(t).getTime(), i }))
    .filter(x=>(now-x.t)/3600000 <= windowHours);
  // Downsample if too many points
  let step = 1;
  if(filtered.length > 100) step = 3;
  if(filtered.length > 200) step = 6;
  const sampled = filtered.filter((_,i)=>i%step===0);
  return {
    times:  sampled.map(x=>hourly.time[x.i]),
    temp:   sampled.map(x=>hourly.temperature_2m[x.i]),
    precip: sampled.map(x=>hourly.precipitation[x.i]||0),
    pres:   sampled.map(x=>hourly.surface_pressure[x.i])
  };
}

function renderChartContent(hourly, win){
  const hours = win==='7d'?168 : win==='72h'?72 : 24;
  const d = getChartData(hourly, hours);
  const minT = Math.min(...d.temp).toFixed(1), maxT = Math.max(...d.temp).toFixed(1);
  const minP = Math.min(...d.pres).toFixed(0), maxP = Math.max(...d.pres).toFixed(0);
  const totalPrecip = d.precip.reduce((s,v)=>s+v,0).toFixed(1);
  const labelCount = win==='7d'?5 : win==='72h'?4 : 4;

  return `
  <div class="intel-chart-row">
    <div class="intel-chart-meta"><span class="intel-chart-var">🌡️ Temperatura aria</span><span class="intel-chart-range">${minT}° – ${maxT}°C</span></div>
    ${lineChart(d.temp,{color:'#f97316'})}
    ${chartAxisLabels(d.times, labelCount)}
  </div>
  <div class="intel-chart-row">
    <div class="intel-chart-meta"><span class="intel-chart-var">🌧️ Precipitazioni</span><span class="intel-chart-range">Tot: ${totalPrecip} mm</span></div>
    ${barChart(d.precip,{color:'#3b82f6', h:36})}
    ${chartAxisLabels(d.times, labelCount)}
  </div>
  <div class="intel-chart-row">
    <div class="intel-chart-meta"><span class="intel-chart-var">📊 Pressione</span><span class="intel-chart-range">${minP} – ${maxP} hPa</span></div>
    ${lineChart(d.pres,{color:'#a78bfa',fill:false})}
    ${chartAxisLabels(d.times, labelCount)}
  </div>`;
}

// ── §15 HTML renderers ─────────────────────────────────────────────────────────
function skCard(lines=3){
  const bars = Array.from({length:lines},(_,i)=>`<div class="intel-pulse" style="width:${[100,72,88][i%3]}%;margin-top:${i?8:0}px"></div>`).join('');
  return `<div class="intel-card"><div class="intel-skeleton">${bars}</div></div>`;
}

function skAll(){
  return Array.from({length:5},()=>skCard(3)).join('');
}

function renderScore(s){
  const circ = 314.16, fill = (s.score/100)*circ;
  return `<div class="intel-card intel-score-card">
  <div class="intel-card-header"><span class="intel-icon">🎯</span><span>Fishing Score AI</span></div>
  <div class="intel-score-main">
    <div class="intel-score-ring-wrap">
      <svg viewBox="0 0 120 120" class="intel-score-svg" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="50" class="intel-ring-bg"/>
        <circle cx="60" cy="60" r="50" class="intel-ring-fill" stroke="${s.color}"
          stroke-dasharray="${fill.toFixed(1)} ${circ}" transform="rotate(-90 60 60)"/>
        <text x="60" y="53" class="intel-ring-num" fill="${s.color}">${s.score}</text>
        <text x="60" y="68" class="intel-ring-sub" fill="#7a8fa8">/100</text>
      </svg>
    </div>
    <div class="intel-score-info">
      <div class="intel-score-emoji">${s.scoreEmoji}</div>
      <div class="intel-score-label-big" style="color:${s.color}">${s.label}</div>
      <div class="intel-score-reliability">Affidabilità: <strong>${s.reliability}%</strong></div>
    </div>
  </div>
  ${s.positives.length ? `<div class="intel-factors green"><div class="intel-factor-title">✅ Fattori positivi</div>${s.positives.map(f=>`<div class="intel-factor-item">+ ${f}</div>`).join('')}</div>` : ''}
  ${s.negatives.length ? `<div class="intel-factors red"><div class="intel-factor-title">❌ Fattori negativi</div>${s.negatives.map(f=>`<div class="intel-factor-item">− ${f}</div>`).join('')}</div>` : ''}
</div>`;
}

function renderWeather(wx, moon, pTrend){
  const c = wx.current, d = wx.daily;
  const wmo = getWmo(c.weather_code);
  const idx1 = d.sunrise?.[1] ? 1 : 0;
  const sunrise = fmtTime(d.sunrise?.[idx1]);
  const sunset  = fmtTime(d.sunset?.[idx1]);
  const daylen  = d.daylight_duration?.[idx1] ? secondsToHM(d.daylight_duration[idx1]) : '--';
  const vis = c.visibility >= 10000 ? '>10 km' : (c.visibility/1000).toFixed(1)+' km';
  const pres = Math.round(c.surface_pressure);
  const pColor = pTrend.direction==='up'?'#22c55e' : pTrend.direction==='down'?'#ef4444':'#7a8fa8';

  const now = new Date();
  const nextUpdate = new Date(now.getTime() + CFG.WEATHER_TTL);
  const fmtTS = (dt)=>`${dt.getHours()}:${String(dt.getMinutes()).padStart(2,'0')}`;

  return `<div class="intel-card">
  <div class="intel-card-header"><span class="intel-icon">🌤️</span><span>Meteo professionale</span><a class="intel-badge" href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a></div>
  <div class="intel-weather-hero">
    <div class="intel-temp-big">${Math.round(c.temperature_2m)}°C</div>
    <div class="intel-wmo-row">${wmo.i} ${wmo.l}</div>
    <div class="intel-feels">Percepita ${Math.round(c.apparent_temperature)}°C · Min ${Math.round(d.temperature_2m_min?.[idx1]||c.temperature_2m)}° / Max ${Math.round(d.temperature_2m_max?.[idx1]||c.temperature_2m)}°</div>
  </div>
  <div class="intel-grid-3">
    <div class="intel-stat"><div class="isl">Umidità</div><div class="isv">${c.relative_humidity_2m}%</div></div>
    <div class="intel-stat"><div class="isl">Pt. Rugiada</div><div class="isv">${Math.round(c.dew_point_2m||0)}°C</div></div>
    <div class="intel-stat"><div class="isl">UV</div><div class="isv">${c.uv_index??'—'} <span class="intel-sub">${c.uv_index>=8?'Molto alto':c.uv_index>=6?'Alto':c.uv_index>=3?'Moderato':'Basso'}</span></div></div>
    <div class="intel-stat"><div class="isl">Vento</div><div class="isv">${Math.round(c.wind_speed_10m)} km/h ${windDir(c.wind_direction_10m)}</div></div>
    <div class="intel-stat"><div class="isl">Raffiche</div><div class="isv">${Math.round(c.wind_gusts_10m||0)} km/h</div></div>
    <div class="intel-stat"><div class="isl">Nuvolosità</div><div class="isv">${c.cloud_cover}%</div></div>
    <div class="intel-stat"><div class="isl">Visibilità</div><div class="isv">${vis}</div></div>
    <div class="intel-stat"><div class="isl">Pioggia ora</div><div class="isv">${(c.precipitation||0).toFixed(1)} mm</div></div>
    <div class="intel-stat"><div class="isl">P. max domani</div><div class="isv">${d.precipitation_probability_max?.[idx1]??'—'}%</div></div>
  </div>
  <div class="intel-divider"></div>
  <div class="intel-grid-2">
    <div class="intel-stat">
      <div class="isl">Pressione</div>
      <div class="isv">${pres} hPa <span style="color:${pColor};font-size:12px">${pTrend.icon} ${pTrend.label}</span></div>
    </div>
    <div class="intel-stat">
      <div class="isl">Δ pressione 6h</div>
      <div class="isv" style="color:${pColor}">${pTrend.delta>0?'+':''}${pTrend.delta.toFixed(1)} hPa</div>
    </div>
  </div>
  <div class="intel-divider"></div>
  <div class="intel-sun-row">
    <div class="intel-sun-item"><span class="intel-sun-icon">🌅</span><div class="isl">Alba</div><div class="isv">${sunrise}</div></div>
    <div class="intel-sun-item"><span class="intel-sun-icon">🌇</span><div class="isl">Tramonto</div><div class="isv">${sunset}</div></div>
    <div class="intel-sun-item"><span class="intel-sun-icon">⏱️</span><div class="isl">Durata giorno</div><div class="isv">${daylen}</div></div>
    <div class="intel-sun-item"><span class="intel-sun-icon">${moon.icon}</span><div class="isl">${moon.name}</div><div class="isv">${Math.round(moon.illum*100)}% illuminata</div></div>
  </div>
  <div class="intel-update-row">
    <span>🕐 Aggiornato: ${fmtTS(now)}</span>
    <span>Prossimo: ${fmtTS(nextUpdate)}</span>
  </div>
</div>`;
}

function renderHydro(pSums, waterTemp, river){
  const isLake = river.waterType?.includes('lago');
  const body = isLake ? 'lago' : 'corso d\'acqua';
  const mm24 = pSums.h24.toFixed(1), mm48 = pSums.h48.toFixed(1), mm72 = pSums.h72.toFixed(1);
  const trendArrow = pSums.h24 > pSums.h48+2 ? '⬆️ In aumento' : pSums.h24 < pSums.h48-2 ? '⬇️ In calo' : '→ Stabile';

  return `<div class="intel-card">
  <div class="intel-card-header"><span class="intel-icon">💧</span><span>Condizioni idriche</span></div>
  <div class="intel-notice">
    📡 I dati idrometrici ufficiali (livello, portata, temperatura) sono stati verificati su <strong>ARPA Piemonte</strong>, <strong>ARPA Valle d'Aosta</strong>, <strong>Protezione Civile</strong> e <strong>OpenData regionali</strong> — non disponibili in tempo reale per questo ${body}. I parametri stimati sono calcolati dall'AI sulla base dei dati meteo disponibili.
  </div>
  <div class="intel-grid-2" style="margin-top:12px">
    <div class="intel-stat">
      <div class="isl">Livello idrometrico</div>
      <div class="isv intel-na">Non disponibile per questa stazione</div>
    </div>
    <div class="intel-stat">
      <div class="isl">Portata (m³/s)</div>
      <div class="isv intel-na">Non disponibile per questa stazione</div>
    </div>
    <div class="intel-stat">
      <div class="isl">Temp. acqua</div>
      <div class="isv">${waterTemp.value}°C <span class="intel-ai-tag">Stima AI</span></div>
    </div>
    <div class="intel-stat">
      <div class="isl">Tendenza livello</div>
      <div class="isv">${trendArrow} <span class="intel-ai-tag">Stima AI</span></div>
    </div>
  </div>
  <div class="intel-divider"></div>
  <div class="intel-precip-history">
    <div class="isl" style="margin-bottom:8px">Precipitazioni cumulate — dati reali Open-Meteo</div>
    <div class="intel-grid-3">
      <div class="intel-stat"><div class="isl">Ultime 24h</div><div class="isv ${pSums.h24>15?'c-red':pSums.h24>5?'c-amber':''}">${mm24} mm</div></div>
      <div class="intel-stat"><div class="isl">Prec. 24-48h fa</div><div class="isv">${mm48} mm</div></div>
      <div class="intel-stat"><div class="isl">Prec. 48-72h fa</div><div class="isv">${mm72} mm</div></div>
    </div>
  </div>
  <div class="intel-divider"></div>
  <div class="intel-na-sources">
    <div class="isl" style="margin-bottom:6px">Parametri non rilevabili da fonti pubbliche aperte</div>
    ${['Velocità corrente','Ossigeno disciolto','Conducibilità','pH','Torbidità ufficiale'].map(p=>`<div class="intel-na-row"><span>${p}</span><span class="intel-na">Non disponibile per questa stazione</span></div>`).join('')}
  </div>
</div>`;
}

function renderClarity(clarity, pSums){
  return `<div class="intel-card">
  <div class="intel-card-header"><span class="intel-icon">🔬</span><span>Analisi AI qualità acqua</span><span class="intel-ai-badge">Stima AI</span></div>
  <div class="intel-clarity-hero">
    <div class="intel-clarity-pill" style="background:${clarity.color}1a;border-color:${clarity.color}44;color:${clarity.color}">
      ${clarity.emoji} ${clarity.label}
    </div>
    <div class="intel-conf-wrap">
      <div class="isl">Affidabilità</div>
      <div class="intel-conf-bar-wrap"><div class="intel-conf-bar" style="width:${clarity.confidence}%;background:${clarity.color}"></div></div>
      <div class="intel-conf-pct">${clarity.confidence}%</div>
    </div>
  </div>
  <div class="intel-clarity-reason">${clarity.reason}</div>
  <div class="intel-clarity-meta">
    <div class="intel-cm-item"><span class="isl">Tendenza</span><span>${clarity.trend}</span></div>
    <div class="intel-cm-item"><span class="isl">Prossime 24h</span><span>${clarity.forecast}</span></div>
    <div class="intel-cm-item"><span class="isl">Fattori considerati</span><span>${clarity.factors.join(', ')}</span></div>
  </div>
</div>`;
}

function renderStatus(status){
  return `<div class="intel-card">
  <div class="intel-card-header"><span class="intel-icon">🌊</span><span>Stato del torrente</span></div>
  <div class="intel-status-box" style="background:${status.bg};border-color:${status.color}33">
    <div class="intel-status-icon">${status.emoji}</div>
    <div>
      <div class="intel-status-label" style="color:${status.color}">${status.level}</div>
      <div class="intel-status-desc">${status.desc}</div>
    </div>
  </div>
</div>`;
}

function renderCoach(text){
  return `<div class="intel-card intel-coach-card">
  <div class="intel-card-header" style="border-color:rgba(59,130,246,.2)"><span class="intel-icon">🧠</span><span style="color:#93c5fd">Consiglio AI</span><span class="intel-ai-badge">AI</span></div>
  <div class="intel-coach-text">${text}</div>
</div>`;
}

function renderTechniques(techs){
  return `<div class="intel-card">
  <div class="intel-card-header"><span class="intel-icon">🏆</span><span>Tecniche consigliate oggi</span></div>
  <div class="intel-techs">
  ${techs.map((t,idx)=>`
    <div class="intel-tech ${idx===0?'intel-tech-top':''}">
      <div class="intel-tech-header">
        <span class="intel-tech-icon">${t.icon}</span>
        <div class="intel-tech-title">
          <div class="intel-tech-name">${t.name}${idx===0?' <span class="intel-best-tag">Migliore oggi</span>':''}</div>
          <div class="intel-tech-stars">${Array.from({length:5},(_,i)=>`<span class="intel-star${i<t.stars?' on':''}">${i<t.stars?'★':'☆'}</span>`).join('')}</div>
        </div>
        <div class="intel-tech-cond-badge" style="${t.stars>=4?'color:#22c55e':t.stars>=3?'color:#eab308':'color:#7a8fa8'}">${t.conditions}</div>
      </div>
      <div class="intel-tech-note">${t.note}</div>
      <div class="intel-tech-details">
        <div class="intel-td"><span class="isl">Profondità</span><span class="intel-td-v">${t.depth}</span></div>
        <div class="intel-td"><span class="isl">Colore</span><span class="intel-td-v">${t.color}</span></div>
        <div class="intel-td"><span class="isl">Amo</span><span class="intel-td-v">${t.hook}</span></div>
        <div class="intel-td"><span class="isl">Peso</span><span class="intel-td-v">${t.weight}</span></div>
        <div class="intel-td intel-td-full"><span class="isl">Recupero</span><span class="intel-td-v">${t.retrieval}</span></div>
      </div>
    </div>`).join('')}
  </div>
</div>`;
}

function renderActivity(act){
  const { periods, best, worst } = act;
  return `<div class="intel-card">
  <div class="intel-card-header"><span class="intel-icon">⏰</span><span>Attività delle trote</span></div>
  <div class="intel-activity-highlights">
    <div class="intel-hl intel-hl-best">
      <div class="isl">🔥 Miglior orario</div>
      <div class="intel-hl-val">${best.icon} ${best.label} · ${best.time}</div>
      <div class="intel-hl-pct" style="color:#22c55e">${best.activity}% attività</div>
    </div>
    <div class="intel-hl intel-hl-worst">
      <div class="isl">❌ Peggior orario</div>
      <div class="intel-hl-val">${worst.icon} ${worst.label} · ${worst.time}</div>
      <div class="intel-hl-pct" style="color:#ef4444">${worst.activity}% attività</div>
    </div>
  </div>
  <div class="intel-timeline">
  ${periods.map(p=>{
    const col = p.activity>=70?'#22c55e': p.activity>=45?'#eab308':'#475569';
    const isBest = p.label===best.label, isWorst=p.label===worst.label;
    return `<div class="intel-period ${isBest?'intel-period-best':isWorst?'intel-period-worst':''}">
      <div class="intel-period-meta">
        <span class="intel-period-lbl">${p.icon} ${p.label}</span>
        <span class="intel-period-time">${p.time}</span>
      </div>
      <div class="intel-act-bar-wrap"><div class="intel-act-bar" style="width:${p.activity}%;background:${col}"></div></div>
      <div class="intel-period-pct" style="color:${col}">${p.activity}%</div>
    </div>`;
  }).join('')}
  </div>
  <div class="intel-tl-note">Stima AI basata su temperatura oraria, pressione, nuvolosità e biologia della trota fario.</div>
</div>`;
}

function renderCharts(hourly){
  _intelHourly = hourly;
  const tabs = ['24h','72h','7d'];
  return `<div class="intel-card" id="intel-charts-card">
  <div class="intel-card-header"><span class="intel-icon">📈</span><span>Grafici storici</span></div>
  <div class="intel-chart-tabs">
    ${tabs.map(t=>`<button class="intel-chart-tab${t===_intelChartWindow?' active':''}" onclick="intelSetChartWindow('${t}')">${t}</button>`).join('')}
  </div>
  <div id="intel-chart-content">
    ${renderChartContent(hourly, _intelChartWindow)}
  </div>
</div>`;
}

function renderSources(usedAt){
  const fmtDT = (d)=>`${d.toLocaleDateString('it-IT')} ${d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}`;
  return `<div class="intel-card intel-sources-card">
  <div class="intel-card-header"><span class="intel-icon">📡</span><span>Fonti dati</span></div>
  <div class="intel-sources-list">
    <div class="intel-source-row"><span class="intel-source-dot" style="background:#22c55e"></span><span>Open-Meteo</span><span class="intel-source-type">Dati reali</span></div>
    <div class="intel-source-row"><span class="intel-source-dot" style="background:#64748b"></span><span>ARPA Piemonte</span><span class="intel-source-type">Non disponibile</span></div>
    <div class="intel-source-row"><span class="intel-source-dot" style="background:#64748b"></span><span>ARPA Valle d'Aosta</span><span class="intel-source-type">Non disponibile</span></div>
    <div class="intel-source-row"><span class="intel-source-dot" style="background:#3b82f6"></span><span>Algoritmo AI interno</span><span class="intel-source-type">Stima AI</span></div>
  </div>
  <div class="intel-sources-note">
    I dati contrassegnati come <strong>Stima AI</strong> sono calcolati algoritmicamente e non costituiscono misurazioni ufficiali. 
    Verifica sempre le condizioni locali prima di guadare.
  </div>
  <div class="intel-update-row" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
    <span>📅 Ultimo aggiornamento: ${fmtDT(usedAt)}</span>
  </div>
</div>`;
}

// ── §16 Global chart tab handler (called from inline onclick) ─────────────────
function intelSetChartWindow(win){
  _intelChartWindow = win;
  if(!_intelHourly) return;
  document.querySelectorAll('.intel-chart-tab').forEach(b=>{
    b.classList.toggle('active', b.textContent===win);
  });
  const content = document.getElementById('intel-chart-content');
  if(content) content.innerHTML = renderChartContent(_intelHourly, win);
}

// ── §17 Full render ───────────────────────────────────────────────────────────
function renderAll(wx, river){
  const now   = new Date();
  const season= getSeason();
  const pSums = precipSums(wx.hourly);
  const pTrend= pressureTrend(wx.hourly);
  const mAge  = moonAge(now);
  const moon  = { age:mAge, illum:moonIllum(mAge), icon:moonName(mAge)[0], name:moonName(mAge)[1], factor:moonFishingFactor(mAge) };
  const clarity = waterClarity(pSums, wx.current.wind_speed_10m, river.waterType);
  const waterT  = waterTempEstimate(wx, river);
  const score   = computeScore(wx, clarity, pTrend, waterT, moon, season);
  const status  = computeStreamStatus(score, pSums, pTrend, clarity);
  const techs   = computeTechniques(wx, clarity, river);
  const activity= computeActivity(wx.hourly, wx.daily, wx.current);
  const coach   = generateCoach(wx, river, clarity, score, activity, techs);

  return [
    renderScore(score),
    renderWeather(wx, moon, pTrend),
    renderHydro(pSums, waterT, river),
    renderClarity(clarity, pSums),
    renderStatus(status),
    renderCoach(coach),
    renderTechniques(techs),
    renderActivity(activity),
    renderCharts(wx.hourly),
    renderSources(now)
  ].join('');
}

// ── §18 Main entry point ──────────────────────────────────────────────────────
async function loadFishingIntelligence(river){
  const section = document.getElementById('intel-section');
  if(!section || !river.coordinates) return;
  const { lat, lng } = river.coordinates;

  section.innerHTML = `<div class="intel-section-title">🧠 Fishing Intelligence</div>${skAll()}`;

  try {
    const wx = await fetchWeather(lat, lng);
    section.innerHTML = `<div class="intel-section-title">🧠 Fishing Intelligence <span class="intel-powered">powered by Open-Meteo</span></div>${renderAll(wx, river)}`;
  } catch(e){
    section.innerHTML = `<div class="intel-section-title">🧠 Fishing Intelligence</div>
      <div class="intel-error"><span>⚠️</span><span>Impossibile caricare i dati meteo. Verifica la connessione e riprova.</span></div>`;
  }
}
