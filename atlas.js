// ═══════════════════════════════════════════════════════════════════
// ATLAS AI — TroutAtlas Intelligent Assistant
// Modular architecture: DB → Context → Memory → Provider → UI
// Provider interface designed for easy OpenAI swap (see §4 header)
// ═══════════════════════════════════════════════════════════════════

/* ── §0 State ────────────────────────────────────────────────────── */
let _rivers = [];          // loaded from database.json
let _sending = false;

/* ── §1 AtlasDB ─────────────────────────────────────────────────── */
const AtlasDB = {
  async load() {
    try {
      const r = await fetch("database.json");
      _rivers = await r.json();
    } catch(_) { _rivers = []; }
  },
  findByName(msg) {
    const m = msg.toLowerCase();
    // Explicit alias map first
    const aliases = {
      "sesia":true,"cervo":true,"sessera":true,"strona":true,
      "mastallone":true,"lys":true,"lis ":true,"orco":true,
      "artogna":true,"elvo":true,"antrona":true,"mucrone":true,
      "viverone":true,"lago nero":true,"lagonero":true,"scopello":true
    };
    for(const r of _rivers) {
      if(m.includes(r.name.toLowerCase())) return r;
    }
    // Alias → river
    if(m.includes("scopello")) return _rivers.find(r=>r.id==="sesia") || null;
    if(m.includes("lago nero")||m.includes("lagonero")) return _rivers.find(r=>r.id==="lagoNero") || null;
    if(m.includes("lis ")|| m.match(/\blis\b/)) return _rivers.find(r=>r.id==="lys") || null;
    return null;
  },
  rivers() { return _rivers; }
};

/* ── §1.5 AtlasSpots ─────────────────────────────────────────────── */
// Spot search, filter, and criteria parsing across all rivers
const AtlasSpots = {
  // Flatten all spots from all rivers into one array with _river back-ref
  all() {
    const out = [];
    for(const r of _rivers) {
      if(Array.isArray(r.spots)) {
        r.spots.forEach(s => out.push(Object.assign({}, s, { _river: r })));
      }
    }
    return out;
  },
  // Filter spots by criteria object
  find(criteria = {}) {
    return this.all().filter(s => {
      if(criteria.riverId      && s._river.id !== criteria.riverId)   return false;
      if(criteria.familyFriendly && !s.familyFriendly)                return false;
      if(criteria.scenicView     && !s.scenicView)                    return false;
      if(criteria.bigFish        && !s.bigFish)                       return false;
      if(criteria.stocking       && !s.stocking)                      return false;
      if(criteria.lowCrowd       && s.crowded)                        return false;
      if(criteria.maxDifficulty  && s.difficulty > criteria.maxDifficulty) return false;
      if(criteria.maxWalk != null && s.walkingMinutes > criteria.maxWalk)  return false;
      if(criteria.technique && !s.techniques.includes(criteria.technique)) return false;
      if(criteria.type      && s.type !== criteria.type)              return false;
      return true;
    });
  },
  // Best N spots sorted by fishingScore
  best(criteria = {}, n = 3) {
    return this.find(criteria)
      .sort((a,b) => (b.fishingScore||0) - (a.fishingScore||0))
      .slice(0, n);
  },
  // Parse natural-language criteria from user message
  parseCriteria(msg, hintRiver) {
    const m = msg.toLowerCase();
    const c = {};
    if(hintRiver) c.riverId = hintRiver.id;
    if(/facil|bambin|figlio|famiglia|principiant|semplice|sicur/.test(m))     { c.maxDifficulty = 2; c.familyFriendly = true; }
    if(/poco cammin|camminare poco|vicino|raggiungib|senza fatica|min.*cammino/.test(m)) c.maxWalk = 10;
    if(/panoram|vista|bello|scenic|fotogenico/.test(m))                        c.scenicView   = true;
    if(/gross[ae] trot|taglia|trofeo|grande trot|monster|record/.test(m))      c.bigFish      = true;
    if(/poco frequentat|solitudi|tranquillo|nessuno|isolat/.test(m))           c.lowCrowd     = true;
    if(/ripopolat|stocking|immission/.test(m))                                  c.stocking     = true;
    if(/ninfa|nymph/.test(m))                                                   c.technique    = "ninfa";
    if(/\bsecca\b|dry fly/.test(m))                                             c.technique    = "secca";
    if(/streamer/.test(m))                                                      c.technique    = "streamer";
    if(/spinning|spoon|minnow|artificiale/.test(m))                             c.technique    = "spinning";
    if(/buca profond|\bbuca\b|pool\b|vasca/.test(m))                            c.type         = "buca";
    if(/raschio|riffle/.test(m))                                                c.type         = "raschio";
    if(/cascata|salto|waterfall/.test(m))                                       c.type         = "salto";
    return c;
  },
  // Build spot map-action tag (rendered as card in AI response)
  spotTag(spot) {
    const s = spot.fishingScore || 0;
    return `[[SPOT:${spot._river.id}:${spot.id}:${spot.name}:${s}]]`;
  }
};

