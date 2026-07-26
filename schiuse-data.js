const SCHIUSE_SPECIES = [
  {
    id: 'baetis',
    title: 'Baetis / Blue-winged Olive',
    family: 'Ephemeroptera',
    activeMonths: [3, 4, 5, 6],
    bestTemp: [8, 16],
    waterTypes: ['fiume', 'torrente', 'torrente di montagna'],
    pattern: 'Ninfa olive #16-18 / Secca BWO #16',
    summary: 'Preferisce correnti moderate e acque limpide. Ottima nelle prime ore fresche.',
    image: 'assets/images/baetis.jpg',
    source: 'Wikimedia Commons',
    citation: 'Foto reale Baetis tricaudatus (CC BY-SA 4.0)'
  },
  {
    id: 'ephemera',
    title: 'Ephemera danica / Green Drake',
    family: 'Ephemeroptera',
    activeMonths: [4, 5],
    bestTemp: [10, 18],
    waterTypes: ['fiume', 'torrente'],
    pattern: 'Emergente Green Drake #10 / Spent #10',
    summary: 'Massive schiuse di tarda primavera su fiumi chiari con fondo ghiaioso.',
    image: 'assets/images/ephemera.jpg',
    source: 'Wikimedia Commons',
    citation: 'Foto reale Ephemera danica (CC BY 4.0)'
  },
  {
    id: 'trichoptera',
    title: 'Trichoptera / Caddisfly',
    family: 'Trichoptera',
    activeMonths: [5, 6, 7, 8],
    bestTemp: [12, 20],
    waterTypes: ['fiume', 'torrente', 'lago', 'lago alpino'],
    pattern: 'Caddis pupa oliva #14 / Caddis emergente #12',
    summary: 'Le sedge sono un indicatore di acqua pulita; emergono soprattutto nelle ore serali.',
    image: 'assets/images/trichoptera.jpg',
    source: 'Wikimedia Commons',
    citation: 'Foto reale Trichoptera adulto (CC BY 4.0)'
  },
  {
    id: 'chironomid',
    title: 'Chironomidae / Midge',
    family: 'Diptera',
    activeMonths: [3, 4, 5, 6, 7, 8, 9],
    bestTemp: [6, 18],
    waterTypes: ['fiume', 'torrente', 'lago', 'lago alpino'],
    pattern: 'Bloodworm / Chironomid orange #16 / #18',
    summary: 'I chironomidi schiudono a grandi masse in acque tranquille e sono fondamentali per le trote.',
    image: 'assets/images/chironomid.jpg',
    source: 'Wikimedia Commons',
    citation: 'Foto reale Chironomidae larva (CC0)'
  }
];

const SCHIUSE_PATTERNS = [
  {
    id: 'bwo-nymph',
    title: 'Ninfa Baetis #16-18',
    species: ['baetis'],
    description: 'Imitazione versatile per correnti moderate, perfetta quando l’acqua è fresca e chiara.',
    icon: '🪰'
  },
  {
    id: 'green-drake',
    title: 'Emergente Green Drake #10',
    species: ['ephemera'],
    description: 'Usa un’emergente ambra/oliva per la schiusa di fine maggio e inizio giugno.',
    icon: '🌿'
  },
  {
    id: 'caddis-pupa',
    title: 'Caddis pupa oliva #14',
    species: ['trichoptera'],
    description: 'Aggiungi un peso sottile e punta a un ritmo lento: si muovono vicine al fondo.',
    icon: '🪱'
  },
  {
    id: 'chironomid',
    title: 'Bloodworm / Chironomid #16',
    species: ['chironomid'],
    description: 'Eccellente nelle acque lente e quando le trote si concentrano sui midge larvali.',
    icon: '🟠'
  }
];

const SCHIUSE_HINTS = [
  'Un’acqua limpida e corrente moderata favorisce le schiuse di Ephemera e Baetis.',
  'La pioggia leggera può migliorare i risvegli degli insetti, ma le acque torbide riducono le attività.',
  'Vento sotto i 15 km/h mantiene il pelo più calmo e aumenta le probabilità di cattura con esche delicate.',
  'Cerca la chiazze di insetti attorno ai ciottoli e alle sponde basse durante le ore più fresche.'
];
