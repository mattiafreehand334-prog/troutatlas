const ENC_CATEGORIES = [
  {
    id: "insects",
    icon: "🦟",
    title: "Insetti acquatici",
    description: "Schiuse, biologia e comportamento alimentare.",
    file: "encyclopedia/insects.json"
  },
  {
    id: "flies",
    icon: "🪰",
    title: "Mosche artificiali",
    description: "Pattern, impiego tecnico e imitazioni.",
    file: "encyclopedia/flies.json"
  },
  {
    id: "fish",
    icon: "🐟",
    title: "Pesci",
    description: "Habitat, dieta, tecniche e regolamenti.",
    file: "encyclopedia/fish.json"
  },
  {
    id: "macroinvertebrates",
    icon: "🦐",
    title: "Macroinvertebrati",
    description: "Prede chiave nella catena alimentare della trota.",
    file: "encyclopedia/macroinvertebrates.json"
  },
  {
    id: "plants",
    icon: "🌿",
    title: "Vegetazione acquatica",
    description: "Ruolo ecologico e supporto all'habitat.",
    file: "encyclopedia/plants.json"
  }
];

const encState = {
  activeCategory: null,
  searchTerm: "",
  cache: {},
  entriesById: {},
  index: []
};

const encUI = {
  search: null,
  categoryGrid: null,
  entryGrid: null,
  resultTitle: null,
  resultCount: null,
  modalOverlay: null,
  modalBody: null,
  modalTitle: null,
  modalClose: null
};

async function initEncyclopedia() {
  encUI.search = document.getElementById("ency-search");
  encUI.categoryGrid = document.getElementById("ency-category-grid");
  encUI.entryGrid = document.getElementById("ency-entry-grid");
  encUI.resultTitle = document.getElementById("ency-results-title");
  encUI.resultCount = document.getElementById("ency-results-count");
  encUI.modalOverlay = document.getElementById("ency-modal-overlay");
  encUI.modalBody = document.getElementById("ency-modal-body");
  encUI.modalTitle = document.getElementById("ency-modal-title");
  encUI.modalClose = document.getElementById("ency-modal-close");

  bindUI();
  await loadIndex();
  await renderCategoryCards();

  const deepEntry = new URLSearchParams(window.location.search).get("entry");
  if (deepEntry) {
    const entry = await getEntryById(deepEntry);
    if (entry) {
      openEntryModal(entry);
      encState.activeCategory = findCategoryByEntry(entry);
      await renderEntryGrid();
      return;
    }
  }

  encState.activeCategory = ENC_CATEGORIES[0].id;
  await renderEntryGrid();
}

function bindUI() {
  encUI.search.addEventListener("input", async (e) => {
    encState.searchTerm = e.target.value.trim().toLowerCase();
    if (encState.searchTerm) {
      await loadAllEntries();
      encState.activeCategory = null;
    }
    await renderEntryGrid();
  });

  encUI.categoryGrid.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-enc-category]");
    if (!btn) return;
    encState.searchTerm = "";
    encUI.search.value = "";
    encState.activeCategory = btn.getAttribute("data-enc-category");
    await renderEntryGrid();
    await renderCategoryCards();
  });

  encUI.entryGrid.addEventListener("click", async (e) => {
    const card = e.target.closest("[data-enc-entry]");
    if (!card) return;
    const entry = await getEntryById(card.getAttribute("data-enc-entry"));
    if (entry) openEntryModal(entry);
  });

  encUI.modalBody.addEventListener("click", async (e) => {
    const link = e.target.closest("[data-enc-open]");
    if (!link) return;
    const id = link.getAttribute("data-enc-open");
    const entry = await getEntryById(id);
    if (entry) openEntryModal(entry);
  });

  encUI.modalClose.addEventListener("click", closeEntryModal);
  encUI.modalOverlay.addEventListener("click", (e) => {
    if (e.target === encUI.modalOverlay) closeEntryModal();
  });
}

async function loadIndex() {
  try {
    const res = await fetch("encyclopedia/index.json");
    encState.index = await res.json();
  } catch (_) {
    encState.index = [];
  }
}