/* ── §2 AtlasContext ─────────────────────────────────────────────── */
const AtlasContext = {
  build() {
    const now   = new Date();
    const month = now.getMonth() + 1;  // 1-12
    const hour  = now.getHours();
    const season = month>=3&&month<=5?"primavera" : month>=6&&month<=8?"estate" :
                   month>=9&&month<=10?"autunno" : "inverno";
    const isSeasonOpen = month>=3 && month<=9;
    const period = hour<6?"notte" : hour<10?"alba/mattino" : hour<13?"tarda mattina" :
                   hour<17?"pomeriggio" : hour<20?"sera" : "notte";
    const lastRiverId = localStorage.getItem("atlas_last_river");
    const lastRiver   = lastRiverId ? _rivers.find(r=>r.id===lastRiverId) : null;
    // Try to read cached weather for last river
    let weather = null;
    if(lastRiver && lastRiver.coordinates) {
      const { lat, lng } = lastRiver.coordinates;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}`;
      try {
        const raw = localStorage.getItem("intel_wx_" + btoa(url.slice(-80)));
        if(raw) { const p = JSON.parse(raw); if(Date.now()-p.ts < 3600000) weather = p.data; }
      } catch(_) {}
    }
    return { now, month, hour, season, isSeasonOpen, period, lastRiver, weather, rivers: _rivers };
  }
};

/* ── §3 AtlasMemory ──────────────────────────────────────────────── */
const AtlasMemory = {
  KEY: "atlas_history",
  MAX: 30,
  load()  { try { return JSON.parse(localStorage.getItem(this.KEY)||"[]"); } catch(_){ return []; } },
  save(h) { localStorage.setItem(this.KEY, JSON.stringify(h.slice(-this.MAX))); },
  push(role, text) {
    const h = this.load();
    h.push({ role, text, ts: Date.now() });
    this.save(h);
    return h;
  },
  clear() { localStorage.removeItem(this.KEY); },
  // Extract last mentioned river from history
  lastMentionedRiver(history) {
    for(let i=history.length-1; i>=0; i--) {
      const r = AtlasDB.findByName(history[i].text);
      if(r) return r;
    }
    return null;
  }
};

/* ── §3.5 AtlasPrefs ─────────────────────────────────────────────── */
// User preference storage — for future personalization of AI advice
const AtlasPrefs = {
  KEY:      "atlas_prefs",
  DEFAULTS: { technique: null, maxWalkMin: 60, level: "intermedio", goal: "divertimento" },
  load() {
    try { return Object.assign({}, this.DEFAULTS, JSON.parse(localStorage.getItem(this.KEY) || "{}")); }
    catch(_) { return Object.assign({}, this.DEFAULTS); }
  },
  save(updates) {
    const cur = this.load();
    localStorage.setItem(this.KEY, JSON.stringify(Object.assign(cur, updates)));
  }
};

/* ── §4 AtlasProvider ────────────────────────────────────────────── */
// Interface contract (for future OpenAI swap):
//   provider.respond(userMessage, context, history) → Promise<string>
// To plug in OpenAI: implement OpenAIProvider with same signature,
// swap LocalProvider → OpenAIProvider in §6 Init.

const LocalProvider = {
  async respond(msg, ctx, history) {
    // Small realistic delay to feel natural
    await sleep(600 + Math.random() * 700);
    const intent = detectIntent(msg, history);
    const river  = AtlasDB.findByName(msg) || AtlasMemory.lastMentionedRiver(history);
    return generateResponse(intent, msg, ctx, river, history);
  }
};

// §4.1 Intent detection
function detectIntent(msg, history) {
  const m = msg.toLowerCase();
  if(/ciao|salve|buongiorno|buonasera|aiuto|cosa sai|cosa fai|chi sei/.test(m)) return "saluto";
  if(/regolam|licenz|tesserino|legge|norma|vietato|permesso|taglia min|limite giorn/.test(m)) return "regolamenti";
  if(/spiegami|come si pesca|come funziona|impara|insegna|introduzione|basi|principiant/.test(m)) return "spiegazione";
  if(/attrezzat|canna|lenza|mulinello|fluorocarbon|trecciato|amo|asola|galleggiante|wader|stivali/.test(m)) return "attrezzatura";
  if(/mosca|ninfa|secca|streamer|emergente|caddis|adams|elk hair|parachute|stimulator/.test(m)) return "tecnica_mosca";
  if(/spinning|spoon|minnow|wobbler|cucchiaino|artificiale|esche/.test(m)) return "tecnica_spinning";
  if(/condizioni|com[\'è e] il|come sta|livello|portata|torbid|limpid|traspar|acqua alta|acqua bassa/.test(m)) return "condizioni";
  if(/pomeriggio|mattina|alba|tramonto|notte|quando|orario|ore|momento migliore|miglior momento/.test(m)) return "orario";
  if(/dove trovo|dove sono|comportamento|abitudini|habitat|dove si nascon/.test(m)) return "trote_habitat";
  if(/trova uno spot|trovami uno spot|spot facile|spot panoramico|spot poco|spot per|buca profond|tratto facile|tratto poco|zona ripopolat|dove pesco.*con mio|dove mi consigli.*and|mostrami.*spot|fammi vedere.*spot|dimmi.*spot|spot.*ninfa|spot.*secca|spot.*spinning|dove posso.*con mio figlio|dove posso.*bambino/.test(m)) return "trova_spot";
  if(/parcheg|dove mi fermo|dove parcheggio|dove lascio.*auto|dove metto.*auto/.test(m)) return "parcheggio";
  if(/itinerario|come arrivo|come raggiungo|come si arriva|come ci arrivo|come andare|percorso per arrivare|indicazioni per/.test(m)) return "itinerario";
  if(/cosa c.è.*map|marker|strutture.*torrent|strutture.*fiume|ponti.*torrent|cascate.*torrent|servizi.*torrent|sentieri.*torrent|cosa trovo|cosa c.è sul/.test(m)) return "marker_info";
  if(/dove pesco|dove andare|spot|torrente migliore|miglior torrente|consigli|suggerisci|dove mi conviene|dove ti|consiglio|trova/.test(m)) return "dove_pescare";
  if(/meteo|tempo|pioggia|temperatura|pressione|vento|previsioni/.test(m)) return "meteo";
  // Fallback: if the last message was a topic question, this might be a follow-up
  if(history.length > 0 && m.length < 40) return "followup";
  return "generico";
}

// §4.2 Seasonal/temporal data
const SEASON_DATA = {
  primavera: {
    label: "Primavera", months: "Marzo–Maggio",
    mosca: ["Elk Hair Caddis n°14-16","Blue Wing Olive n°18","Parachute Adams n°16","Hare's Ear Nymph n°14","Pheasant Tail Nymph n°16"],
    secca: ["Caddis emersa al tramonto","BWO nelle ore centrali","Adams generica nelle perturbazioni"],
    ninfa: ["PTN (Pheasant Tail) sottosuperficie","Hare's Ear con inidicatore a profondità 50-80cm","Caddis Larva in corrente moderata"],
    streamer: ["Woolly Bugger nero/oliva in acque ancora fredde","Zonker in acque veloci"],
    condizioni: "acque in risalita, possibili piene di fine primavera. Le trote sono attive e stanno recuperando forze dopo l'inverno.",
    best_rivers: ["mastallone","artogna","lys","sessera","cervo"],
    advice: "È la stagione del risveglio: le trote sono affamate e reattive. Privilegi gli orari centrali quando l'acqua si scalda un poco."
  },
  estate: {
    label: "Estate", months: "Giugno–Agosto",
    mosca: ["CDC Caddis n°16-18","Parachute Adams n°16","Elk Hair Caddis n°14","Hopper (Stimulator) n°12","Chernobyl Ant n°10"],
    secca: ["Secca nelle ore di punta: alba e sera","Klinkhammer in corrente moderata","Foam Beetle nelle giornate soleggiate"],
    ninfa: ["Copper John nelle ore centrali di caldo","PTN a profondità maggiore (80-120cm)","San Juan Worm dopo piogge"],
    streamer: ["Piccoli Sculpzilla in giornate coperte","Streamer chiari in acque limpide"],
    condizioni: "acque basse e cristalline. Le trote si ritirano in buche profonde nelle ore di piena luce.",
    best_rivers: ["lys","mastallone","antrona","artogna","sessera","mucrone"],
    advice: "In estate la sfida è massima: approcci furtivi, finali sottili (0.12-0.14mm) e secca nelle ore magiche di alba e tramonto fanno la differenza."
  },
  autunno: {
    label: "Autunno", months: "Settembre–Ottobre",
    mosca: ["Elk Hair Caddis n°14","Stimulator arancione n°12","Adams n°16","Copper John n°16"],
    secca: ["Caddis grandi in settembre","Parachute nelle giornate tiepide"],
    ninfa: ["Beadhead Hare's Ear a profondità crescente","Copper John in acqua più fredda","Larve varie"],
    streamer: ["Streamer grandi e scuri in ottobre","Bunny Leech per le grosse fario in riproduzione"],
    condizioni: "acque che scendono di temperatura, spesso cristalline dopo l'estate. Le trote si avvicinano ai punti di frega.",
    best_rivers: ["sesia","cervo","orco","elvo","strona"],
    advice: "L'autunno regala condizioni eccellenti: gli stream si sono abbassati, le trote mangiano attivamente per prepararsi all'inverno. Attenzione ai periodi di frega."
  },
  inverno: {
    label: "Inverno", months: "Novembre–Febbraio",
    mosca: ["Midge n°20-22 (poche zone aperte)","San Juan Worm in laghi","Chironomide"],
    secca: [], ninfa: ["Midge pupa","Micro Caddis"],
    streamer: ["Streamer lenti in acque fredde dei laghi"],
    condizioni: "stagione chiusa per la maggior parte delle acque. Alcune riserve private e laghi rimangono aperti.",
    best_rivers: ["viverone","mucrone"],
    advice: "La stagione regolare è chiusa. Verifica l'apertura di riserve private o laghi specifici con regolamenti propri."
  }
};

const TECHNIQUE_INFO = {
  ninfa: {
    name: "Pesca a Ninfa",
    intro: "La ninfa è la tecnica più produttiva in assoluto: il 70-80% dell'alimentazione delle trote avviene sott'acqua.",
    steps: [
      "Posizionati a valle rispetto al punto da pescare, con lancio verso monte.",
      "Usa un indicatore di deriva (galleggiante o lana) oppure la tecnica 'czech nymphing' senza indicatore.",
      "La ninfa deve derivare in modo naturale, alla stessa velocità dell'acqua: il contatto diretto con la lenza fa sentire l'abboccata.",
      "Profondità tipica: 40-120 cm a seconda della buca. Regola il piombo di conseguenza.",
      "Finali: 0.14-0.18 mm in Fluorocarbon. Ami: n°14-18 a seconda della ninfa."
    ],
    best_season: "tutto l'anno, picco in primavera e autunno",
    best_time: "ore centrali quando la secca funziona meno"
  },
  secca: {
    name: "Pesca a Mosca Secca",
    intro: "La mosca secca è il cuore romantico della pesca a mosca: vedere la trota salire in superficie e attaccare la tua imitazione è un'emozione unica.",
    steps: [
      "Osserva la superficie: se vedi bollate o insetti che volano, è il momento giusto.",
      "Identifica l'insetto (caddis, efemera, dittero) e scegli l'imitation del colore e taglia corretti.",
      "Presenta la mosca con una deriva perfettamente naturale: zero drag è fondamentale.",
      "Lancia a monte della trota e lascia arrivare la mosca prima della lenza (slack cast).",
      "Finali: 0.10-0.14 mm. Ami: n°14-20 a seconda dell'imitazione."
    ],
    best_season: "primavera e autunno, in estate all'alba e al tramonto",
    best_time: "alba, tarda mattina (schiuse) e tramonto"
  },
  streamer: {
    name: "Pesca con Streamer",
    intro: "Lo streamer imita un pesce piccolo, un gamberetto o un'amfipoda. Attira le trote più grandi, spesso predatrici.",
    steps: [
      "Lancia trasversale alla corrente e lascia che lo streamer sfondi e swighi verso valle.",
      "Recupera con strappetti irregolari: stop-and-go, strip veloci alternati a pause.",
      "Punta alle buche profonde, sotto le rive erosionate, davanti ai massi.",
      "Colori: oliva/nero in acque limpide, arancione/rosso in acque alte. Misura: 4-10 cm.",
      "Canne: da 8-9 piedi, #5-7. Finali corti e robusti (0.20-0.25 mm)."
    ],
    best_season: "primavera (acque alte), autunno, giornate coperte in estate",
    best_time: "pomeriggio e giornate coperte"
  },
  spinning: {
    name: "Spinning con Artificiali",
    intro: "Lo spinning è versatile e immediato: spoon e minnow coprono grandi distanze e diverse profondità.",
    steps: [
      "Lancia verso monte o traverso e recupera contrastandone la corrente.",
      "Spoon: recupero lento in acque fredde, più veloce in estate. Peso: 1.5-4 g.",
      "Minnow: azione sinuosa con stop-and-go. Misura: 40-70 mm. Ottimi in acque chiare.",
      "Canna: UL 1.68-1.98 m, azione da 0.5-7 g. Mulinello 1000-2000.",
      "Finali: Fluorocarbon 0.14-0.18 mm per massima invisibilità."
    ],
    best_season: "tutto l'anno, picco in primavera con acque alte",
    best_time: "mattina presto e sera"
  }
};

// §4.3 Response generators
function generateResponse(intent, msg, ctx, river, history) {
  switch(intent) {
    case "saluto":        return respSaluto(ctx);
    case "dove_pescare":  return respDovePescare(ctx, river);
    case "tecnica_mosca": return respTecnicaMosca(ctx, river, msg);
    case "tecnica_spinning": return respTecnicaSpinning(ctx, river);
    case "condizioni":    return respCondizioni(ctx, river, msg);
    case "orario":        return respOrario(ctx, river);
    case "trote_habitat": return respTroteHabitat(ctx);
    case "spiegazione":   return respSpiegazione(msg, ctx);
    case "regolamenti":   return respRegolamenti(river, ctx);
    case "attrezzatura":  return respAttrezzatura(ctx, msg);
    case "meteo":         return respMeteo(ctx, river);
    case "trova_spot":    return respTrovaSpot(ctx, river, msg);
    case "parcheggio":    return respParcheggio(ctx, river, msg);
    case "itinerario":    return respItinerario(ctx, river, msg);
    case "marker_info":   return respMarkerInfo(ctx, river);
    case "followup":      return respFollowup(msg, ctx, river, history);
    default:              return respGenerico(msg, ctx, river);
  }
}

function respSaluto(ctx) {
  const { season, period, lastRiver } = ctx;
  const SD = SEASON_DATA[season];
  const riverHint = lastRiver
    ? `\n\n📍 Vedo che hai guardato il **${lastRiver.name}** di recente — posso dirti come si pesca lì in questo momento se vuoi.`
    : "";
  return `Ciao! Sono **ATLAS AI**, il tuo esperto di pesca alla trota integrato in TroutAtlas.

Siamo in **${SD.label}** (${SD.months}), periodo ${SD.condizioni}

Posso aiutarti con:
• 🎣 Dove pescare oggi e questa settimana
• 🪰 Quale mosca o artificiale usare in ${SD.label.toLowerCase()}
• ⏰ Il miglior orario per uscire (ora sei in fascia: **${period}**)
• 🐟 Comportamento delle trote stagionale
• 📋 Regolamenti per torrente
• 🎓 Tecniche: ninfa, secca, streamer, spinning${riverHint}

Cosa vuoi sapere?`;
}

function respDovePescare(ctx, hintRiver) {
  const { season, period, isSeasonOpen } = ctx;
  const SD = SEASON_DATA[season];
  if(!isSeasonOpen) {
    return `⚠️ **Stagione chiusa.** La stagione regolare per la maggior parte delle acque piemontesi è chiusa (apertura: 2ª domenica di marzo).

Alcune opzioni aperte in inverno:
• **Lago di Viverone** — alcune zone con regolamenti propri
• **Lago del Mucrone** — quota 1800 m, verificare apertura specifica
• **Riserve private** — contatta le sezioni FIPSAS locali

Posso raccontarti le caratteristiche di qualsiasi torrente per prepararti all'apertura! 🎣`;
  }

  const best = SD.best_rivers;
  const rivers = _rivers.filter(r => best.includes(r.id));
  const picks = rivers.length > 0 ? rivers.slice(0,3) : _rivers.slice(0,3);

  const listItems = picks.map(r => {
    const spec = r.species.join(", ");
    const type = r.waterType === "lago" ? "🏔️ Lago" : r.waterType === "fiume" ? "🌊 Fiume" : "🏞️ Torrente";
    return `• **${r.name}** (${type}, ${r.zone}) — ${spec} — Difficoltà: ${"⭐".repeat(r.difficulty||2)}`;
  }).join("\n");

  return `In **${SD.label}** con questo ${period}, ti consiglio:

${listItems}

**Perché questi?** ${SD.advice}

**Tecnica consigliata ora:**
🪰 Mosca secca con ${SD.mosca[0]} e ${SD.mosca[1]}
🎣 Ninfa: ${SD.ninfa[0]}

Vuoi sapere di più su uno di questi torrenti? Scrivimi il nome.`;
}

