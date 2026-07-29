const schiuseState = {
  selectedRiver: null,
  hints: SCHIUSE_HINTS,
  species: SCHIUSE_SPECIES,
  patterns: SCHIUSE_PATTERNS,
  catalog: SCHIUSE_FLY_CATALOG,
  dietCategories: SCHIUSE_DIET_CATEGORIES,
  locationProfiles: SCHIUSE_LOCATION_PROFILES
};

let riverData = [];

function initSchiuse() {
  const riverSelect = document.getElementById('river-select');
  const refreshBtn = document.getElementById('refresh-btn');

  riverSelect.addEventListener('change', () => {
    schiuseState.selectedRiver = riverData.find(r => r.id === riverSelect.value);
    updateSchiuseView();
  });

  refreshBtn.addEventListener('click', () => {
    if (schiuseState.selectedRiver) {
      updateSchiuseView();
      flashMessage('Condizioni aggiornate', 'success');
    }
  });

  fetch('database.json')
    .then(res => res.json())
    .then(rivers => {
      riverData = rivers.map(r => ({
        id: r.id,
        name: r.name,
        type: r.waterType || 'Fiume/Torrente',
        temp: estimateRiverTemp(r),
        flow: estimateRiverFlow(r),
        region: r.region || 'N/D'
      }));

      riverData.forEach(river => {
        const option = document.createElement('option');
        option.value = river.id;
        option.textContent = `${river.name} — ${river.type}`;
        riverSelect.appendChild(option);
      });

      if (riverData.length) {
        riverSelect.value = riverData[0].id;
        schiuseState.selectedRiver = riverData[0];
        updateSchiuseView();
      }
    })
    .catch(() => {
      riverSelect.innerHTML = '<option>Impossibile caricare i corsi d\'acqua</option>';
    });
}

function estimateRiverTemp(river) {
  const map = {
    fiume: 12,
    torrente: 10,
    'torrente di montagna': 8,
    lago: 14,
    'lago alpino': 7
  };
  return map[(river.waterType || '').toLowerCase()] || 12;
}

function estimateRiverFlow(river) {
  const map = {
    fiume: 'moderata',
    torrente: 'moderata',
    'torrente di montagna': 'forte',
    lago: 'lenta',
    'lago alpino': 'lenta'
  };
  return map[(river.waterType || '').toLowerCase()] || 'moderata';
}

function updateSchiuseView() {
  const statusEl = document.getElementById('condition-status');
  const scoreEl = document.getElementById('schiuse-score');
  const gridEl = document.getElementById('condition-grid');
  const hintEl = document.getElementById('condition-hint');
  const hatchListEl = document.getElementById('active-hatch-list');
  const recommendationGrid = document.getElementById('recommendation-grid');
  const timelineEl = document.getElementById('timeline-chart');
  const whyCard = document.getElementById('why-card');

  if (!schiuseState.selectedRiver) {
    statusEl.textContent = 'Nessun torrente selezionato';
    scoreEl.textContent = '0/100';
    gridEl.innerHTML = '';
    hintEl.textContent = 'Seleziona un corso d’acqua per vedere il tracker.';
    hatchListEl.innerHTML = '';
    recommendationGrid.innerHTML = '';
    timelineEl.innerHTML = '';
    whyCard.innerHTML = '';
    return;
  }

  const river = schiuseState.selectedRiver;
  const profile = getLocationProfile(river.id);
  const activeSpecies = getActiveSpecies(river.temp, river.flow);
  const score = computeSchiuseScore(river.temp, river.flow, activeSpecies.length);
  const recommendations = getPatternRecommendations(activeSpecies, river, profile);

  statusEl.textContent = `${river.name} — Hatch Tracker professionale`;
  scoreEl.textContent = `${score}/100`;
  gridEl.innerHTML = '';
  gridEl.appendChild(createConditionRow('Temperatura stimata', `${river.temp}°C`));
  gridEl.appendChild(createConditionRow('Portata', formatFlow(river.flow)));
  gridEl.appendChild(createConditionRow('Tipo acqua', river.type));
  gridEl.appendChild(createConditionRow('Probabilità attiva', getHatchProbability(activeSpecies)));
  hintEl.textContent = chooseHint();

  renderDietCategories();
  renderLocationBiodiversity(profile);
  renderHatchSummary(activeSpecies, river, profile);
  renderActiveHatchList(activeSpecies);
  renderTimeline(activeSpecies);
  renderRecommendations(recommendations);
  renderWhyCard(recommendations[0], activeSpecies, river, profile);
  renderFlyCatalog();
  renderSpeciesCards();
}

