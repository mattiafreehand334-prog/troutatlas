const schiuseState = {
  selectedRiver: null,
  score: 0,
  hints: SCHIUSE_HINTS,
  species: SCHIUSE_SPECIES,
  patterns: SCHIUSE_PATTERNS
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
        flow: estimateRiverFlow(r)
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
  const recommendationEl = document.getElementById('recommendation-card');
  const timelineEl = document.getElementById('timeline-chart');
  const speciesGrid = document.getElementById('species-grid');

  if (!schiuseState.selectedRiver) {
    statusEl.textContent = 'Nessun torrente selezionato';
    scoreEl.textContent = '0/100';
    gridEl.innerHTML = '';
    hintEl.textContent = 'Seleziona un corso d’acqua per vedere il tracker.';
    hatchListEl.innerHTML = '';
    recommendationEl.textContent = 'Seleziona un corso d’acqua per generare la strategia.';
    timelineEl.innerHTML = '';
    speciesGrid.innerHTML = '';
    return;
  }

  const river = schiuseState.selectedRiver;
  const baseTemp = river.temp || 12;
  const baseFlow = river.flow || 'moderata';
  const score = computeSchiuseScore(baseTemp, baseFlow);
  const openSpecies = getActiveSpecies(baseTemp);
  const patternRecommendations = getPatternRecommendations(openSpecies);
  const seasonalTimeline = renderTimeline(openSpecies);

  statusEl.textContent = `${river.name} — Condizioni attuali`;
  scoreEl.textContent = `${score}/100`;
  gridEl.innerHTML = '';
  gridEl.appendChild(createConditionRow('Temperatura stimata', `${baseTemp}°C`));
  gridEl.appendChild(createConditionRow('Portata', formatFlow(baseFlow)));
  gridEl.appendChild(createConditionRow('Tipo acqua', river.type || 'Fiume/Torrente'));
  gridEl.appendChild(createConditionRow('Miglior periodo', getSeasonLabel(openSpecies)));
  hintEl.textContent = chooseHint();

  hatchListEl.innerHTML = '';
  if (openSpecies.length === 0) {
    hatchListEl.innerHTML = '<div class="schiuse-empty">Nessuna schiusa significativa nelle condizioni correnti.</div>';
  } else {
    openSpecies.forEach(species => hatchListEl.appendChild(createHatchCard(species)));
  }

  recommendationEl.innerHTML = patternRecommendations
    .map(p => `<div class="recommendation-item"><strong>${p.icon} ${p.title}</strong><p>${p.description}</p></div>`)
    .join('');

  timelineEl.innerHTML = seasonalTimeline;
  speciesGrid.innerHTML = schiuseState.species
    .map(s => `<div class="species-card"><img src="${s.image}" alt="${s.title}"><div><strong>${s.title}</strong><p>${s.summary}</p></div></div>`)
    .join('');
}

function computeSchiuseScore(temp, flow) {
  let score = 50;
  if (temp >= 8 && temp <= 16) score += 20;
  if (temp >= 10 && temp <= 18) score += 15;
  if (flow === 'moderata') score += 15;
  if (flow === 'lenta') score -= 10;
  if (flow === 'forte') score -= 10;
  return Math.max(0, Math.min(100, score));
}

function getActiveSpecies(temp) {
  return schiuseState.species.filter(s => temp >= s.bestTemp[0] && temp <= s.bestTemp[1]);
}

function getPatternRecommendations(activeSpecies) {
  if (activeSpecies.length === 0) return [{ icon: '⚠️', title: 'Nessuna raccomandazione', description: 'Nessuna schiusa significativa al momento. Verifica condizioni più fresche.' }];
  const patternIds = new Set(activeSpecies.flatMap(species => schiuseState.patterns
    .filter(pattern => pattern.species.includes(species.id))
    .map(pattern => pattern.id)));
  return schiuseState.patterns.filter(pattern => patternIds.has(pattern.id));
}

function renderTimeline(activeSpecies) {
  if (activeSpecies.length === 0) {
    return '<div class="timeline-empty">Schiusa fuori stagione o condizioni non ottimali.</div>';
  }
  return activeSpecies.map(species => {
    const months = species.activeMonths.map(m => monthName(m)).join(', ');
    return `<div class="timeline-row"><strong>${species.title}</strong> <span>${months}</span></div>`;
  }).join('');
}

function monthName(month) {
  const names = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  return names[month - 1] || '';
}

function createConditionRow(label, value) {
  const row = document.createElement('div');
  row.className = 'condition-row';
  row.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
  return row;
}

function createHatchCard(species) {
  const card = document.createElement('div');
  card.className = 'schiuse-card';
  card.innerHTML = `<div class="schiuse-card-header"><img src="${species.image}" alt="${species.title}" onerror="this.onerror=null;this.src='schiuse-placeholder.svg';"><div><strong>${species.title}</strong><p>${species.summary}</p></div></div><div class="schiuse-card-footer">Pattern: ${species.pattern}</div>`;
  return card;
}

function chooseHint() {
  const index = Math.floor(Math.random() * schiuseState.hints.length);
  return schiuseState.hints[index];
}

function getSeasonLabel(activeSpecies) {
  if (activeSpecies.some(s => s.id === 'baetis')) return 'Primavera fresca';
  if (activeSpecies.some(s => s.id === 'ephemera')) return 'Fine primavera';
  if (activeSpecies.some(s => s.id === 'trichoptera')) return 'Estate/Mezz’estate';
  if (activeSpecies.some(s => s.id === 'chironomid')) return 'Lungo tutto il periodo';
  return 'Nessun dato stagionale disponibile';
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