function respTecnicaMosca(ctx, river, msg) {
  const { season, period } = ctx;
  const SD = SEASON_DATA[season];
  const m = msg.toLowerCase();

  let focus = "generale";
  if(/secca|dry/.test(m)) focus = "secca";
  else if(/ninfa|nymph|subacquea/.test(m)) focus = "ninfa";
  else if(/streamer/.test(m)) focus = "streamer";
  else if(/emergente|emersa/.test(m)) focus = "secca";

  const riverCtx = river ? `\nSul **${river.name}** in particolare: ${river.flyFriendly ? "è ideale per la mosca, con correnti variate e ottima visibilità." : "lo spinning è più comune, ma la mosca funziona nei tratti calmi."}` : "";

  if(focus === "secca") {
    return `**Mosca secca in ${SEASON_DATA[season].label}:**

Le secche più efficaci ora:
${SD.secca.map(s=>"• "+s).join("\n")}

**Modelli top:**
${SD.mosca.slice(0,3).map(m=>"• "+m).join("\n")}

**Tecnica:** deriva perfetta senza drag, lancio a monte della bollata. Finale sottile 0.12-0.14 mm Fluorocarbon.
${riverCtx}

💡 **Orario migliore per la secca:** ${period==="alba/mattino"||period==="sera" ? "perfetto adesso! Le trote sono in superficie." : "alba e tramonto — nelle ore centrali passa alla ninfa."}`;
  }

  if(focus === "ninfa") {
    return `**Ninfa in ${SEASON_DATA[season].label}:**

${TECHNIQUE_INFO.ninfa.intro}

**Ninfe consigliare ora:**
${SD.ninfa.map(n=>"• "+n).join("\n")}

**Setup:**
• Canna: 9 piedi, #3-4
• Indicatore di derivazione o Czech Nymphing (contatto diretto)
• Profondità: 60-100 cm
• Finale: Fluorocarbon 0.14-0.16 mm
${riverCtx}

💡 Miglior momento per la ninfa: **${period==="pomeriggio"||period==="tarda mattina" ? "adesso è ottimo" : "ore centrali, 10:00-16:00"}**.`;
  }

  if(focus === "streamer") {
    return `**Streamer in ${SEASON_DATA[season].label}:**

${TECHNIQUE_INFO.streamer.intro}

**Modelli consigliati:**
${SD.streamer.map(s=>"• "+s).join("\n")}

**Tecnica di presentazione:**
• Lancia trasversale alla corrente
• Lascia affondare 2-3 secondi
• Recupero: strip-strip-pausa, con variazioni di velocità
• Punta le buche profonde e le rive sotto-erosionate
${riverCtx}

💡 Miglior momento per lo streamer: **pomeriggio e giornate coperte** — quando la secca non produce.`;
  }

  // Generale
  return `**Mosche consigliate in ${SEASON_DATA[season].label}:**

🪰 **Secche:**
${SD.mosca.slice(0,3).map(m=>"• "+m).join("\n")}

🎣 **Ninfe:**
${SD.ninfa.slice(0,2).map(n=>"• "+n).join("\n")}

🐠 **Streamer:**
${SD.streamer[0] ? "• "+SD.streamer[0] : "• Woolly Bugger oliva #8"}

**In sintesi:** ${SD.advice}
${riverCtx}

Vuoi approfondire una tecnica specifica? (secca / ninfa / streamer)`;
}