async function loadCategory(categoryId) {
  if (encState.cache[categoryId]) return encState.cache[categoryId];
  const cat = ENC_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return [];

  try {
    const res = await fetch(cat.file);
    const data = await res.json();
    encState.cache[categoryId] = Array.isArray(data) ? data : [];

    encState.cache[categoryId].forEach((entry) => {
      entry._category = categoryId;
      encState.entriesById[entry.id] = entry;
    });
    return encState.cache[categoryId];
  } catch (_) {
    encState.cache[categoryId] = [];
    return [];
  }
}

async function loadAllEntries() {
  await Promise.all(ENC_CATEGORIES.map((cat) => loadCategory(cat.id)));
}

async function renderCategoryCards() {
  const counts = await Promise.all(ENC_CATEGORIES.map(async (cat) => {
    const entries = await loadCategory(cat.id);
    return { id: cat.id, count: entries.length };
  }));

  const countMap = counts.reduce((acc, cur) => {
    acc[cur.id] = cur.count;
    return acc;
  }, {});

  encUI.categoryGrid.innerHTML = ENC_CATEGORIES.map((cat) => {
    const active = encState.activeCategory === cat.id ? " active" : "";
    return `
      <button class="ency-category-card${active}" type="button" data-enc-category="${cat.id}">
        <div class="ency-category-top">
          <span class="ency-category-icon">${cat.icon}</span>
          <span class="chip">${countMap[cat.id] || 0} voci</span>
        </div>
        <strong>${cat.title}</strong>
        <p>${cat.description}</p>
      </button>
    `;
  }).join("");
}

async function renderEntryGrid() {
  let entries = [];

  if (encState.searchTerm) {
    entries = Object.values(encState.entriesById).filter(matchesSearch);
    encUI.resultTitle.textContent = `Risultati per "${encState.searchTerm}"`;
  } else if (encState.activeCategory) {
    entries = await loadCategory(encState.activeCategory);
    const cat = ENC_CATEGORIES.find((c) => c.id === encState.activeCategory);
    encUI.resultTitle.textContent = cat ? cat.title : "Voci disponibili";
  } else {
    await loadAllEntries();
    entries = Object.values(encState.entriesById);
    encUI.resultTitle.textContent = "Voci disponibili";
  }

  encUI.resultCount.textContent = `${entries.length} voci`;

  if (!entries.length) {
    encUI.entryGrid.innerHTML = `<div class="schiuse-empty">Nessuna voce trovata con i filtri correnti.</div>`;
    return;
  }

  entries.sort((a, b) => getEntryDisplayName(a).localeCompare(getEntryDisplayName(b), "it"));
  encUI.entryGrid.innerHTML = entries.map((entry) => {
    const name = getEntryDisplayName(entry);
    const subtitle = getEntrySubtitle(entry);
    const cover = entry.coverImage || "";
    return `
      <article class="ency-entry-card" data-enc-entry="${entry.id}">
        ${cover ? `<img class="ency-entry-cover" src="${cover}" alt="${name}" loading="lazy">` : `<div class="ency-entry-cover-placeholder">📘</div>`}
        <div class="ency-entry-body">
          <strong>${name}</strong>
          <p>${subtitle}</p>
        </div>
      </article>
    `;
  }).join("");
}

function matchesSearch(entry) {
  const needle = encState.searchTerm;
  const fields = [
    entry.id,
    entry.name,
    entry.italianName,
    entry.title,
    entry.scientificName,
    entry.description,
    entry.summary
  ].filter(Boolean).join(" ").toLowerCase();

  return fields.includes(needle);
}

function getEntryDisplayName(entry) {
  return entry.italianName || entry.name || entry.title || entry.id;
}

function getEntrySubtitle(entry) {
  const sci = entry.scientificName ? `<em>${entry.scientificName}</em>` : "";
  const type = entry.flyType || entry.family || entry.classification || entry.type;
  return [sci, type].filter(Boolean).join(" · ");
}

async function getEntryById(id) {
  if (encState.entriesById[id]) return encState.entriesById[id];

  const fromIndex = encState.index.find((item) => item.id === id);
  if (!fromIndex) {
    await loadAllEntries();
    return encState.entriesById[id] || null;
  }

  const category = mapTypeToCategory(fromIndex.type);
  if (category) await loadCategory(category);
  return encState.entriesById[id] || null;
}

