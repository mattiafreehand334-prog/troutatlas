let allRivers = [];
let activeTab = "all";

const TRIP_PLAN_STORAGE_KEY = "trout_trip_plan_v1";
const TRIP_FLOW_TYPES = {
  fiume: "moderata",
  torrente: "moderata",
  "torrente di montagna": "forte",
  lago: "lenta",
  "lago alpino": "lenta"
};
const TRIP_TECHNIQUE_LABELS = {
  fly: "Pesca a mosca",
  spinning: "Spinning",
  ninfa: "Ninfa",
  secca: "Mosca Secca",
  streamer: "Streamer"
};

const tripState = {
  step: 1,
  riverId: null,
  date: "",
  technique: "",
  generatedPlan: null,
  savedView: false,
  isGenerating: false
};

const tripUI = {
  banner: null,
  bannerTitle: null,
  bannerSubtitle: null,
  overlay: null,
  closeBtn: null,
  title: null,
  subtitle: null,
  content: null,
  backBtn: null,
  nextBtn: null,
  footer: null
};

function getFavourites() { return JSON.parse(localStorage.getItem("trout_favourites") || "[]"); }
function toggleFavourite(id) {
  const favs = getFavourites();
  const idx = favs.indexOf(id);
  if (idx === -1) favs.push(id); else favs.splice(idx, 1);
  localStorage.setItem("trout_favourites", JSON.stringify(favs));
}
function isFav(id) { return getFavourites().includes(id); }

function difficultyStars(n) {
  return Array.from({length:5},(_,i)=>`<span class="star ${i<n?"on":""}">★</span>`).join("");
}

function wtypeClass(t) {
  return "wtype wtype-" + (t || "fiume").toLowerCase().replace(/\s+/g,"-");
}

function wtypeIcon(t) {
  const map = { "fiume":"🌊","torrente":"💧","torrente di montagna":"🏔️","lago":"🏞️","lago alpino":"🏔️" };
  return map[(t||"").toLowerCase()] || "💧";
}