function respTecnicaSpinning(ctx, river) {
  const { season } = ctx;
  const SD = SEASON_DATA[season];
  const riverCtx = river
    ? `\n**Sul ${river.name}:** preferiti i ${river.recommendedLures ? river.recommendedLures.slice(0,2).join(", ") : "spoon da 2-3g e minnow 45mm"}.`
    : "";
  return `**Spinning in ${SD.label}:**

${TECHNIQUE_INFO.spinning.intro}

**Artificiali top ora:**
${river && river.recommendedLures
    ? river.recommendedLures.map(l=>"• "+l).join("\n")
    : "• Spoon 2-3 g (argento/oro in acque chiare)\n• Minnow 45-60 mm (naturalcolor)\n• Clessidra 3 g nelle correnti forti"}

**Tecnica:**
• Recupero controcorrente, moderato in estate
• Stop-and-go con il minnow: pausa di 1-2 secondi
• Canna: UL 1.68 m, 0.2-5 g. Mulinello 1000-2000. Finale FC 0.16 mm
${riverCtx}

💡 **${SD.label}:** ${season==="estate" ? "acque basse → artificiali più piccoli e leggeri (1.5-2g), recupero lento nelle ore fresche." : season==="primavera" ? "acque alte → spoon più pesanti (3-4g), punta le anse e le zone di deposito." : "artificiali a misura media, orari mattutini e serali."}`;
}

function respCondizioni(ctx, river, msg) {
  const { season, weather } = ctx;
  const SD = SEASON_DATA[season];

  if(!river) {
    return `Per darmi informazioni dettagliate sulle condizioni, dimmi il nome del torrente che vuoi controllare!

In generale, in **${SD.label}**:
• ${SD.condizioni.charAt(0).toUpperCase() + SD.condizioni.slice(1)}
• Limpidità attesa: ${season==="estate" ? "alta (Cristallina – Leggermente velata)" : season==="primavera" ? "variabile (possibili piogge)" : "buona (Limpida – Leggermente velata)"}
• Temperatura acqua stimata: ${season==="estate" ? "14-18°C nei torrenti alpini" : season==="primavera" ? "8-12°C" : season==="autunno" ? "10-14°C" : "2-6°C"}

Qual è il torrente che ti interessa?`;
  }

  const hasWeather = weather !== null;
  const temp = hasWeather ? weather.current?.temperature_2m : null;
  const wind = hasWeather ? weather.current?.wind_speed_10m : null;
  const cloud = hasWeather ? weather.current?.cloud_cover : null;
  const precip = hasWeather ? weather.current?.precipitation : null;

  // Estimate water clarity from recent precip
  let clarity = "stimata Limpida";
  if(hasWeather) {
    const p = precip || 0;
    clarity = p > 5 ? "verosimilmente Velata o Torbida (pioggia recente)" :
              p > 1 ? "Leggermente Velata" : "Limpida / Cristallina";
  }

  return `**Condizioni attuali — ${river.name}:**

${hasWeather ? `🌡️ Temperatura aria: **${temp}°C**
💨 Vento: ${wind} km/h
☁️ Nuvolosità: ${cloud}%
🌧️ Precipitazioni: ${precip} mm
` : ""}💧 Limpidità acqua (stima AI): **${clarity}**
🌡️ Temperatura acqua (stima): **${estimateWaterTemp(season, river.altitude)}°C**

**Cosa aspettarsi sul ${river.name}:**
${SD.condizioni.charAt(0).toUpperCase() + SD.condizioni.slice(1)}

**Tecnica suggerita con queste condizioni:**
${clarity.includes("Torbid") || clarity.includes("Velata")
    ? "• Streamer o Ninfa pesante — in acqua torbida le trote rispondono a sagome grandi e scure\n• Evitare la secca"
    : "• Secca nelle ore magiche + Ninfa di giornata — acque limpide ideali per la mosca\n• Finali sottili 0.12-0.14 mm"}

📍 Zone migliori del ${river.name}: buche sotto le cascatelle, angoli di corrente, massi medi-grandi`;
}