function mapTypeToCategory(type) {
  if (type === "insect") return "insects";
  if (type === "fly") return "flies";
  if (type === "fish") return "fish";
  if (type === "macroinvertebrate") return "macroinvertebrates";
  if (type === "plant") return "plants";
  return null;
}

function findCategoryByEntry(entry) {
  return entry._category || mapTypeToCategory(entry.type) || "insects";
}

function openEntryModal(entry) {
  const name = getEntryDisplayName(entry);
  encUI.modalTitle.textContent = name;
  encUI.modalBody.innerHTML = renderEntryDetail(entry);
  encUI.modalOverlay.classList.add("open");
  encUI.modalOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("trip-planner-open");

  const params = new URLSearchParams(window.location.search);
  params.set("entry", entry.id);
  history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
}

function closeEntryModal() {
  encUI.modalOverlay.classList.remove("open");
  encUI.modalOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("trip-planner-open");

  const params = new URLSearchParams(window.location.search);
  params.delete("entry");
  const q = params.toString();
  history.replaceState(null, "", q ? `${window.location.pathname}?${q}` : window.location.pathname);
}

function renderEntryDetail(entry) {
  const name = getEntryDisplayName(entry);
  const image = entry.coverImage ? `<img class="ency-detail-cover" src="${entry.coverImage}" alt="${name}" loading="lazy">` : "";

  if (entry.type === "insect") return `
    ${image}
    <div class="ency-detail-block"><strong>Nome italiano</strong><span>${entry.italianName || "N/D"}</span></div>
    <div class="ency-detail-block"><strong>Nome scientifico</strong><span><em>${entry.scientificName || "N/D"}</em></span></div>
    <div class="ency-detail-grid">
      ${kv("Classificazione", entry.taxonomicClassification)}
      ${kv("Famiglia", entry.family)}
      ${kv("Taglia tipica", entry.typicalSize)}
      ${kv("Habitat", entry.habitat)}
      ${kv("Distribuzione", entry.distribution)}
      ${kv("Mesi di attivita", entry.activeMonths)}
      ${kv("Periodo di schiusa", entry.emergencePeriod)}
      ${kv("Comportamento", entry.behaviour)}
      ${kv("Importanza alimentare", entry.troutFeedingImportance)}
    </div>
    ${paragraph("Fatti interessanti", entry.interestingFacts)}
    ${paragraph("Consiglio Atlas AI", entry.atlasAiAdvice)}
    ${renderSmartLinks(entry, "Mosche consigliate", entry.flyPatterns)}
    ${renderLinkedGroups(entry)}
  `;

  if (entry.type === "fly") return `
    ${image}
    <div class="ency-detail-block"><strong>Pattern</strong><span>${entry.name || "N/D"}</span></div>
    <div class="ency-detail-grid">
      ${kv("Tipo", entry.flyType)}
      ${kv("Ami consigliati", entry.recommendedHookSizes)}
      ${kv("Stagioni migliori", entry.bestSeasons)}
      ${kv("Condizioni acqua", entry.bestWaterConditions)}
      ${kv("Fiumi ideali", (entry.bestRivers || []).join(", "))}
      ${kv("Presentazione", entry.presentationTechniques)}
      ${kv("Quando evitarla", entry.whenToAvoid)}
    </div>
    ${paragraph("Consiglio Atlas AI", entry.atlasAiAdvice)}
    ${renderSmartLinks(entry, "Insetti target", entry.targetInsects)}
    ${renderLinkedGroups(entry)}
  `;

  if (entry.type === "fish") return `
    ${image}
    <div class="ency-detail-block"><strong>Nome italiano</strong><span>${entry.italianName || "N/D"}</span></div>
    <div class="ency-detail-block"><strong>Nome scientifico</strong><span><em>${entry.scientificName || "N/D"}</em></span></div>
    ${paragraph("Descrizione", entry.description)}
    <div class="ency-detail-grid">
      ${kv("Habitat", entry.habitat)}
      ${kv("Acqua preferita", entry.preferredWater)}
      ${kv("Taglia media", entry.averageSize)}
      ${kv("Taglia massima", entry.maximumSize)}
      ${kv("Dieta", entry.diet)}
      ${kv("Comportamento", entry.behaviour)}
      ${kv("Tecniche", entry.fishingTechniques)}
      ${kv("Protezione", entry.protectionStatus)}
      ${kv("Regolamenti", entry.currentRegulations)}
    </div>
    ${paragraph("Fatti interessanti", entry.interestingFacts)}
    ${paragraph("Consiglio Atlas AI", entry.atlasAiAdvice)}
    ${renderSmartLinks(entry, "Mosche consigliate", entry.flyRecommendations)}
    ${renderListSection("Artificiali consigliati", entry.spinningRecommendations)}
    ${renderLinkedGroups(entry)}
  `;

  if (entry.type === "macroinvertebrate") return `
    ${image}
    <div class="ency-detail-block"><strong>Nome</strong><span>${entry.name || "N/D"}</span></div>
    <div class="ency-detail-block"><strong>Nome scientifico</strong><span><em>${entry.scientificName || "N/D"}</em></span></div>
    <div class="ency-detail-grid">
      ${kv("Classificazione", entry.classification)}
      ${kv("Taglia tipica", entry.typicalSize)}
      ${kv("Habitat", entry.habitat)}
      ${kv("Distribuzione", entry.distribution)}
      ${kv("Ruolo ecologico", entry.ecologicalRole)}
      ${kv("Importanza per la trota", entry.importanceForTrout)}
    </div>
    ${paragraph("Fatti interessanti", entry.interestingFacts)}
    ${paragraph("Consiglio Atlas AI", entry.atlasAiAdvice)}
    ${renderLinkedGroups(entry)}
  `;

  return `
    ${image}
    <div class="ency-detail-block"><strong>Nome</strong><span>${entry.name || "N/D"}</span></div>
    <div class="ency-detail-block"><strong>Nome scientifico</strong><span><em>${entry.scientificName || "N/D"}</em></span></div>
    <div class="ency-detail-grid">
      ${kv("Habitat", entry.habitat)}
      ${kv("Ruolo ecologico", entry.ecologicalRole)}
      ${kv("Importanza per habitat trota", entry.importanceForTroutHabitat)}
      ${kv("Distribuzione", entry.distribution)}
    </div>
    ${paragraph("Fatti interessanti", entry.interestingFacts)}
    ${paragraph("Consiglio Atlas AI", entry.atlasAiAdvice)}
    ${renderLinkedGroups(entry)}
  `;
}

