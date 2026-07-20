const KNOTS = [
  {
    name: "Improved Clinch Knot",
    it: "Nodo Clinch Migliorato",
    use: "Il nodo più usato per attaccare la mosca (o un artificiale) al finale. Affidabile fino a fluorocarbon 0.20.",
    badge: "Essenziale", badgeColor: "#3b82f6",
    steps: [
      "Passa il finale attraverso l'occhiello della mosca per circa 15 cm.",
      "Avvolgi il capo libero attorno al filo principale per 5–7 giri stretti.",
      "Riporta il capo libero attraverso l'asola formata vicino all'occhiello.",
      "Poi fai passare il capo anche attraverso la grande asola appena formata.",
      "Bagna il nodo con la saliva e tiralo lentamente fino in fondo.",
      "Taglia il capo in eccesso a 2 mm."
    ]
  },
  {
    name: "Palomar Knot",
    it: "Nodo Palomar",
    use: "Più facile da fare al buio o con le mani bagnate. Ottimo con ami pesanti o streamer. Meno indicato per ami molto piccoli.",
    badge: "Facile", badgeColor: "#16a34a",
    steps: [
      "Passa un doppio filo (asola) attraverso l'occhiello della mosca.",
      "Fai un mezzo nodo semplice con il doppio filo, lasciando un'asola.",
      "Passa la mosca completa attraverso l'asola.",
      "Tira sia il capo sia il corpo del filo per chiudere il nodo.",
      "Bagna e stringe delicatamente."
    ]
  },
  {
    name: "Surgeon's Knot",
    it: "Nodo del Chirurgo",
    use: "Unisce due sezioni di finale di diametro simile o diverso. Ideale per aggiungere tippet al leader.",
    badge: "Giunzione", badgeColor: "#7c3aed",
    steps: [
      "Sovrapponi i due fili per circa 20 cm in modo parallelo.",
      "Forma un'asola con entrambi i capi sovrapposti.",
      "Passa entrambi i capi attraverso l'asola due volte.",
      "Tieni saldi tutti e quattro i capi e tira delicatamente.",
      "Bagna il nodo prima di stringere del tutto.",
      "Taglia i due monconi in eccesso."
    ]
  },
  {
    name: "Blood Knot",
    it: "Nodo del Sangue",
    use: "Unisce due sezioni di filo simile per costruire un leader affusolato. Più sottile del nodo del chirurgo, scorre meglio attraverso gli anelli.",
    badge: "Giunzione", badgeColor: "#7c3aed",
    steps: [
      "Sovrapponi i due fili per 20 cm, in direzioni opposte.",
      "Avvolgi il primo capo attorno all'altro filo per 5 volte.",
      "Riporta il capo tra i due fili nel punto di incrocio.",
      "Fai lo stesso con il secondo capo (5 avvolgimenti, capo nel centro).",
      "Tira lentamente entrambe le estremità del filo principale.",
      "Taglia i due monconi."
    ]
  },
  {
    name: "Nail Knot",
    it: "Nodo del Chiodo",
    use: "Attacca il leader alla coda di topo (fly line). Crea un giunto liscio che scorre bene attraverso i passanti.",
    badge: "Coda di topo", badgeColor: "#d97706",
    steps: [
      "Affianca il leader e la coda di topo con un chiodino o cannuccia.",
      "Avvolgi il leader attorno a entrambi (coda + chiodo) per 6–7 giri stretti verso sinistra.",
      "Passa il capo del leader nel canale del chiodo.",
      "Rimuovi il chiodo tenendo fermi gli avvolgimenti.",
      "Tira il capo del leader per chiudere il nodo sull'estremità della fly line.",
      "Bagna e tira forte. Taglia l'eccesso."
    ]
  },
  {
    name: "Perfection Loop",
    it: "Asola Perfetta",
    use: "Crea un'asola all'estremità del leader per il sistema loop-to-loop di connessione rapida alla fly line.",
    badge: "Connessione", badgeColor: "#0891b2",
    steps: [
      "Forma una prima asola con il filo vicino all'estremità.",
      "Forma una seconda asola davanti alla prima, passando il capo libero.",
      "Porta il capo libero tra le due asole.",
      "Passa la seconda asola attraverso la prima dall'avanti verso il basso.",
      "Tira la seconda asola con una mano e il corpo del filo con l'altra.",
      "Il nodo si chiude formando un'asola pulita e simmetrica."
    ]
  }
];