function respOrario(ctx, river) {
  const { hour, period } = ctx;
  const riverName = river ? ` sul ${river.name}` : "";
  const scores = [
    { name:"🌅 Alba (5:00–7:00)",    pct:88, note:"Trote in superficie, secca eccellente, pochi pescatori" },
    { name:"☀️ Mattino (7:00–10:00)", pct:74, note:"Ninfa e secca, attività calante con luce" },
    { name:"🕙 Tarda mattina (10–13)",pct:61, note:"Ninfa nelle buche profonde, pausa secca" },
    { name:"🌤️ Pomeriggio (13–17)",   pct:52, note:"Ore più difficili, streamer e ninfa pesante" },
    { name:"🌆 Sera (17–20:00)",      pct:85, note:"Seconda schiusa serale, secca fenomenale" },
    { name:"🌙 Notte (20:00+)",       pct:35, note:"Attività ridotta (e spesso vietata di notte)" }
  ];

  const now_score = scores.find(s => {
    if(period==="alba/mattino" && s.name.includes("Alba")) return true;
    if(period==="tarda mattina" && s.name.includes("Tarda")) return true;
    if(period==="pomeriggio" && s.name.includes("Pomeriggio")) return true;
    if(period==="sera" && s.name.includes("Sera")) return true;
    if(period==="notte" && s.name.includes("Notte")) return true;
    return false;
  });

  const list = scores.map(s =>
    `${s.pct>=80?"🔥":s.pct>=60?"✅":s.pct>=40?"⚡":"💤"} **${s.name}** — ${s.pct}%\n   _${s.note}_`
  ).join("\n");

  return `**Orari di attività delle trote${riverName}:**

${list}

${now_score ? `\n⏰ **Adesso siamo in fascia "${period}":** ${now_score.pct>=75 ? "ottimo momento per uscire!" : now_score.pct>=50 ? "condizioni discrete, ninfa preferita." : "periodo difficile — aspetta la sera."}` : ""}

💡 **Regola d'oro:** alba e tramonto sono le 2 ore d'oro. Se puoi uscire solo in un momento, scegli quelli.`;
}

function respTroteHabitat(ctx) {
  const { season } = ctx;
  const spots = {
    primavera: "Nelle anse e nei depositi, dove la corrente deposita insetti spazzati via dalle piogge.",
    estate: "Nelle buche profonde (>60 cm), all'ombra dei rami, sotto le cascatelle ossigenate — evita le zone piatte e lente esposte al sole.",
    autunno: "Si avvicinano ai greti di ghiaia per la frega (fine ottobre). Cerca le radure soleggiate con profondità 30-60 cm.",
    inverno: "Nelle buche più profonde, quasi immobili. Raramente si alzano in superficie."
  }[season];

  return `**Dove si trovano le trote in ${SEASON_DATA[season].label}:**

📍 **Punti chiave da esplorare:**
• **Sotto le cascatelle:** zona di massima ossigenazione — le trote stazionano qui tutto l'anno
• **Dietro i massi grandi:** zona protetta dalla corrente, con cibo portato dall'acqua
• **Labbro delle buche:** transizione tra corrente e buca — zona di caccia attiva
• **Sponde erosionate:** radici esposte, massi sottoriva = rifugi perfetti per le fario più grosse
• **Confluenze:** dove un affluente incontra il torrente principale — mix di temperature e cibo

🌿 **Stagione attuale — ${SEASON_DATA[season].label}:**
${spots}

🐟 **Comportamento alimentare:**
${season==="estate"
    ? "In estate le trote si alimentano attivamente all'alba e al tramonto. Nelle ore centrali stazionano in buca e catturano le ninfe di fondo — non mangiano in superficie."
    : season==="primavera"
    ? "In primavera le trote sono affamate e aggressive. Reagiscono bene a qualsiasi presentazione corretta, spesso mostrandosi in più punti contemporaneamente."
    : season==="autunno"
    ? "In autunno le trote fario diventano più selettive sulle prede. I maschi cambiano colorazione. Le femmine cercano ghiaia pulita per la deposizione delle uova."
    : "In inverno il metabolismo rallenta drasticamente. Usa artificiali miniaturizzati e recupero lentissimo."}`;
}

function respSpiegazione(msg, ctx) {
  const m = msg.toLowerCase();
  let tech = null;
  if(/ninfa|nymph|subacquea/.test(m)) tech = "ninfa";
  else if(/secca|dry|mosca secca/.test(m)) tech = "secca";
  else if(/streamer/.test(m)) tech = "streamer";
  else if(/spinning|spoon|minnow/.test(m)) tech = "spinning";

  if(tech) {
    const T = TECHNIQUE_INFO[tech];
    return `**${T.name}** — Guida completa

${T.intro}

**Come si fa, passo per passo:**
${T.steps.map((s,i)=>`${i+1}. ${s}`).join("\n")}

📅 **Miglior stagione:** ${T.best_season}
⏰ **Miglior momento:** ${T.best_time}

Hai domande su un aspetto specifico? (attrezzi, presentazione, errori comuni…)`;
  }

  return `Quale tecnica vuoi che ti spieghi?

• **Ninfa** — la più produttiva, pesca sott'acqua
• **Mosca secca** — la più spettacolare, trota in superficie
• **Streamer** — per le trote più grandi, imita un pesce
• **Spinning** — artificiali, spoon e minnow

Scrivimi il nome della tecnica e ti spiego tutto, dall'attrezzatura alla presentazione.`;
}

function respRegolamenti(river, ctx) {
  if(!river) {
    return `I regolamenti variano per torrente e zona in Piemonte. Dimmi quale torrente ti interessa e ti riepiloga le regole principali.

**Regole generali Piemonte (sempre valide):**
• Stagione regolare: **2ª domenica di marzo – 30 settembre**
• Licenza: **Tesserino FIPSAS + Licenza Regionale Piemonte**
• Taglia minima Trota Fario: **22 cm** (20 cm in alcuni laghi)
• Temolo: **30 cm**, spesso catch & release obbligatorio
• Trota Marmorata: **sempre rilascio obbligatorio** (specie protetta)
• Esche naturali: vietate in molti tratti (verificare localmente)

⚠️ Verifica sempre le norme aggiornate presso la sezione FIPSAS locale o il sito Regione Piemonte.`;
  }

  const reg = river.regulations;
  if(!reg) return `Non ho i regolamenti dettagliati per **${river.name}** — verificali direttamente sul sito FIPSAS Piemonte o presso la sezione locale.`;

  return `**Regolamenti — ${river.name}:**

📋 **Licenza richiesta:**
${reg.license || "Tesserino FIPSAS + Licenza Regionale Piemonte"}

📅 **Stagione:**
${reg.season || "2ª domenica di marzo – 30 settembre"}

📏 **Taglie minime:**
${reg.minSize || "Trota Fario: 22 cm"}

📌 **Regole specifiche:**
${(reg.rules||[]).map(r=>"• "+r).join("\n")}

⚠️ Verifica sempre le norme aggiornate presso la sezione FIPSAS locale — i regolamenti possono cambiare annualmente.`;
}