function kv(label, value) {
  return `<div class="ency-kv"><strong>${label}</strong><span>${value || "N/D"}</span></div>`;
}

function paragraph(label, value) {
  return `<div class="ency-detail-block"><strong>${label}</strong><p>${value || "N/D"}</p></div>`;
}

function renderListSection(label, items) {
  if (!items || !items.length) return "";
  return `
    <div class="ency-detail-block">
      <strong>${label}</strong>
      <ul class="trip-list">${items.map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
  `;
}

function renderSmartLinks(entry, label, ids) {
  if (!ids || !ids.length) return "";
  const buttons = ids.map((id) => {
    const target = encState.entriesById[id] || encState.index.find((x) => x.id === id);
    const title = target ? (target.italianName || target.name || target.title || id) : id;
    return `<button class="ency-link-chip" type="button" data-enc-open="${id}">${title}</button>`;
  }).join("");

  return `
    <div class="ency-detail-block">
      <strong>${label}</strong>
      <div class="ency-link-row">${buttons}</div>
    </div>
  `;
}

function renderLinkedGroups(entry) {
  if (!entry.links) return "";
  const groups = [];

  Object.keys(entry.links).forEach((key) => {
    const ids = entry.links[key] || [];
    if (!ids.length) return;
    groups.push(renderSmartLinks(entry, toGroupLabel(key), ids));
  });

  return groups.join("");
}

function toGroupLabel(key) {
  if (key === "flies") return "Mosche correlate";
  if (key === "insects") return "Insetti correlati";
  if (key === "fish") return "Specie correlate";
  if (key === "macroinvertebrates") return "Macroinvertebrati correlati";
  if (key === "plants") return "Vegetazione correlata";
  return "Approfondimenti correlati";
}

window.addEventListener("DOMContentLoaded", initEncyclopedia);