const FLIES = [
  {
    name: "Adams",
    type: "Mosca Secca",
    season: "Primavera – Estate",
    desc: "Imitazione generica di efemera. Funziona su quasi tutti i torrenti alpini, specialmente in acque chiare.",
    image: "fly_dry_1.webp",
    sizes: "#12–#18",
    color: "Grigio/Marrone"
  },
  {
    name: "Scarpantibus",
    type: "Mosca Secca",
    season: "Estate",
    desc: "Pattern artigianale italiano molto efficace sui torrenti biellesi e valsesiani. Galleggia perfettamente.",
    image: "fly_dry_1.webp",
    sizes: "#14–#16",
    color: "Oliva/Beige"
  },
  {
    name: "Elk Hair Caddis",
    type: "Mosca Secca – Sedge",
    season: "Primavera – Autunno",
    desc: "Imita la tricoptera adulta. Efficacissima a luglio e agosto durante le schiuse serali.",
    image: "fly_dry_3.webp",
    sizes: "#12–#16",
    color: "Marrone/Beige"
  },
  {
    name: "French Tricolor",
    type: "Ninfa / Mosca Secca",
    season: "Tutto l'anno",
    desc: "Pattern tricolore di tradizione francese, ottimo per la pesca a vista su fario diffidenti.",
    image: "fly_dry_2.webp",
    sizes: "#14–#18",
    color: "Rosso/Giallo/Nero"
  },
  {
    name: "Hare's Ear Nymph",
    it: "Ninfa della Lepre",
    type: "Ninfa",
    season: "Tutto l'anno",
    desc: "La ninfa più versatile. Imita efemere e tricotteri in fase larvale. Ideale a profondità media.",
    image: null,
    sizes: "#10–#16",
    color: "Marrone/Beige"
  },
  {
    name: "Green Chartreuse Streamer",
    type: "Streamer",
    season: "Inverno – Primavera",
    desc: "Per le trote grandi in acque torbide o dopo le piogge. Usato a recupero lento sul fondo.",
    image: "fly_streamer_1.webp",
    sizes: "#4–#8",
    color: "Verde Chartreuse"
  },
  {
    name: "Sculpin",
    type: "Streamer – Imitazione pesce",
    season: "Autunno – Inverno",
    desc: "Imita il ghiozzo. Letale per le trote grosse nei fondali sassosi. Recupero a jerk irregolare.",
    image: "fly_sculpin_1.jpg",
    sizes: "#2–#6",
    color: "Marrone/Oliva"
  },
  {
    name: "CDC Blue Winged Olive",
    type: "Mosca Secca",
    season: "Autunno – Primavera",
    desc: "Imitazione precisa dell'efemera BWO. Galleggia basso sull'acqua, ideale per trote in selezione.",
    image: null,
    sizes: "#16–#20",
    color: "Oliva/Grigio"
  }
];

function badgeStyle(color) {
  return `style="background:${color}22;color:${color};border:1px solid ${color}44"`;
}

function renderKnotsPage() {
  const main = document.getElementById("knots-main");

  // Knots section
  let html = `<div class="section-title">🪢 Nodi Essenziali per la Mosca</div>`;
  KNOTS.forEach(k => {
    html += `
      <div class="knot-card">
        <div class="knot-header">
          <div>
            <div class="knot-name">${k.name}</div>
            <div class="knot-it">${k.it}</div>
          </div>
          <span class="knot-badge" ${badgeStyle(k.badgeColor)}>${k.badge}</span>
        </div>
        <p class="knot-use">${k.use}</p>
        <ol class="knot-steps">
          ${k.steps.map(s => `<li>${s}</li>`).join("")}
        </ol>
      </div>`;
  });

  // Flies section
  html += `<div class="section-title" style="margin-top:8px">🪰 Galleria Mosche Locali</div>
           <div class="fly-grid">`;
  FLIES.forEach(f => {
    const img = f.image
      ? `<img class="fly-img" src="${f.image}" alt="${f.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        + `<div class="fly-img-placeholder" style="display:none">🪰</div>`
      : `<div class="fly-img-placeholder">🪰</div>`;

    html += `
      <div class="fly-card">
        ${img}
        <div class="fly-body">
          <div class="fly-name">${f.name}</div>
          <div class="fly-type">${f.type}</div>
          <div class="fly-desc">${f.desc}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
            <span class="chip" style="font-size:10px">📏 ${f.sizes}</span>
            <span class="chip green" style="font-size:10px">🎨 ${f.color}</span>
          </div>
          <div class="fly-season" style="color:var(--muted);margin-top:6px">📅 ${f.season}</div>
        </div>
      </div>`;
  });
  html += `</div>`;

  main.innerHTML = html;
}

renderKnotsPage();