function respAttrezzatura(ctx, msg) {
  const { season } = ctx;
  const m = msg.toLowerCase();
  if(/canna/.test(m)) {
    return `**Canne da trota — consigli per ${SEASON_DATA[season].label}:**

🪰 **Mosca:**
• Lunghezza: 9 piedi (ideale polivalente)
• Azione: Middle-to-tip per ninfa, tip per secca
• Classe: #3-4 per torrenti piccoli, #5 per fiumi
• Budget: partenza dignitosa dai 150€ (Orvis Clearwater, Sage Foundation)

🎣 **Spinning / UL:**
• Lunghezza: 1.68-1.98 m
• Azione: Ultra-Light, 0.2-5 g o 0.5-7 g
• Mulinello: 1000-2000 con recupero veloce
• Finale: Fluorocarbon 0.14-0.18 mm (invisibile in acque chiare)

💡 In **${SEASON_DATA[season].label}**: ${season==="estate" ? "finali sottilissimi (0.12-0.14 mm FC) — le acque basse e chiare rendono le trote diffidenti." : season==="primavera" ? "puoi usare finali leggermente più robusti (0.16-0.18 mm) — l'acqua è ancora mossa." : "finali medi 0.14-0.16 mm, buon compromesso resistenza/invisibilità."}`;
  }

  return `**Attrezzatura essenziale per la pesca alla trota in Piemonte:**

🪰 **Set mosca completo:**
• Canna 9' #4 + mulinello con frizione fluida + coda WF4F
• Finale conico 9' 5X (0.15 mm) + Fluorocarbon spigot 0.12-0.14 mm
• Box mosche: secche (Adams, Elk Hair), ninfe (PTN, Hare's Ear), streamer

🎣 **Set spinning UL:**
• Canna UL 1.68 m / 0.2-5g + mulinello 1000-2500
• Bobina con trecciato PE 0.3-0.4 + shock leader Fluorocarbon 0.20 mm
• Box artificiali: spoon 1.5-3g, minnow 45-60 mm

👕 **Abbigliamento:**
• Waders (neoprene in inverno/primavera, membrana traspirante in estate)
• Scarpe con suola in feltro o gomma scolpita (no feltro in certi torrenti per biosicurezza)
• Polarizzati — indispensabili per leggere il torrente e vedere le trote

📋 **Documenti sempre con sé:**
• Tesserino FIPSAS + Licenza regionale Piemonte + eventuale segnaline di zona`;
}

function respMeteo(ctx, river) {
  const { season, weather } = ctx;
  const riv = river ? ` per il ${river.name}` : "";

  if(weather) {
    const c = weather.current;
    return `**Dati meteo in tempo reale${riv}:**

🌡️ Temperatura: **${c.temperature_2m}°C** (percepita ${c.apparent_temperature}°C)
💨 Vento: ${c.wind_speed_10m} km/h (raffiche ${c.wind_gusts_10m} km/h)
☁️ Nuvolosità: ${c.cloud_cover}%
💧 Precipitazioni: ${c.precipitation} mm
🌊 Pressione: ${c.surface_pressure} hPa

**Impatto sulla pesca:**
${c.cloud_cover > 70 ? "☁️ Cielo coperto: ottimo per streamer e secca nelle ore centrali — le trote si sentono più al sicuro." :
  c.wind_speed_10m > 20 ? "💨 Vento forte: la secca è difficile. Passa alla ninfa o allo streamer." :
  c.precipitation > 2 ? "🌧️ Pioggia: l'acqua si sta intorbidendo — streamer e ninfa pesante." :
  "☀️ Condizioni buone: ninfa di mattina, secca nelle ore magiche di alba e tramonto."}

Per condizioni meteo aggiornate al minuto apri la scheda del torrente nell'app — i dati si aggiornano ogni 15 minuti.`;
  }

  return `Per i dati meteo in tempo reale, apri la scheda del torrente nell'app — la sezione **Fishing Intelligence** mostra temperatura, vento, pressione e previsioni aggiornate ogni 15 minuti.

In **${SEASON_DATA[season].label}**, le condizioni tipiche in Piemonte:
${season==="estate" ? "• Giornate calde (20-30°C), temporali pomeridiani frequenti sulle Alpi\n• Le perturbazioni aumentano brevemente l'attività delle trote prima del temporale\n• Preferire mattine presto e serate" :
  season==="primavera" ? "• Variabile: bel tempo alternato a piogge. Pressione instabile.\n• Le giornate di bassa pressione in risalita attivano la pesca" :
  season==="autunno" ? "• Stabile e soleggiato in settembre, più piovoso in ottobre\n• Le prime piogge dopo l'estate asciutta portano ossigeno e attivano le trote" :
  "• Freddo, possibili gelate. Acque basse e chiare.\n• Attività ridotta al minimo"}

Dimmi il nome del torrente per avere i dati specifici.`;
}

function respFollowup(msg, ctx, river, history) {
  const m = msg.toLowerCase();
  const prevUserMsgs = history.filter(h=>h.role==="user");

  // "E di pomeriggio?" / "e al mattino?" etc.
  if(/pomeriggio|mattina|alba|tramonto|sera|notte/.test(m)) {
    return respOrario(ctx, river);
  }
  // "E con lo streamer?" etc.
  if(/streamer|ninfa|secca|spoon|minnow/.test(m)) {
    if(/streamer/.test(m)) return respTecnicaMosca(ctx, river, "streamer");
    if(/ninfa/.test(m)) return respTecnicaMosca(ctx, river, "ninfa");
    if(/secca/.test(m)) return respTecnicaMosca(ctx, river, "secca");
    return respTecnicaSpinning(ctx, river);
  }
  return respGenerico(msg, ctx, river);
}

/* ── §4.4 Spot-aware response generators ────────────────────────── */

function respTrovaSpot(ctx, hintRiver, msg) {
  const { season, isSeasonOpen } = ctx;
  if(!isSeasonOpen) {
    return `⚠️ **Stagione chiusa.** La stagione regolare è chiusa — gli spot non sono accessibili per la pesca regolamentata.

Puoi comunque esplorare i percorsi e pianificare la prossima uscita. Chiedi "Mostrami uno spot sul Sesia" per vedere il percorso di accesso.`;
  }

  const criteria = AtlasSpots.parseCriteria(msg, hintRiver);
  const spots    = AtlasSpots.best(criteria, 3);

  if(spots.length === 0) {
    // Fallback: best spots overall if no match
    const all = AtlasSpots.best({}, 3);
    if(all.length === 0) {
      return `Non ho trovato spot specifici per la tua ricerca. Prova a chiedermi "Dove pescare oggi?" per i torrenti migliori in ${SEASON_DATA[season].label}.`;
    }
    return `Non ho trovato spot con esattamente quei criteri, ma ecco i migliori disponibili in ${SEASON_DATA[season].label}:\n\n` + _formatSpotList(all, ctx);
  }

  const criteriaDesc = _describeCriteria(criteria);
  return `In **${SEASON_DATA[season].label}**${criteriaDesc}, ecco i migliori spot per te:

${_formatSpotList(spots, ctx)}

Scrivi **"Come arrivo a [nome spot]"** per l'itinerario dettagliato, o **"Mostrami il parcheggio"** per trovare dove lasciare l'auto.`;
}