function computeSchiuseScore(temp, flow, speciesCount) {
  let score = 30;
  if (temp >= 8 && temp <= 16) score += 20;
  if (temp >= 10 && temp <= 18) score += 15;
  if (flow === 'moderata') score += 18;
  if (flow === 'lenta') score -= 5;
  if (flow === 'forte') score -= 8;
  if (speciesCount >= 3) score += 15;
  if (speciesCount === 1) score += 5;
  return Math.max(0, Math.min(100, score));
}

function getActiveSpecies(temp) {
  return schiuseState.species.filter(s => temp >= s.bestTemp[0] && temp <= s.bestTemp[1]);
}

function getPatternRecommendations(activeSpecies, river, profile) {
  if (activeSpecies.length === 0) {
    return [{
      id: 'none',
      title: 'Nessuna raccomandazione disponibile',
      category: 'N/A',
      description: 'Nessuna schiusa significativa nelle condizioni attuali.',
      score: 0,
      reasons: ['Nessuna schiusa attiva']
    }];
  }

  return schiuseState.catalog
    .map(pattern => {
      let score = 18;
      const tags = pattern.matchTags || [];
      const activeSpeciesIds = activeSpecies.map(s => s.id);
      const speciesMatch = activeSpeciesIds.some(id => tags.includes(id));
      const reasons = [];

      if (speciesMatch) {
        score += 28;
        reasons.push('Stesso insetto attivo');
      }
      if (tags.includes('chironomid')) {
        score += 16;
        reasons.push('Adatta ai chironomidi locali');
      }
      if (tags.includes('trichoptera') && profile.dominantInsects.includes('Trichoptera')) {
        score += 14;
        reasons.push('Confermata per sedge locali');
      }
      if (pattern.category === 'Nymphs' && /fiume|torrente/i.test(river.type)) {
        score += 12;
        reasons.push('Perfetta in corrente');
      }
      if (pattern.category === 'Dry Flies' && activeSpecies.some(s => ['baetis','ephemera','trichoptera'].includes(s.id))) {
        score += 10;
        reasons.push('Consigliata per superficie');
      }
      if (pattern.category === 'Streamers' && /lago/i.test(profile.waterCharacter)) {
        score += 10;
        reasons.push('Ottima per acque lente');
      }
      if (pattern.months && pattern.months.split(/\s*[–-]\s*/).some(m => profile.season.toLowerCase().includes(m.toLowerCase().substring(0, 3)))) {
        score += 8;
        reasons.push('Periodo stagionale appropriato');
      }
      if (reasons.length === 0) {
        reasons.push('Buona corrispondenza generale');
      }

      return { ...pattern, score: Math.min(100, score), reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function renderDietCategories() {
  const dietGrid = document.getElementById('diet-grid');
  if (!dietGrid) return;
  dietGrid.innerHTML = schiuseState.dietCategories.map(cat => `
    <button class="diet-card" type="button" data-category="${cat.id}">
      <div class="diet-card-icon">${cat.icon}</div>
      <div>
        <strong>${cat.title}</strong>
        <p>${cat.items.slice(0, 4).join(', ')}${cat.items.length > 4 ? '…' : ''}</p>
      </div>
    </button>
  `).join('');

  dietGrid.querySelectorAll('.diet-card').forEach(button => {
    button.addEventListener('click', () => showDietDetails(button.dataset.category));
  });
}

function showDietDetails(categoryId) {
  const category = schiuseState.dietCategories.find(c => c.id === categoryId);
  const card = document.getElementById('diet-detail-card');
  if (!category || !card) return;
  card.innerHTML = `
    <strong>${category.icon} ${category.title}</strong>
    <p>Questa categoria mostra quando le trote la preferiscono e quali imitazioni utilizzare.</p>
    <div class="diet-items">${category.items.map(item => `<span class="chip">${item}</span>`).join('')}</div>
    <p class="diet-note">Consiglio: replica la forma, il colore e il comportamento del cibo selezionato.</p>
  `;
}

function getLocationProfile(id) {
  const profile = SCHIUSE_LOCATION_PROFILE_MAP[id] || schiuseState.locationProfiles.find(p => p.id === id);
  return profile || {
    summary: 'Profilo non disponibile per questa località.',
    altitude: 'N/D',
    waterCharacter: 'N/D',
    substrate: 'N/D',
    season: 'N/D',
    dominantInsects: [],
    notes: 'Usa le condizioni generali e adatta la presentazione in base all’acqua.'
  };
}

function renderLocationBiodiversity(profile) {
  const overview = document.getElementById('bio-overview');
  const grid = document.getElementById('biodiversity-grid');
  if (!overview || !grid) return;
  overview.innerHTML = `
    <div class="bio-summary">${profile.summary}</div>
    <div class="bio-meta">
      <div><strong>Altitudine</strong><span>${profile.altitude}</span></div>
      <div><strong>Caratteristiche</strong><span>${profile.waterCharacter}</span></div>
      <div><strong>Fondale</strong><span>${profile.substrate}</span></div>
      <div><strong>Stagione</strong><span>${profile.season}</span></div>
    </div>
  `;
  grid.innerHTML = (profile.dominantInsects || []).map(item => `
    <div class="biodiversity-card">
      <strong>${item}</strong>
      <p>Presente in questo corso d’acqua.</p>
    </div>
  `).join('');
}

function renderHatchSummary(activeSpecies, river, profile) {
  const summary = document.getElementById('hatch-summary');
  if (!summary) return;
  summary.innerHTML = `
    <div class="hatch-summary-row">
      <div><strong>Probabilità</strong><span>${getHatchProbability(activeSpecies)}</span></div>
      <div><strong>Temp. stimata</strong><span>${river.temp}°C</span></div>
      <div><strong>Acqua</strong><span>${river.type}</span></div>
    </div>
    <p class="hatch-summary-note">${activeSpecies.length ? `Attualmente attivi: ${activeSpecies.map(s => s.title).join(', ')}.` : 'Nessuna specie attiva al momento.'}</p>
  `;
}

function getHatchProbability(activeSpecies) {
  if (activeSpecies.length === 0) return 'Inattivo';
  if (activeSpecies.length === 1) return 'Basso';
  if (activeSpecies.length === 2) return 'Medio';
  return 'Alto';
}

function renderTimeline(activeSpecies) {
  const timelineEl = document.getElementById('timeline-chart');
  if (!timelineEl) return;
  const slots = [
    { label: 'Mattina', icon: '🌅', keywords: ['baetis', 'ephemera'] },
    { label: 'Tarda mattina', icon: '☀️', keywords: ['baetis', 'chironomid'] },
    { label: 'Mezzogiorno', icon: '🌤️', keywords: ['trichoptera', 'chironomid'] },
    { label: 'Pomeriggio', icon: '🌞', keywords: ['trichoptera', 'terrestrial'] },
    { label: 'Sera', icon: '🌇', keywords: ['trichoptera', 'ephemera'] },
    { label: 'Notte', icon: '🌙', keywords: ['chironomid'] }
  ];

  timelineEl.innerHTML = slots.map(slot => {
    const active = activeSpecies.some(s => slot.keywords.includes(s.id) || slot.keywords.includes('terrestrial'));
    return `<div class="timeline-tile${active ? ' active' : ''}">
      <div class="timeline-label">${slot.icon} ${slot.label}</div>
      <div class="timeline-status">${active ? 'Attività probabile' : 'Bassa attività'}</div>
    </div>`;
  }).join('');
}

function renderRecommendations(recommendations) {
  const container = document.getElementById('recommendation-grid');
  if (!container) return;
  container.innerHTML = recommendations.map(pattern => `
    <div class="match-card">
      <div class="match-score">${pattern.score}%</div>
      <strong>${pattern.title}</strong>
      <div class="match-type">${pattern.category}</div>
      <p>${pattern.description}</p>
    </div>
  `).join('');
}

function renderWhyCard(topRecommendation) {
  const whyEl = document.getElementById('why-card');
  if (!whyEl) return;
  if (!topRecommendation || topRecommendation.id === 'none') {
    whyEl.innerHTML = `<p>Non ci sono raccomandazioni affidabili in questo momento. Torna con condizioni diverse.</p>`;
    return;
  }
  whyEl.innerHTML = `
    <div class="why-header">
      <strong>Consigliata perché:</strong>
      <span>Confidenza ${topRecommendation.score}%</span>
    </div>
    <ul class="why-reasons">
      ${topRecommendation.reasons.map(reason => `<li>✓ ${reason}</li>`).join('')}
    </ul>
  `;
}

function renderFlyCatalog() {
  const catalog = document.getElementById('fly-catalog');
  if (!catalog) return;
  catalog.innerHTML = schiuseState.catalog.map(fly => `
    <div class="fly-card">
      ${fly.image ? `<img class="fly-img" src="${fly.image}" alt="${fly.title}" loading="lazy" onerror="this.remove()">` : ''}
      <div class="fly-body">
        <div class="fly-name">${fly.title}</div>
        <div class="fly-type">${fly.category} · ${fly.imitatedInsect}</div>
        <div class="fly-desc">${fly.notes || fly.bestConditions || 'Dettagli disponibili in locale.'}</div>
        <div class="fly-meta"><span>${fly.sizes}</span><span>${fly.months}</span></div>
      </div>
    </div>
  `).join('');
}

function renderActiveHatchList(activeSpecies) {
  const hatchListEl = document.getElementById('active-hatch-list');
  if (!hatchListEl) return;
  if (!activeSpecies.length) {
    hatchListEl.innerHTML = `<div class="schiuse-empty">Nessuna schiusa attiva nel momento corrente.</div>`;
    return;
  }

  hatchListEl.innerHTML = activeSpecies.map(species => `
    <div class="schiuse-card">
      <div class="schiuse-card-header">
        <img src="${species.image}" alt="${species.title}" loading="lazy" onerror="this.remove()">
        <div>
          <strong>${species.title}</strong>
          <p>${species.summary}</p>
        </div>
      </div>
      <div class="schiuse-card-footer">Pattern suggerito: ${species.pattern}</div>
    </div>
  `).join('');
}

function renderSpeciesCards() {
  const speciesGrid = document.getElementById('species-grid');
  if (!speciesGrid) return;
  speciesGrid.innerHTML = schiuseState.species.map(s => `
    <div class="species-card">
      <img src="${s.image}" alt="${s.title}" onerror="this.remove()">
      <div><strong>${s.title}</strong><p>${s.summary}</p></div>
    </div>
  `).join('');
}

function createConditionRow(label, value) {
  const row = document.createElement('div');
  row.className = 'condition-row';
  row.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
  return row;
}

function chooseHint() {
  const index = Math.floor(Math.random() * schiuseState.hints.length);
  return schiuseState.hints[index];
}

function formatFlow(flow) {
  return flow.charAt(0).toUpperCase() + flow.slice(1);
}

function flashMessage(text, type) {
  const tip = document.createElement('div');
  tip.className = `flash-message ${type}`;
  tip.textContent = text;
  document.body.appendChild(tip);
  setTimeout(() => tip.remove(), 2200);
}

window.addEventListener('DOMContentLoaded', () => {
  initSchiuse();
});