function render(filter = "") {
  const container = document.getElementById("river-list");
  const favs = getFavourites();

  let rivers = allRivers.filter(r =>
    r.name.toLowerCase().includes(filter.toLowerCase()) ||
    (r.zone||"").toLowerCase().includes(filter.toLowerCase()) ||
    (r.province||"").toLowerCase().includes(filter.toLowerCase())
  );

  if (activeTab === "fav")  rivers = rivers.filter(r => favs.includes(r.id));
  if (activeTab === "lago") rivers = rivers.filter(r => (r.waterType||"").includes("lago"));
  if (activeTab === "fly")  rivers = rivers.filter(r => r.flyFriendly);

  if (rivers.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="icon">${activeTab==="fav"?"❤️":"🏞️"}</div>
      <p>${activeTab==="fav"
        ? "Nessun preferito ancora.<br>Tocca ❤️ su un torrente per salvarlo."
        : "Nessun risultato."}</p>
    </div>`;
    return;
  }

  container.innerHTML = "";
  rivers.forEach(river => {
    const card = document.createElement("div");
    card.className = "river-card";
    const faved = isFav(river.id);
    const hasImg = river.images && river.images.length;
    const altBadge = river.altitude ? `<span class="card-altitude">⛰️ ${river.altitude} m</span>` : "";
    const thumb = hasImg
      ? `<div class="card-img-wrap">
           <img class="card-thumb" src="${river.images[0]}" alt="${river.name}" loading="lazy">
           <div class="card-gradient"></div>${altBadge}
         </div>`
      : `<div class="card-thumb-placeholder">🏞️</div>`;

    card.innerHTML = `
      ${thumb}
      <div class="card-body">
        <span class="${wtypeClass(river.waterType)}">${wtypeIcon(river.waterType)} ${river.waterType || "fiume"}</span>
        <div class="card-title-row">
          <h2>${river.name}</h2>
          <button class="fav-btn" data-id="${river.id}">${faved?"❤️":"🤍"}</button>
        </div>
        <div class="card-meta">
          <span class="chip">📍 ${river.province}</span>
          <span class="chip">🗺️ ${river.zone}</span>
        </div>
        <p class="card-species">🐟 ${river.species.join(" · ")}</p>
        ${river.flyFriendly ? '<p class="fly-badge">🪰 Adatto alla pesca a mosca</p>' : ""}
        <div class="difficulty">${difficultyStars(river.difficulty)}</div>
        <button class="btn btn-primary" onclick="openRiver('${river.id}')">Apri scheda →</button>
      </div>`;

    card.querySelector(".fav-btn").addEventListener("click", e => {
      e.stopPropagation();
      toggleFavourite(river.id);
      render(document.getElementById("search").value);
    });
    container.appendChild(card);
  });
}

fetch("database.json")
  .then(r => r.json())
  .then(rivers => {
    allRivers = rivers;
    document.getElementById("search").addEventListener("input", e => render(e.target.value));
    document.querySelectorAll(".tab").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        btn.classList.add("active");
        activeTab = btn.dataset.tab;
        render(document.getElementById("search").value);
      });
    });
    render();
    initTripPlanner();
  })
  .catch(() => {
    initTripPlanner();
  });

function openRiver(id) { window.location.href = `river.html?id=${id}`; }

function initTripPlanner() {
  tripUI.banner = document.getElementById("trip-home-banner");
  tripUI.bannerTitle = document.getElementById("trip-banner-title");
  tripUI.bannerSubtitle = document.getElementById("trip-banner-subtitle");
  tripUI.overlay = document.getElementById("trip-planner-overlay");
  tripUI.closeBtn = document.getElementById("trip-close-btn");
  tripUI.title = document.getElementById("trip-step-title");
  tripUI.subtitle = document.getElementById("trip-step-subtitle");
  tripUI.content = document.getElementById("trip-step-content");
  tripUI.backBtn = document.getElementById("trip-back-btn");
  tripUI.nextBtn = document.getElementById("trip-next-btn");
  tripUI.footer = document.querySelector(".trip-planner-footer");

  if (!tripUI.banner || !tripUI.overlay) return;

  tripUI.banner.addEventListener("click", () => {
    const saved = getSavedTripPlan();
    if (saved) openSavedPlanOverlay(saved);
    else openPlanner();
  });

  tripUI.closeBtn.addEventListener("click", closePlanner);
  tripUI.overlay.addEventListener("click", (e) => {
    if (e.target === tripUI.overlay) closePlanner();
  });

  tripUI.backBtn.addEventListener("click", onTripBack);
  tripUI.nextBtn.addEventListener("click", onTripNext);

  tripUI.content.addEventListener("click", onTripContentClick);
  tripUI.content.addEventListener("change", onTripContentChange);

  renderTripHomeBanner();
}

function renderTripHomeBanner() {
  const saved = getSavedTripPlan();
  if (!tripUI.bannerTitle || !tripUI.bannerSubtitle) return;

  if (!saved) {
    tripUI.bannerTitle.textContent = "🎣 Pianifica la tua uscita";
    tripUI.bannerSubtitle.textContent = "Crea un piano di pesca completo con Atlas AI.";
    return;
  }

  tripUI.bannerTitle.textContent = "🎣 Uscita pianificata";
  const stars = "★".repeat(saved.rating || 4);
  const hatch = (saved.hatch && saved.hatch.topInsects && saved.hatch.topInsects.length)
    ? saved.hatch.topInsects.slice(0, 2).join(" + ")
    : "N/D";

  tripUI.bannerSubtitle.innerHTML = [
    `📍 ${saved.riverName} - ${saved.selectedSectorName || "Settore principale"}`,
    `📅 ${formatDateLong(saved.date)}`,
    `🌤️ ${saved.conditionsLabel || "Condizioni stimate"}`,
    `🪰 ${hatch}`,
    `${stars}`
  ].join("<br>");
}

function openPlanner(prefillFromSaved) {
  tripState.savedView = false;
  tripState.step = 1;
  tripState.generatedPlan = null;
  tripState.isGenerating = false;

  if (prefillFromSaved) {
    tripState.riverId = prefillFromSaved.riverId || null;
    tripState.date = prefillFromSaved.date || "";
    tripState.technique = prefillFromSaved.technique || "";
  } else {
    tripState.riverId = null;
    tripState.date = "";
    tripState.technique = "";
  }

  showPlannerOverlay();
  setTripStep(1, false);
}

function openSavedPlanOverlay(saved) {
  tripState.savedView = true;
  tripState.generatedPlan = saved;
  showPlannerOverlay();

  tripUI.title.textContent = "Uscita pianificata";
  tripUI.subtitle.textContent = "Riepilogo premium salvato con Atlas AI.";
  tripUI.footer.style.display = "none";
  tripUI.content.innerHTML = renderTripSummaryMarkup(saved, true);
  bindTripEncyclopediaLinks();
}

function showPlannerOverlay() {
  tripUI.overlay.classList.add("open");
  tripUI.overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("trip-planner-open");
}

function closePlanner() {
  tripUI.overlay.classList.remove("open");
  tripUI.overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("trip-planner-open");
}

function setTripStep(nextStep, animate = true) {
  tripState.step = nextStep;
  const meta = getTripStepMeta(nextStep);
  tripUI.footer.style.display = "grid";

  if (animate) animateTripTitle(meta.title, meta.subtitle);
  else {
    tripUI.title.textContent = meta.title;
    tripUI.subtitle.textContent = meta.subtitle;
  }

  renderTripStep();
  updateTripFooter();
}

function getTripStepMeta(step) {
  if (step === 1) return { title: "Scegli il torrente", subtitle: "Seleziona il corso d'acqua da pianificare." };
  if (step === 2) return { title: "Scegli la data", subtitle: "Imposta una data futura per la tua uscita." };
  if (step === 3) return { title: "Come vuoi pescare?", subtitle: "Scegli la tecnica principale per il piano." };
  return { title: "Briefing Atlas AI", subtitle: "Piano completo generato con meteo, schiuse, spot e attrezzatura." };
}

function animateTripTitle(nextTitle, nextSubtitle) {
  tripUI.title.classList.remove("entering-right", "leaving-left");
  tripUI.title.classList.add("leaving-left");

  window.setTimeout(() => {
    tripUI.title.textContent = nextTitle;
    tripUI.subtitle.textContent = nextSubtitle;
    tripUI.title.classList.remove("leaving-left");
    tripUI.title.classList.add("entering-right");
    window.setTimeout(() => tripUI.title.classList.remove("entering-right"), 260);
  }, 240);
}

function renderTripStep() {
  if (tripState.step === 1) {
    tripUI.content.innerHTML = renderTripRiverStep();
    return;
  }

  if (tripState.step === 2) {
    tripUI.content.innerHTML = renderTripDateStep();
    return;
  }

  if (tripState.step === 3) {
    tripUI.content.innerHTML = renderTripTechniqueStep();
    return;
  }

  if (tripState.isGenerating) {
    tripUI.content.innerHTML = `<div class="trip-section"><h4>Atlas AI</h4><p>Sto generando il briefing completo usando i sistemi di TroutAtlas…</p></div>`;
    return;
  }

  if (tripState.generatedPlan) {
    tripUI.content.innerHTML = renderTripSummaryMarkup(tripState.generatedPlan, false);
    bindTripEncyclopediaLinks();
  }
}

function updateTripFooter() {
  if (tripState.step === 1) {
    tripUI.backBtn.textContent = "Chiudi";
    tripUI.nextBtn.textContent = "Continua";
    return;
  }
  if (tripState.step === 2) {
    tripUI.backBtn.textContent = "Indietro";
    tripUI.nextBtn.textContent = "Continua";
    return;
  }
  if (tripState.step === 3) {
    tripUI.backBtn.textContent = "Indietro";
    tripUI.nextBtn.textContent = "Genera piano";
    tripUI.nextBtn.disabled = tripState.isGenerating;
    return;
  }

  tripUI.backBtn.textContent = "Modifica";
  tripUI.nextBtn.textContent = "Salva piano";
  tripUI.nextBtn.disabled = false;
}

function renderTripRiverStep() {
  const sorted = [...allRivers].sort((a, b) => a.name.localeCompare(b.name, "it"));
  return `<div class="trip-grid">${sorted.map((river) => {
    const active = tripState.riverId === river.id ? " active" : "";
    const wType = river.waterType || "fiume";
    return `<button class="trip-choice${active}" type="button" data-trip-river="${river.id}">
      <strong>${river.name}</strong>
      <span>${wType} · ${river.province || "N/D"} · ${river.zone || "N/D"}</span>
    </button>`;
  }).join("")}</div>`;
}

function renderTripDateStep() {
  const minDate = getTomorrowIsoDate();
  const selected = tripState.date || minDate;
  return `<div class="trip-grid">
    <div class="trip-section">
      <h4>Data uscita</h4>
      <input class="trip-date-input" id="trip-date-input" type="date" min="${minDate}" value="${selected}">
      <p style="margin-top:10px">Atlas AI adatterà meteo, periodo biologico e consigli in base a questa data.</p>
    </div>
  </div>`;
}

function renderTripTechniqueStep() {
  const river = findTripRiver();
  const available = collectTechniqueOptions(river);
  return `<div class="trip-grid">
    <div class="trip-section">
      <h4>Tecnica</h4>
      <div class="trip-chip-row">${available.map((tech) => {
        const active = tech === tripState.technique ? " active" : "";
        return `<button class="trip-chip${active}" type="button" data-trip-technique="${tech}">${TRIP_TECHNIQUE_LABELS[tech] || tech}</button>`;
      }).join("")}</div>
      <p style="margin-top:10px">Le raccomandazioni settore, hatch e attrezzatura useranno questa tecnica come priorità.</p>
    </div>
  </div>`;
}

function onTripContentClick(e) {
  const riverBtn = e.target.closest("[data-trip-river]");
  if (riverBtn) {
    tripState.riverId = riverBtn.getAttribute("data-trip-river");
    renderTripStep();
    return;
  }

  const techBtn = e.target.closest("[data-trip-technique]");
  if (techBtn) {
    tripState.technique = techBtn.getAttribute("data-trip-technique");
    renderTripStep();
    return;
  }

  const action = e.target.closest("[data-trip-action]");
  if (!action) return;
  const act = action.getAttribute("data-trip-action");

  if (act === "navigate") {
    const plan = tripState.generatedPlan || getSavedTripPlan();
    if (plan && plan.parking && plan.parking.coordinates) {
      navigateToCoordinates(plan.parking.coordinates.lat, plan.parking.coordinates.lng);
    } else if (plan && plan.riverCoordinates) {
      navigateToCoordinates(plan.riverCoordinates.lat, plan.riverCoordinates.lng);
    }
    return;
  }

  if (act === "regulations") {
    const plan = tripState.generatedPlan || getSavedTripPlan();
    if (!plan) return;
    window.location.href = `river.html?id=${plan.riverId}`;
    return;
  }

  if (act === "edit") {
    const saved = getSavedTripPlan();
    openPlanner(saved);
    return;
  }

  if (act === "delete") {
    localStorage.removeItem(TRIP_PLAN_STORAGE_KEY);
    renderTripHomeBanner();
    closePlanner();
    flashMessage("Piano eliminato", "success");
  }
}

function onTripContentChange(e) {
  if (e.target && e.target.id === "trip-date-input") {
    tripState.date = e.target.value;
  }
}

function onTripBack() {
  if (tripState.savedView) {
    closePlanner();
    return;
  }

  if (tripState.step === 1) {
    closePlanner();
    return;
  }

  if (tripState.step === 4) {
    setTripStep(3);
    return;
  }

  setTripStep(Math.max(1, tripState.step - 1));
}

async function onTripNext() {
  if (tripState.savedView) return;

  if (tripState.step === 1) {
    if (!tripState.riverId) {
      flashMessage("Seleziona prima un torrente", "error");
      return;
    }
    setTripStep(2);
    return;
  }

  if (tripState.step === 2) {
    const selected = tripState.date || document.getElementById("trip-date-input")?.value;
    if (!selected || !isFutureDate(selected)) {
      flashMessage("Seleziona una data futura", "error");
      return;
    }
    tripState.date = selected;
    setTripStep(3);
    return;
  }

  if (tripState.step === 3) {
    if (!tripState.technique) {
      flashMessage("Seleziona una tecnica", "error");
      return;
    }
    await generateTripPlan();
    return;
  }

  if (!tripState.generatedPlan) return;

  saveTripPlan(tripState.generatedPlan);
  renderTripHomeBanner();
  flashMessage("Piano salvato", "success");
  openSavedPlanOverlay(tripState.generatedPlan);
}

async function generateTripPlan() {
  const river = findTripRiver();
  if (!river) return;

  tripState.isGenerating = true;
  tripUI.nextBtn.disabled = true;
  renderTripStep();

  try {
    const plan = await buildTripPlan(river, tripState.date, tripState.technique);
    tripState.generatedPlan = plan;
    tripState.isGenerating = false;
    setTripStep(4);
  } catch (_) {
    tripState.isGenerating = false;
    tripUI.nextBtn.disabled = false;
    renderTripStep();
    flashMessage("Impossibile generare il piano adesso", "error");
  }
}

async function buildTripPlan(river, dateIso, technique) {
  const weather = await fetchTripWeather(river, dateIso);
  const season = getSeasonFromDate(dateIso);
  const month = new Date(`${dateIso}T12:00:00`).getMonth() + 1;
  const estTemp = estimateTripWaterTemp(river, weather, season);
  const flow = TRIP_FLOW_TYPES[(river.waterType || "").toLowerCase()] || "moderata";
  const activeSpecies = getTripActiveSpecies(river, month, estTemp);
  const hatchProbability = getTripHatchProbability(activeSpecies);
  const profile = getTripProfile(river.id);
  const flyPatterns = getTripPatternRecommendations(activeSpecies, { type: river.waterType || "fiume" }, profile);
  const sectors = recommendTripSectors(river, technique);
  const selectedSector = sectors[0] || null;
  const parking = findNearestTripParking(sectors);
  const rating = computeTripRating(weather, activeSpecies, sectors, technique);
  const hours = getBestFishingHours(season, weather);
  const gear = generateGearAdvice({ river, season, technique, weather, selectedSector });
  const topInsects = activeSpecies.map(s => s.title).slice(0, 4);
  const riverLures = (river.recommendedLures || []).slice(0, 4);
  const expectedFish = river.species || [];
  const conditionsLabel = getConditionsLabel(weather);
  const confidence = flyPatterns[0] ? `${flyPatterns[0].score}%` : "N/D";

  return {
    savedAt: Date.now(),
    riverId: river.id,
    riverName: river.name,
    riverCoordinates: river.coordinates || null,
    date: dateIso,
    season,
    technique,
    techniqueLabel: TRIP_TECHNIQUE_LABELS[technique] || technique,
    selectedSectorName: selectedSector ? selectedSector.name : "N/D",
    sectors,
    weather,
    airTemperature: weather ? `${weather.tempMin}°C - ${weather.tempMax}°C` : "N/D",
    waterConditions: weather ? `${estimateClarityFromRain(weather.precipitation)} · Portata ${flow}` : `Portata ${flow}`,
    waterLevel: "N/D (fonte idrometrica non disponibile)",
    hatch: {
      probability: hatchProbability,
      topInsects,
      flyPatterns,
      confidence
    },
    spinningLures: riverLures,
    expectedFish,
    bestHours: hours,
    seasonAnalysis: getSeasonAnalysis(season),
    biologicalPeriod: getBiologicalPeriod(month),
    fishActivityNotes: getFishActivityNotes(season, weather, technique),
    expectations: getTripExpectations(rating, weather),
    difficulty: selectedSector ? `${"★".repeat(Math.max(1, selectedSector.difficulty || river.difficulty || 2))}` : `${"★".repeat(Math.max(1, river.difficulty || 2))}`,
    scenicNotes: getScenicNotes(river, selectedSector),
    parking,
    regulationsLabel: river.regulations ? (river.regulations.license || "Regolamento locale") : "Regolamenti locali",
    gear,
    atlasNotes: buildAtlasNotes(river, weather, activeSpecies, selectedSector),
    conditionsLabel,
    rating
  };
}

function renderTripSummaryMarkup(plan, savedView) {
  const weather = plan.weather;
  const sectorList = plan.sectors.length
    ? `<ul class="trip-list">${plan.sectors.map((s) => `<li>📍 <strong>${s.name}</strong> · ${s.reason}</li>`).join("")}</ul>`
    : "<p>Nessun settore specifico disponibile nei dati correnti.</p>";

  const flyList = plan.hatch.flyPatterns.length
    ? `<ul class="trip-list">${plan.hatch.flyPatterns.slice(0, 4).map((p) => `<li>🪰 <strong data-ency-open="${p.id}">${p.title}</strong> (${p.score}%) - ${p.reasons[0] || "Pattern compatibile"}</li>`).join("")}</ul>`
    : "<p>Pattern specifici non disponibili per le condizioni selezionate.</p>";

  const lureList = plan.spinningLures.length
    ? `<ul class="trip-list">${plan.spinningLures.map((l) => `<li>🎣 ${l}</li>`).join("")}</ul>`
    : "<p>Nessuna esca spinning specificata per questo torrente.</p>";

  const gearList = `<ul class="trip-list">${plan.gear.map((g) => `<li>${g}</li>`).join("")}</ul>`;
  const fishList = plan.expectedFish.length
    ? `<ul class="trip-list">${plan.expectedFish.map((f) => `<li>🐟 <span data-ency-fish="${f}">${f}</span></li>`).join("")}</ul>`
    : "<p>Specie non disponibili.</p>";

  const parkingBlock = plan.parking
    ? `<p><strong>${plan.parking.name}</strong><br>${plan.parking.description}<br>Distanza stimata: ${plan.parking.distanceMeters || "N/D"} m</p>
       <div class="trip-actions" style="margin-top:10px">
         <button class="btn btn-maps" type="button" data-trip-action="navigate">🧭 Portami qui</button>
       </div>`
    : `<p>Parcheggio consigliato non disponibile per il settore selezionato.</p>`;

  const actionButtons = savedView
    ? `<div class="trip-actions" style="margin-top:12px">
         <button class="btn btn-outline" type="button" data-trip-action="edit">✏️ Modifica uscita</button>
         <button class="btn btn-danger" type="button" data-trip-action="delete">🗑️ Elimina uscita</button>
         <button class="btn btn-maps" type="button" data-trip-action="navigate">🧭 Portami qui</button>
       </div>`
    : "";

  return `
    <div class="trip-section">
      <h4>Riepilogo</h4>
      <div class="trip-meta-grid">
        <div class="trip-meta-item"><span class="k">Torrente</span><span class="v">${plan.riverName}</span></div>
        <div class="trip-meta-item"><span class="k">Settore</span><span class="v">${plan.selectedSectorName}</span></div>
        <div class="trip-meta-item"><span class="k">Data</span><span class="v">${formatDateLong(plan.date)}</span></div>
        <div class="trip-meta-item"><span class="k">Tecnica</span><span class="v">${plan.techniqueLabel}</span></div>
        <div class="trip-meta-item"><span class="k">Meteo</span><span class="v">${plan.conditionsLabel}</span></div>
        <div class="trip-meta-item"><span class="k">Valutazione</span><span class="v">${"★".repeat(plan.rating)}</span></div>
      </div>
    </div>

    <div class="trip-section">
      <h4>Briefing Atlas AI</h4>
      <div class="trip-meta-grid">
        <div class="trip-meta-item"><span class="k">Previsioni meteo</span><span class="v">${weather ? weather.label : "N/D"}</span></div>
        <div class="trip-meta-item"><span class="k">Temperatura aria</span><span class="v">${plan.airTemperature}</span></div>
        <div class="trip-meta-item"><span class="k">Condizioni dell'acqua</span><span class="v">${plan.waterConditions}</span></div>
        <div class="trip-meta-item"><span class="k">Livello acqua</span><span class="v">${plan.waterLevel}</span></div>
        <div class="trip-meta-item"><span class="k">Orari migliori</span><span class="v">${plan.bestHours}</span></div>
        <div class="trip-meta-item"><span class="k">Difficoltà</span><span class="v">${plan.difficulty}</span></div>
      </div>
      <p style="margin-top:10px">${plan.seasonAnalysis} ${plan.biologicalPeriod} ${plan.fishActivityNotes}</p>
      <p style="margin-top:10px">${plan.expectations}</p>
    </div>

    <div class="trip-section">
      <h4>Destinazione intelligente</h4>
      ${sectorList}
      <p style="margin-top:10px">Note sceniche: ${plan.scenicNotes}</p>
    </div>

    <div class="trip-section">
      <h4>Integrazione Hatch Tracker</h4>
      <p>Probabilità schiusa: <strong>${plan.hatch.probability}</strong> · Confidenza: <strong>${plan.hatch.confidence}</strong></p>
      <p style="margin-top:8px">Schiuse previste: ${plan.hatch.topInsects.length ? plan.hatch.topInsects.map((i) => `<span data-ency-insect="${i}">${i}</span>`).join(", ") : "N/D"}</p>
      <p style="margin-top:8px">Mosche consigliate e motivazione:</p>
      ${flyList}
    </div>

    <div class="trip-section">
      <h4>Attrezzatura consigliata</h4>
      ${gearList}
      <p style="margin-top:8px">Artificiali consigliati:</p>
      ${lureList}
    </div>

    <div class="trip-section">
      <h4>Specie ittiche previste</h4>
      ${fishList}
    </div>

    <div class="trip-section">
      <h4>Parcheggio</h4>
      ${parkingBlock}
    </div>

    <div class="trip-section">
      <h4>Regolamenti</h4>
      <p>${plan.regulationsLabel}</p>
      <div class="trip-actions" style="margin-top:10px">
        <button class="btn btn-regs" type="button" data-trip-action="regulations">📋 Regolamenti di pesca</button>
      </div>
    </div>

    <div class="trip-section">
      <h4>Analisi di Atlas AI</h4>
      <p>${plan.atlasNotes}</p>
    </div>
    ${actionButtons}
  `;
}

function bindTripEncyclopediaLinks() {
  if (typeof TroutAtlasEncyclopedia === "undefined") return;

  document.querySelectorAll("[data-ency-open]").forEach((el) => {
    if (el.dataset.encyBound === "1") return;
    const id = el.getAttribute("data-ency-open");
    el.dataset.encyBound = "1";
    el.classList.add("ency-inline-link");
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      TroutAtlasEncyclopedia.openEntry(id);
    });
  });

  document.querySelectorAll("[data-ency-insect], [data-ency-fish]").forEach((el) => {
    if (el.dataset.encyBound === "1") return;
    const raw = el.getAttribute("data-ency-insect") || el.getAttribute("data-ency-fish") || el.textContent;
    const id = TroutAtlasEncyclopedia.resolveId(raw);
    if (!id) return;
    el.dataset.encyBound = "1";
    el.classList.add("ency-inline-link");
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      TroutAtlasEncyclopedia.openEntry(id);
    });
  });
}

function recommendTripSectors(river, technique) {
  const spots = Array.isArray(river.spots) ? river.spots : [];
  const zones = Array.isArray(river.zones) ? river.zones : [];
  const normalized = technique === "fly" ? ["secca", "ninfa", "streamer"] : [technique];

  const matches = spots
    .map((spot) => {
      const spotTech = Array.isArray(spot.techniques) ? spot.techniques : [];
      const matchesTechnique = normalized.some((t) => spotTech.includes(t));
      if (!matchesTechnique) return null;

      const zoneHint = zones.find((z) => {
        const desc = `${z.name || ""} ${z.description || ""}`.toLowerCase();
        if (technique === "fly") return desc.includes("mosca") || desc.includes("no spinning") || z.type === "no_kill";
        return !desc.includes("no spinning");
      });

      const reasonParts = [];
      reasonParts.push(`tecniche disponibili: ${spotTech.join(", ")}`);
      if (zoneHint) reasonParts.push(`zona: ${zoneHint.name}`);
      if (spot.notes) reasonParts.push(spot.notes);

      return {
        id: spot.id,
        name: spot.name,
        reason: reasonParts.join(" · "),
        fishingScore: spot.fishingScore || 0,
        difficulty: spot.difficulty || river.difficulty || 2,
        scenicView: !!spot.scenicView,
        parking: spot.parking || null,
        coordinates: spot.coordinates || null
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.fishingScore - a.fishingScore)
    .slice(0, 3);

  if (matches.length > 0) return matches;

  const fallbackZones = zones
    .filter((z) => (technique === "fly"
      ? ((z.name || "").toLowerCase().includes("mosca") || (z.description || "").toLowerCase().includes("mosca") || z.type === "no_kill")
      : z.type !== "no_kill"))
    .map((z) => ({
      id: z.name,
      name: z.name,
      reason: z.description || "Settore selezionato dal regolamento locale",
      fishingScore: 0,
      difficulty: river.difficulty || 2,
      scenicView: false,
      parking: null,
      coordinates: river.coordinates || null
    }));

  return fallbackZones.slice(0, 3);
}

function findNearestTripParking(sectors) {
  const parkingList = sectors
    .filter((s) => s.parking && typeof s.parking.distanceMeters !== "undefined")
    .sort((a, b) => (a.parking.distanceMeters || 999999) - (b.parking.distanceMeters || 999999));

  return parkingList.length ? parkingList[0].parking : null;
}

function generateGearAdvice({ river, season, technique, weather, selectedSector }) {
  const wind = weather ? weather.wind : null;
  const rain = weather ? weather.precipitation : null;
  const advice = [];

  advice.push(`🎣 Canna: ${technique === "spinning" ? (river.recommendedRod || "UL 1.68-1.98 m") : "Canna 9' #4-5"}`);
  advice.push(`🧲 Mulinello: ${technique === "spinning" ? "Taglia 1000-2000" : "Mulinello #4 con frizione progressiva"}`);
  advice.push(`🧵 Lenza: ${technique === "spinning" ? (river.recommendedLine || "PE 0.4 + FC") : "WF floating + finale conico 9'"}`);
  advice.push(`📏 Leader: ${technique === "spinning" ? "Fluorocarbon 0.16-0.20" : "Leader 9'-12'"}`);
  if (technique !== "spinning") advice.push("🪰 Tip: 4X-6X in fluorocarbon");
  advice.push(`🧰 Scatola mosche: ${technique === "spinning" ? "N/D" : "Adams, CDC Olive, Pheasant Tail, Hare's Ear"}`);
  advice.push(`🎯 Artificiali consigliati: ${(river.recommendedLures || ["Spoon 2-3 g", "Minnow 45-60 mm"]).slice(0, 3).join(", ")}`);
  advice.push("🕸️ Guadino: maglia gommata");
  advice.push(`🥾 Wader: ${season === "estate" ? "traspiranti" : "neoprene o traspiranti con strato termico"}`);
  advice.push("🕶️ Occhiali polarizzati: lente ambra o rame");

  if (rain && rain > 2) advice.push("⚠️ Sicurezza: bastone da guado, giacca impermeabile, cambio asciutto");
  else advice.push("⚠️ Sicurezza: kit primo soccorso, telefono carico, lampada frontale");

  if (wind && wind > 20) advice.push("💨 Extra: cappellino con visiera e finali leggermente più robusti per vento sostenuto");
  if (selectedSector && selectedSector.difficulty >= 4) advice.push("🧗 Extra: suola ad alto grip e supporto caviglia per accessi impegnativi");

  return advice;
}

function getTripActiveSpecies(river, month, estTemp) {
  if (typeof SCHIUSE_SPECIES === "undefined") return [];

  const waterType = (river.waterType || "").toLowerCase();
  return SCHIUSE_SPECIES.filter((s) => {
    const monthOk = (s.activeMonths || []).includes(month);
    const tempOk = estTemp >= s.bestTemp[0] && estTemp <= s.bestTemp[1];
    const typeOk = !s.waterTypes || s.waterTypes.some((w) => waterType.includes(w));
    return monthOk && tempOk && typeOk;
  });
}

function getTripPatternRecommendations(activeSpecies, river, profile) {
  if (typeof SCHIUSE_FLY_CATALOG === "undefined") return [];
  if (!activeSpecies.length) return [];

  return SCHIUSE_FLY_CATALOG
    .map((pattern) => {
      let score = 18;
      const tags = pattern.matchTags || [];
      const activeIds = activeSpecies.map((s) => s.id);
      const reasons = [];

      if (activeIds.some((id) => tags.includes(id))) {
        score += 28;
        reasons.push("Stesso insetto attivo");
      }
      if (tags.includes("chironomid")) {
        score += 16;
        reasons.push("Adatta ai chironomidi locali");
      }
      if (tags.includes("trichoptera") && (profile.dominantInsects || []).includes("Trichoptera")) {
        score += 14;
        reasons.push("Confermata per sedge locali");
      }
      if (pattern.category === "Nymphs" && /fiume|torrente/i.test(river.type || "")) {
        score += 12;
        reasons.push("Perfetta in corrente");
      }
      if (pattern.category === "Dry Flies" && activeSpecies.some((s) => ["baetis", "ephemera", "trichoptera"].includes(s.id))) {
        score += 10;
        reasons.push("Consigliata per superficie");
      }
      if (!reasons.length) reasons.push("Buona corrispondenza generale");

      return { ...pattern, score: Math.min(100, score), reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function getTripProfile(riverId) {
  if (typeof SCHIUSE_LOCATION_PROFILE_MAP !== "undefined" && SCHIUSE_LOCATION_PROFILE_MAP[riverId]) {
    return SCHIUSE_LOCATION_PROFILE_MAP[riverId];
  }
  return {
    dominantInsects: [],
    season: "N/D",
    waterCharacter: "N/D"
  };
}

function getTripHatchProbability(activeSpecies) {
  if (!activeSpecies.length) return "Inattivo";
  if (activeSpecies.length === 1) return "Basso";
  if (activeSpecies.length === 2) return "Medio";
  return "Alto";
}

function getSavedTripPlan() {
  try {
    return JSON.parse(localStorage.getItem(TRIP_PLAN_STORAGE_KEY) || "null");
  } catch (_) {
    return null;
  }
}

function saveTripPlan(plan) {
  localStorage.setItem(TRIP_PLAN_STORAGE_KEY, JSON.stringify(plan));
}

function findTripRiver() {
  return allRivers.find((r) => r.id === tripState.riverId) || null;
}

function collectTechniqueOptions(river) {
  const found = new Set(["fly", "spinning"]);
  if (river && Array.isArray(river.spots)) {
    river.spots.forEach((spot) => {
      (spot.techniques || []).forEach((t) => {
        if (["ninfa", "secca", "streamer", "spinning"].includes(t)) found.add(t);
      });
    });
  }
  return Array.from(found);
}

function getTomorrowIsoDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isFutureDate(dateIso) {
  const selected = new Date(`${dateIso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected > today;
}

function formatDateLong(dateIso) {
  try {
    return new Date(`${dateIso}T12:00:00`).toLocaleDateString("it-IT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  } catch (_) {
    return dateIso;
  }
}

function getSeasonFromDate(dateIso) {
  const m = new Date(`${dateIso}T12:00:00`).getMonth() + 1;
  if (m >= 3 && m <= 5) return "Primavera";
  if (m >= 6 && m <= 8) return "Estate";
  if (m >= 9 && m <= 11) return "Autunno";
  return "Inverno";
}

function getSeasonAnalysis(season) {
  if (season === "Primavera") return "Stagione di riattivazione: aumento della finestra alimentare e maggiore mobilità delle trote.";
  if (season === "Estate") return "Stagione tecnica: attività migliore nelle ore fresche, con pesci in cerca di ossigeno e correnti vive.";
  if (season === "Autunno") return "Stagione solida per predazione e preparazione al freddo, spesso con finestre regolari di alimentazione.";
  return "Stagione fredda: metabolismo rallentato e finestre più corte di attività.";
}

function getBiologicalPeriod(month) {
  if (month >= 3 && month <= 5) return "Periodo biologico: post-inverno, alimentazione in recupero.";
  if (month >= 6 && month <= 8) return "Periodo biologico: piena attività estiva con maggiore selettività nelle ore centrali.";
  if (month >= 9 && month <= 11) return "Periodo biologico: pre-frega / transizione autunnale.";
  return "Periodo biologico: ridotta attività metabolica invernale.";
}

function getFishActivityNotes(season, weather, technique) {
  const cond = weather ? getConditionsLabel(weather).toLowerCase() : "condizioni stimate";
  if (technique === "spinning") {
    return `Con ${cond}, prediligere recuperi progressivi e cambi di ritmo nelle buche e nelle correnti laterali.`;
  }
  if (season === "Estate") {
    return `Con ${cond}, approccio più efficace all'alba e in serata; in ore calde meglio ninfa o streamer.`;
  }
  return `Con ${cond}, alternare superficie e sottosuperficie in base ai segnali di attività.`;
}

function getTripExpectations(rating, weather) {
  const wind = weather ? weather.wind : 0;
  if (rating >= 5) return "Aspettative generali: giornata premium con alta probabilità di attività e finestre multiple di abboccata.";
  if (rating === 4) return "Aspettative generali: buone condizioni con margine tecnico elevato; scegliere bene spot e presentazione.";
  if (wind > 24) return "Aspettative generali: condizioni impegnative per vento sostenuto, meglio sessioni brevi e spot riparati.";
  return "Aspettative generali: uscita possibile ma selettiva, privilegiare adattabilità tecnica e precisione.";
}

function getScenicNotes(river, sector) {
  if (sector && sector.scenicView) return `Il settore ${sector.name} è segnalato come panoramico nei dati spot.`;
  const loc = Array.isArray(river.localities) && river.localities.length ? river.localities[0].name : river.zone;
  return `Area ${loc || river.name}: note sceniche disponibili dalle località del torrente.`;
}

function computeTripRating(weather, activeSpecies, sectors, technique) {
  let score = 3;
  if (weather && weather.precipitation < 1) score += 1;
  if (weather && weather.wind > 20) score -= 1;
  if (activeSpecies.length >= 2) score += 1;
  if (!sectors.length) score -= 1;
  if (technique === "fly" && activeSpecies.length) score += 1;
  return Math.max(1, Math.min(5, score));
}

function buildAtlasNotes(river, weather, activeSpecies, selectedSector) {
  const climate = weather ? `${weather.label}, ${weather.tempMin}°C-${weather.tempMax}°C` : "meteo non disponibile";
  const hatch = activeSpecies.length ? activeSpecies.map((s) => s.title).join(", ") : "schiuse limitate";
  const sector = selectedSector ? selectedSector.name : "settore principale";
  return `ATLAS AI indica ${sector} come base operativa su ${river.name}: ${climate}. Schiuse dominanti: ${hatch}. Mantieni approccio progressivo e adatta profondità/presentazione in base alla risposta dei pesci.`;
}

function getBestFishingHours(season, weather) {
  const cloudy = weather ? weather.code === 3 || weather.code === 2 : false;
  if (season === "Estate") return cloudy ? "05:30-09:00 · 18:30-21:00" : "05:00-08:30 · 19:00-21:00";
  if (season === "Primavera") return "07:00-11:00 · 16:30-19:30";
  if (season === "Autunno") return "08:00-11:30 · 15:30-18:30";
  return "10:00-14:00";
}

function estimateTripWaterTemp(river, weather, season) {
  const baseMap = {
    fiume: 12,
    torrente: 10,
    "torrente di montagna": 8,
    lago: 14,
    "lago alpino": 7
  };

  let base = baseMap[(river.waterType || "").toLowerCase()] || 12;
  if (season === "Estate") base += 2;
  if (season === "Inverno") base -= 3;
  if (weather) {
    const avgAir = (weather.tempMin + weather.tempMax) / 2;
    base = (base * 0.65) + (avgAir * 0.35);
  }
  return Math.max(3, Math.min(20, Number(base.toFixed(1))));
}

function estimateClarityFromRain(mm) {
  if (mm < 1) return "Cristallina";
  if (mm < 5) return "Leggermente velata";
  if (mm < 14) return "Velata";
  return "Torbida";
}

function getConditionsLabel(weather) {
  if (!weather) return "Condizioni stimate";
  if (weather.precipitation > 10) return "Condizioni difficili";
  if (weather.precipitation > 3) return "Condizioni variabili";
  if (weather.wind > 24) return "Condizioni tecniche";
  return "Condizioni eccellenti";
}

async function fetchTripWeather(river, dateIso) {
  if (!river.coordinates) return null;

  const { lat, lng } = river.coordinates;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=Europe%2FRome&forecast_days=16`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("weather_fetch_failed");
  const data = await res.json();

  const idx = data.daily.time.indexOf(dateIso);
  const safeIdx = idx >= 0 ? idx : 0;
  const code = data.daily.weather_code[safeIdx];

  return {
    date: data.daily.time[safeIdx],
    code,
    label: mapWeatherCode(code),
    tempMax: Math.round(data.daily.temperature_2m_max[safeIdx]),
    tempMin: Math.round(data.daily.temperature_2m_min[safeIdx]),
    precipitation: Number(data.daily.precipitation_sum[safeIdx] || 0),
    wind: Math.round(data.daily.wind_speed_10m_max[safeIdx] || 0)
  };
}

function mapWeatherCode(code) {
  const map = {
    0: "Cielo sereno",
    1: "Prevalentemente sereno",
    2: "Parzialmente nuvoloso",
    3: "Coperto",
    45: "Nebbia",
    48: "Nebbia",
    51: "Pioviggine leggera",
    53: "Pioviggine",
    55: "Pioviggine intensa",
    61: "Pioggia leggera",
    63: "Pioggia moderata",
    65: "Pioggia intensa",
    80: "Rovesci leggeri",
    81: "Rovesci moderati",
    82: "Rovesci forti",
    95: "Temporale"
  };
  return map[code] || "Condizioni variabili";
}

function navigateToCoordinates(destLat, destLng) {
  const fallback = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
  if (!navigator.geolocation) {
    window.location.href = fallback;
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${pos.coords.latitude},${pos.coords.longitude}&destination=${destLat},${destLng}`;
      window.location.href = url;
    },
    () => {
      window.location.href = fallback;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
}

function flashMessage(text, type) {
  const tip = document.createElement("div");
  tip.className = `flash-message ${type === "success" ? "success" : ""}`;
  tip.textContent = text;
  document.body.appendChild(tip);
  window.setTimeout(() => tip.remove(), 2200);
}