function _describeCriteria(c) {
  const parts = [];
  if(c.familyFriendly) parts.push("adatti alle famiglie");
  if(c.scenicView)     parts.push("panoramici");
  if(c.bigFish)        parts.push("con trote di taglia");
  if(c.stocking)       parts.push("ripopolati");
  if(c.lowCrowd)       parts.push("poco frequentati");
  if(c.technique)      parts.push(`per la ${c.technique}`);
  if(c.maxWalk != null && c.maxWalk <= 10) parts.push("facilmente raggiungibili");
  if(c.type)           parts.push(`tipo ${c.type}`);
  return parts.length ? ` (${parts.join(", ")})` : "";
}

function _formatSpotList(spots, ctx) {
  return spots.map((s, i) => {
    const num   = ["1️⃣","2️⃣","3️⃣"][i] || `${i+1}.`;
    const score = s.fishingScore ? ` — 🟢 Score ${s.fishingScore}/100` : "";
    const walk  = s.walkingMinutes <= 5 ? "⚡ Vicinissimo" : s.walkingMinutes <= 15 ? `🥾 ${s.walkingMinutes} min a piedi` : `🥾 ${s.walkingMinutes} min (escursione)`;
    const tags  = [];
    if(s.familyFriendly) tags.push("👨‍👩‍👧 Famiglia");
    if(s.scenicView)     tags.push("📸 Panoramico");
    if(s.bigFish)        tags.push("🏆 Trote di taglia");
    if(s.stocking)       tags.push("🐟 Ripopolato");
    if(!s.crowded)       tags.push("🔇 Poco frequentato");
    const tagStr = tags.length ? `\n   ${tags.join(" · ")}` : "";
    const techs  = s.techniques.join(", ");
    return `${num} **${s.name}** — *${s._river.name}*${score}
   ${walk} · Difficoltà: ${"⭐".repeat(s.difficulty)}
   🎣 Tecniche: ${techs}
   ${s.description}${tagStr}
   ${AtlasSpots.spotTag(s)}`;
  }).join("\n\n");
}

function respItinerario(ctx, hintRiver, msg) {
  // Try to find the spot from msg or use best available
  const criteria = AtlasSpots.parseCriteria(msg, hintRiver);
  let spots = AtlasSpots.best(criteria, 1);
  if(spots.length === 0) spots = AtlasSpots.best(hintRiver ? { riverId: hintRiver.id } : {}, 1);
  if(spots.length === 0) {
    return `Non trovo uno spot specifico per questa richiesta. Dimmi il nome del torrente e dello spot — per esempio: **"Come arrivo alla Buca del Mulino sul Sesia?"**`;
  }

  const s  = spots[0];
  const riv = s._river;
  const steps = (s.path || []).map(p => `${p.emoji} **Step ${p.step}** — ${p.text}`).join("\n");

  const parkingInfo = s.parking
    ? `🅿️ **Parcheggio consigliato:** ${s.parking.name}\n   ${s.parking.description} (${s.parking.distanceMeters} m dallo spot)`
    : "🅿️ Parcheggio: verifica in loco lungo la strada di accesso.";

  return `🧭 **Itinerario per ${s.name}** — *${riv.name}*

${parkingInfo}

**Percorso:**
${steps}

⏱️ Tempo totale: ~${s.walkingMinutes} min a piedi | Difficoltà: ${"⭐".repeat(s.difficulty)}
${s.notes ? `\n💡 ${s.notes}` : ""}

${AtlasSpots.spotTag(s)}`;
}

function respParcheggio(ctx, hintRiver, msg) {
  const spots = hintRiver
    ? AtlasSpots.find({ riverId: hintRiver.id }).filter(s => s.parking)
    : AtlasSpots.all().filter(s => s.parking);

  if(spots.length === 0) {
    return `Non ho dati di parcheggio specifici per questa zona. Ti consiglio di cercare una piazzola lungo la strada di accesso al torrente o di chiedere in loco.`;
  }

  const riv  = hintRiver ? ` sul **${hintRiver.name}**` : "";
  const list = spots.slice(0, 4).map(s => {
    const p = s.parking;
    return `🅿️ **${p.name}**
   Spot: ${s.name} (${p.distanceMeters} m)
   ${p.description}
   ${AtlasSpots.spotTag(s)}`;
  }).join("\n\n");

  return `Parcheggi disponibili${riv}:

${list}

Premi **"Mostra sulla mappa"** su uno spot per visualizzare la posizione esatta del parcheggio e il percorso.`;
}

function respMarkerInfo(ctx, hintRiver) {
  if(!hintRiver) {
    return `Dimmi il nome del torrente per vedere tutti i marker, punti di interesse e strutture disponibili!\n\nEsempio: **"Cosa trovo sul Sesia?"**`;
  }

  const spots = AtlasSpots.find({ riverId: hintRiver.id });
  if(spots.length === 0) {
    return `Non ho marker dettagliati per il **${hintRiver.name}** al momento. I marker verranno aggiunti progressivamente al database TroutAtlas.`;
  }

  const markerLines = [];
  spots.forEach(s => {
    (s.markers || []).forEach(mk => {
      markerLines.push(`${mk.emoji} **${mk.name}** — ${mk.description}`);
    });
  });

  const spotLines = spots.map(s =>
    `🎣 **${s.name}** — ${s.type}, difficoltà ${"⭐".repeat(s.difficulty)}, ${s.walkingMinutes} min a piedi`
  ).join("\n");

  const parkLines = spots
    .filter(s => s.parking)
    .map(s => `🅿️ **${s.parking.name}** — ${s.parking.description}`)
    .join("\n");

  return `**Mappa completa del ${hintRiver.name}:**

🎣 **Spot di pesca:**
${spotLines}

${markerLines.length ? `📌 **Punti di interesse:**\n${markerLines.join("\n")}\n` : ""}${parkLines ? `🅿️ **Parcheggi:**\n${parkLines}` : ""}

Vuoi l'itinerario per uno spot specifico? Chiedi **"Come arrivo a [nome spot]"**.`;
}

function respGenerico(msg, ctx, river) {
  const { season } = ctx;
  const riv = river ? ` (${river.name})` : "";
  return `Non ho capito perfettamente la domanda, ma sono qui per aiutarti!${riv}

In **${SEASON_DATA[season].label}** posso dirti:
• 🎣 **Dove pescare** — i torrenti migliori adesso
• 🪰 **Mosche e artificiali** — cosa usare in questo periodo
• ⏰ **Orari** — le fasce d'attività delle trote
• 🐟 **Dove trovare le trote** — lettura del fiume
• 📋 **Regolamenti** — per ogni torrente

Prova a riformulare la domanda, o usa uno dei pulsanti rapidi in alto!`;
}

