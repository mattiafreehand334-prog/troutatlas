const TROUT = [
  {
    name: "Trota Fario",
    latin: "Salmo trutta fario",
    keep: "conditional",
    keepLabel: "Tenibile (con limiti)",
    image: "trout_fario.jpg",
    desc: "La trota più comune dei torrenti alpini piemontesi. Livrea variabile: fondo giallastro o olivastro con macchie rosse e nere circondate da anelli bianchi. Ottima indicatrice di qualità dell'acqua.",
    minSize: "22 cm (20 cm in alcuni laghi d'alta quota)",
    dailyLimit: "3–5 esemplari (varia per zona)",
    habitat: "Torrenti, fiumi alpini",
    diet: "Insetti, crostacei, piccoli pesci",
    season: "Marzo – Settembre",
    notes: "Verificare sempre i limiti specifici della zona. Nelle riserve di pesca spesso vige il catch & release obbligatorio."
  },
  {
    name: "Trota Iridea",
    latin: "Oncorhynchus mykiss",
    keep: "yes",
    keepLabel: "Tenibile",
    image: "trout_iridea.jpg",
    desc: "Originaria del Nord America, introdotta in Italia per la pesca sportiva. Riconoscibile per la banda iridescente rosa-violacea sui fianchi. Più resistente della Fario, spesso presente nei laghi artificiali e nei tratti ripopolati.",
    minSize: "25 cm",
    dailyLimit: "5 esemplari",
    habitat: "Laghi, tratti ripopolati di fiumi",
    diet: "Insetti, crostacei, piccoli pesci, lombrichi",
    season: "Tutto l'anno (in alcuni laghi)",
    notes: "Non si riproduce autonomamente nei nostri ambienti. La sua presenza dipende dai ripopolamenti delle sezioni FIPSAS."
  },
  {
    name: "Temolo",
    latin: "Thymallus thymallus",
    keep: "conditional",
    keepLabel: "Catch & Release consigliato",
    image: "trout_temoli.jpg",
    desc: "Riconoscibile per la vistosa pinna dorsale a vela, colorata di blu-viola con puntini rossi. Predilige acque fredde, ossigenate e a corrente veloce. Specie in declino in molti fiumi alpini a causa dell'ibridazione e degli sbarramenti.",
    minSize: "30 cm",
    dailyLimit: "2 esemplari (in molte zone: rilascio obbligatorio)",
    habitat: "Grandi torrenti e fiumi alpini a corrente sostenuta",
    diet: "Insetti (soprattutto in superficie), ninfe, crostacei",
    season: "Marzo – Settembre",
    notes: "⚠️ Specie sensibile. In Valsesia e in molte zone della Regione Piemonte il Temolo deve essere SEMPRE rimesso in acqua. Controllare i regolamenti locali prima di tenere un esemplare."
  },
  {
    name: "Trota Marmorata",
    latin: "Salmo marmoratus",
    keep: "no",
    keepLabel: "Rilascio obbligatorio",
    image: "trout_marmorata2.jpg",
    desc: "Endemica dei fiumi adriatici del Nord Italia. La più grande trota europea, può superare i 10 kg. Livrea unica: fondo grigio-beige con marmorizzazione scura senza macchie rosse. Gravemente minacciata dall'ibridazione con la Trota Fario.",
    minSize: "— (rilascio sempre obbligatorio)",
    dailyLimit: "ZERO — specie protetta",
    habitat: "Grandi fiumi alpini (Tagliamento, Isonzo, Piave) — rara in Piemonte",
    diet: "Pesci, crostacei, anfibi, piccoli mammiferi",
    season: "— (protetta tutto l'anno)",
    notes: "🛑 SPECIE PROTETTA. Se catturata, deve essere rimessa in acqua immediatamente con la massima delicatezza. Usare ami senza ardiglione nelle zone dove è segnalata la sua presenza (es. Torrente Artogna, VCO)."
  },
  {
    name: "Trota Lacustre",
    latin: "Salmo trutta lacustris",
    keep: "conditional",
    keepLabel: "Tenibile (con limiti)",
    image: "trout_lacustre.jpg",
    desc: "Forma lacustre della Trota di Fiume, che vive nei grandi laghi prealpini e risale i fiumi affluenti per riprodursi. Può raggiungere dimensioni notevoli (3–5 kg). Livrea argentata con poche macchie scure.",
    minSize: "30 cm (varia per lago)",
    dailyLimit: "2 esemplari",
    habitat: "Grandi laghi prealpini (Maggiore, Como, Orta, Viverone)",
    diet: "Pesci, crostacei",
    season: "Variabile per lago — verificare regolamenti specifici",
    notes: "Nei laghi come il Viverone è soggetta a regolamenti specifici diversi da quelli dei torrenti. Richiedere il tesserino specifico per il lago."
  }
];

function renderTroutPage() {
  const main = document.getElementById("trout-main");

  main.innerHTML = TROUT.map(t => {
    const keepClass = { yes: "keep-yes", no: "keep-no", conditional: "keep-cond" }[t.keep];
    const keepIcon  = { yes: "✅", no: "🚫", conditional: "⚠️" }[t.keep];
    const img = t.image
      ? `<img class="trout-img" src="${t.image}" alt="${t.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        + `<div class="trout-img-placeholder" style="display:none">🐟</div>`
      : `<div class="trout-img-placeholder">🐟</div>`;

    return `
      <div class="trout-card">
        ${img}
        <div class="trout-body">
          <div class="trout-title-row">
            <div>
              <div class="trout-name">${t.name}</div>
              <div class="trout-latin">${t.latin}</div>
            </div>
            <span class="keep-badge ${keepClass}">${keepIcon} ${t.keepLabel}</span>
          </div>
          <p class="trout-desc">${t.desc}</p>
          <div class="trout-info-grid">
            <div class="trout-info-item">
              <div class="trout-info-label">📏 Taglia minima</div>
              <div class="trout-info-value">${t.minSize}</div>
            </div>
            <div class="trout-info-item">
              <div class="trout-info-label">🎣 Limite giornaliero</div>
              <div class="trout-info-value">${t.dailyLimit}</div>
            </div>
            <div class="trout-info-item">
              <div class="trout-info-label">🏞️ Habitat</div>
              <div class="trout-info-value">${t.habitat}</div>
            </div>
            <div class="trout-info-item">
              <div class="trout-info-label">📅 Stagione</div>
              <div class="trout-info-value">${t.season}</div>
            </div>
          </div>
          ${t.notes ? `<div class="reg-disclaimer" style="margin-top:14px">${t.notes}</div>` : ""}
        </div>
      </div>`;
  }).join("");
}

renderTroutPage();