// Utility
function estimateWaterTemp(season, altitude) {
  const base = { primavera:9, estate:16, autunno:12, inverno:4 }[season] || 10;
  const alt = altitude || 300;
  const adj = Math.max(0, (alt - 400) / 200) * 0.4;
  return (base - adj).toFixed(1);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── §5 AtlasUI ──────────────────────────────────────────────────── */
function renderMarkdown(text) {
  const lines = text.split('\n');
  let html = '';
  for(let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Empty line → small spacer
    if(!line.trim()) {
      if(i > 0 && i < lines.length - 1) html += '<div style="height:5px"></div>';
      continue;
    }
    // Spot action card tag: [[SPOT:riverId:spotId:Name:score]]
    if(line.startsWith('[[SPOT:')) {
      const inner  = line.slice(7, -2);
      const parts  = inner.split(':');
      const rivId  = parts[0], spotId = parts[1], name = parts[2], score = parts[3];
      const href   = `river.html?id=${rivId}&spot=${spotId}`;
      html += `<div class="atlas-spot-card">
        <div class="atlas-spot-card-info">
          <span class="atlas-spot-card-icon">🎣</span>
          <div>
            <div class="atlas-spot-card-name">${name}</div>
            ${score ? `<div class="atlas-spot-card-score">🟢 Fishing Score ${score}/100</div>` : ''}
          </div>
        </div>
        <a class="atlas-spot-card-btn" href="${href}">Mostra sulla mappa →</a>
      </div>`;
      continue;
    }
    // Section header: starts with non-letter (emoji, symbol) and contains **bold**
    if(!/^[a-zA-ZÀ-ÿ•·▸\-]/.test(line) && /\*\*/.test(line)) {
      const content = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/_(.+?)_/g,       '<em>$1</em>');
      html += `<div class="atlas-resp-section">${content}</div>`;
      continue;
    }
    // Bullet point
    if(/^[•·▸\-]\s/.test(line)) {
      const inner = line.replace(/^[•·▸\-]\s*/,'')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/_(.+?)_/g,       '<em>$1</em>');
      html += `<div class="atlas-resp-bullet"><span class="atlas-bullet-dot">•</span><span>${inner}</span></div>`;
      continue;
    }
    // Normal paragraph line
    const content = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g,       '<em>$1</em>');
    html += `<p class="atlas-resp-p">${content}</p>`;
  }
  return html;
}

function scrollChat() {
  const chat = document.getElementById("atlas-chat");
  setTimeout(() => { chat.scrollTop = chat.scrollHeight; }, 60);
}

function addMessage(role, text) {
  const chat    = document.getElementById("atlas-chat");
  const welcome = document.getElementById("atlas-welcome");
  if(welcome) welcome.style.display = "none";

  const now  = new Date();
  const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');

  const wrap = document.createElement("div");
  wrap.className = "atlas-msg-in";

  if(role === "ai") {
    wrap.innerHTML = `
      <div class="atlas-ai-card">
        <div class="atlas-ai-header">
          <span class="atlas-ai-hicon">🤖</span>
          <span class="atlas-ai-hname">ATLAS AI</span>
          <span class="atlas-ai-htime">${time}</span>
        </div>
        <div class="atlas-ai-body">${renderMarkdown(text)}</div>
        <div class="atlas-ai-actions">
          <button class="atlas-action-btn" onclick="copyMsg(this)" title="Copia risposta">📋 Copia</button>
          <button class="atlas-action-btn" onclick="newQuestion()" title="Nuova domanda">✏️ Nuova domanda</button>
        </div>
      </div>`;
  } else {
    wrap.innerHTML = `<div class="atlas-user-msg"><div class="atlas-user-bubble">${escHtml(text)}</div></div>`;
  }
  chat.appendChild(wrap);
  scrollChat();
  return wrap;
}

function addLoading() {
  const chat    = document.getElementById("atlas-chat");
  const welcome = document.getElementById("atlas-welcome");
  if(welcome) welcome.style.display = "none";

  const div = document.createElement("div");
  div.className = "atlas-msg-in";
  div.id = "atlas-loading";
  div.innerHTML = `
    <div class="atlas-skeleton-card">
      <div class="atlas-skeleton-hdr">
        <div class="atlas-sk-icon"></div>
        <div class="atlas-sk-name"></div>
      </div>
      <div class="atlas-skeleton-body">
        <div class="atlas-sk-line"></div>
        <div class="atlas-sk-line"></div>
        <div class="atlas-sk-line"></div>
      </div>
      <div class="atlas-skeleton-label">🤖 ATLAS AI sta analizzando le condizioni…</div>
    </div>`;
  chat.appendChild(div);
  scrollChat();
  return div;
}

function removeLoading() {
  const el = document.getElementById("atlas-loading");
  if(el) el.remove();
}

function escHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

window.copyMsg = function(btn) {
  const body = btn.closest(".atlas-ai-card").querySelector(".atlas-ai-body");
  const text = body ? body.innerText : "";
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = "✅ Copiato";
    setTimeout(() => { btn.textContent = "📋 Copia"; }, 2000);
  }).catch(() => {});
};

window.newQuestion = function() {
  const inp = document.getElementById("atlas-input");
  if(inp) { inp.focus(); inp.value = ""; }
};

async function sendMessage(text) {
  if(_sending || !text.trim()) return;
  _sending = true;

  const inp     = document.getElementById("atlas-input");
  const sendBtn = document.getElementById("atlas-send-btn");
  inp.value = "";
  inp.style.height = "auto";
  sendBtn.disabled = true;

  AtlasMemory.push("user", text);
  addMessage("user", text);
  const loading = addLoading();

  try {
    const ctx     = AtlasContext.build();
    const history = AtlasMemory.load();
    const reply   = await LocalProvider.respond(text, ctx, history);
    removeLoading();
    AtlasMemory.push("ai", reply);
    addMessage("ai", reply);
  } catch(err) {
    removeLoading();
    addMessage("ai", "Mi dispiace, si è verificato un errore. Riprova tra un momento.");
  }
  _sending = false;
  sendBtn.disabled = false;
}

function initUI() {
  const input   = document.getElementById("atlas-input");
  const sendBtn = document.getElementById("atlas-send-btn");
  const clearBtn = document.getElementById("atlas-clear-btn");
  const chips   = document.querySelectorAll(".atlas-qcard");
  const chat    = document.getElementById("atlas-chat");

  // Auto-resize textarea
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });

  // Send on Enter (Shift+Enter = newline)
  input.addEventListener("keydown", e => {
    if(e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input.value.trim());
    }
  });

  // Enable send button when input has text
  input.addEventListener("input", () => {
    sendBtn.disabled = !input.value.trim();
  });

  sendBtn.addEventListener("click", () => sendMessage(input.value.trim()));

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      sendMessage(chip.dataset.q);
    });
  });

  clearBtn.addEventListener("click", () => {
    AtlasMemory.clear();
    chat.innerHTML = "";
    // Re-show welcome
    const welcome = document.createElement("div");
    welcome.id = "atlas-welcome";
    welcome.className = "atlas-welcome";
    welcome.innerHTML = document.getElementById("atlas-chips")
      ? "" // already in DOM
      : "";
    location.reload();
  });

  // Restore conversation history
  const history = AtlasMemory.load();
  if(history.length > 0) {
    const welcome = document.getElementById("atlas-welcome");
    if(welcome) welcome.style.display = "none";
    history.forEach(m => addMessage(m.role, m.text));
  }
}

/* ── §6 Init ─────────────────────────────────────────────────────── */
(async function init() {
  await AtlasDB.load();
  initUI();
})();
