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

const SCHIUSE_DIET_CATEGORIES = [
  {
    id: 'aquatic',
    title: 'Cibo acquatico',
    icon: '🌊',
    items: ['Mayflies', 'Caddisflies', 'Stoneflies', 'Chironomids', 'Ninfe di libellula', 'Ninfe di damigella', 'Verme acquatico', 'Bloodworm', 'Gamberetti d’acqua dolce', 'Gammarus', 'Scuds', 'Isopodi', 'Coleotteri acquatici', 'Larve di Dobsonfly', 'Hellgrammite']
  },
  {
    id: 'terrestrial',
    title: 'Cibo terrestre',
    icon: '🌿',
    items: ['Formiche', 'Formiche volanti', 'Cavallette', 'Grilli', 'Coleotteri', 'Coccinelle', 'Ragni', 'Bruco', 'Ape', 'Vespa', 'Falena', 'Mosche', 'Insetti caduti']
  },
  {
    id: 'smallfish',
    title: 'Piccoli pesci',
    icon: '🐟',
    items: ['Minnows', 'Tocchetti', 'Sculpin', 'Pesciolini di torrente']
  },
  {
    id: 'other',
    title: 'Altro cibo opportunistico',
    icon: '🦐',
    items: ['Croste di pane', 'Piccoli crostacei', 'Nidiate', 'Detriti organici']
  }
];

const SCHIUSE_LOCATION_PROFILES = [
  {
    id: 'sesia',
    summary: 'Fiume alpino medio-corso con ghiaia fine e correnti sostenute. Le trote inseguono soprattutto ninfe veloci e sedge mattutine.',
    altitude: '450–850 m',
    waterCharacter: 'Acqua fresca, corrente moderata',
    substrate: 'Fondo ghiaioso e ciottoloso',
    season: 'Primavera/estate',
    dominantInsects: ['Baetis', 'Ephemera', 'Trichoptera', 'Chironomidae'],
    notes: 'I passaggi profondi tra riffle e buca sono perfetti per ninfe e emergenti in superficie.'
  },
  {
    id: 'cervo',
    summary: 'Torrente di montagna con tratti rocciosi e acqua molto ossigenata. Predominano efemere grosse e sedge serali.',
    altitude: '550–950 m',
    waterCharacter: 'Corrente rapida, acqua fredda',
    substrate: 'Sassi e ciottoli',
    season: 'Fine primavera/estate',
    dominantInsects: ['Ephemera', 'Trichoptera', 'Stonefly', 'Chironomidae'],
    notes: 'I tratti di ponte e i corridoi rocciosi attirano trote sospese in attesa delle schiuse.'
  },
  {
    id: 'sessera',
    summary: 'Fiume giovane con molti riffle e pozze brevi. Insetti piccoli e medi dominano l’alimentazione delle trote.',
    altitude: '450–700 m',
    waterCharacter: 'Corrente variabile',
    substrate: 'Ghiaia e sabbia grossolana',
    season: 'Primavera/estate',
    dominantInsects: ['Baetis', 'Chironomidae', 'Trichoptera'],
    notes: 'Le trote sono aggressive in cerca di emergenti e fiumi bassi favoriscono le mosche secche.'
  },
  {
    id: 'elvo',
    summary: 'Torrente valle con acqua chiara, fondi sabbiosi e ampie pozze. Gli insetti terrestri caduti sono un elemento chiave.',
    altitude: '300–600 m',
    waterCharacter: 'Corrente moderata',
    substrate: 'Ghiaia, sabbia',
    season: 'Inizio estate',
    dominantInsects: ['Baetis', 'Chironomidae', 'Terrestrials'],
    notes: 'I tratti lenti dopo i riffle sono ottimi per le ninfe e le imitazioni di chironomidi.'
  },
  {
    id: 'strona',
    summary: 'Torrente di collina con corrente rapida e vegetazione ripariale. Spesso le trote cercano alimenti terrestri sulle sponde.',
    altitude: '250–520 m',
    waterCharacter: 'Corrente vivace',
    substrate: 'Ciottoli e sassi',
    season: 'Estate',
    dominantInsects: ['Caddisfly', 'Chironomidae', 'Terrestrials'],
    notes: 'Una secca leggera o emergente può essere decisiva nelle ore centrali.'
  },
  {
    id: 'mastallone',
    summary: 'Torrente subalpino con acqua fredda e corrente forte. Le trote seguono insetti larvali e piccoli pesci nelle risalite.',
    altitude: '700–1200 m',
    waterCharacter: 'Acqua ossigenata, corrente veloce',
    substrate: 'Roccioso e ghiaioso',
    season: 'Primavera/estate',
    dominantInsects: ['Stonefly', 'Caddisfly', 'Chironomidae'],
    notes: 'I giorni caldi favoriscono le emergenti, mentre le mattine fredde premiano le ninfe profonde.'
  },
  {
    id: 'orco',
    summary: 'Fiume prealpino con ampie buche e correnti moderate. Le trote amano sagittare le ninfe e i piccoli alimenti terrestri.',
    altitude: '250–650 m',
    waterCharacter: 'Corrente moderata',
    substrate: 'Ghiaia e sabbia',
    season: 'Primavera/estate',
    dominantInsects: ['Baetis', 'Ephemera', 'Terrestrials'],
    notes: 'I tratti ombreggiati sono preferiti dai pesci grossi nelle ore calde.'
  },
  {
    id: 'mucrone',
    summary: 'Torrente alpino stretto con correnti rapide e salti d’acqua. Predominano le efemere piccole e i tricotteri.',
    altitude: '500–900 m',
    waterCharacter: 'Corrente veloce',
    substrate: 'Rocce e ghiaia',
    season: 'Fine primavera/estate',
    dominantInsects: ['Baetis', 'Trichoptera', 'Stonefly'],
    notes: 'Ottimo per ninfe sottili e scorrimenti precisi tra le rocce.'
  },
  {
    id: 'viverone',
    summary: 'Lago dolce prealpino con acque lente e piane. Le trote si concentrano su chironomidi e gamberi in superficie.',
    altitude: '230 m',
    waterCharacter: 'Acqua calma',
    substrate: 'Fango e sabbia',
    season: 'Primavera/estate',
    dominantInsects: ['Chironomidae', 'Gammarus', 'Terrestrials'],
    notes: 'Sulle rive il lancio vicino ai canneti premia le imitazioni di midge e gambero.'
  },
  {
    id: 'artogna',
    summary: 'Torrente collinare con tratti ombreggiati e rapide costanti. Le trote si alimentano soprattutto su tricotteri e chironomidi.',
    altitude: '320–620 m',
    waterCharacter: 'Corrente costante',
    substrate: 'Ciottoli e sabbia grossolana',
    season: 'Primavera/estate',
    dominantInsects: ['Trichoptera', 'Chironomidae', 'Baetis'],
    notes: 'Le secche leggere funzionano bene nelle ore calde sotto le fronde.'
  },
  {
    id: 'antrona',
    summary: 'Lago alpino di montagna, acque fredde e limpide. Il cibo principale sono chironomidi e piccoli crostacei.',
    altitude: '980 m',
    waterCharacter: 'Acqua fredda e calma',
    substrate: 'Sassi e limo',
    season: 'Estate',
    dominantInsects: ['Chironomidae', 'Gammarus', 'Midge'],
    notes: 'La schiusa di midge è spesso concentrata nelle prime ore del mattino e alla sera.'
  },
  {
    id: 'lys',
    summary: 'Torrente alpino con tratti stretti e torrentizi. Le trote cercano larve e ninfe a profondità medio-bassa.',
    altitude: '400–780 m',
    waterCharacter: 'Corrente rapida',
    substrate: 'Rocce, ghiaia',
    season: 'Primavera/estate',
    dominantInsects: ['Baetis', 'Stonefly', 'Caddisfly'],
    notes: 'I passaggi tra vase e sponda offrono i migliori punti di osservazione.'
  },
  {
    id: 'lagoNero',
    summary: 'Lago alpino profondo e freddo, con acque chiare. Le trote preferiscono chironomidi e piccoli gamberi vicino alla vegetazione sommersa.',
    altitude: '1100 m',
    waterCharacter: 'Calma e fredda',
    substrate: 'Rocce e limo',
    season: 'Estate',
    dominantInsects: ['Chironomidae', 'Gammarus', 'Scuds'],
    notes: 'Le mosche affondanti e le imitazioni di midge in acqua lenta sono efficaci all’alba e al tramonto.'
  }
];

const SCHIUSE_LOCATION_PROFILE_MAP = SCHIUSE_LOCATION_PROFILES.reduce((acc, profile) => {
  acc[profile.id] = profile;
  return acc;
}, {});


const SCHIUSE_FLY_CATALOG = [
  {
    id: 'adams',
    title: 'Adams',
    category: 'Dry Flies',
    imitatedInsect: 'Mayfly adult',
    lifeStage: 'Adult',
    sizes: '#12–#18',
    color: 'Grigio/Marrone',
    materials: 'CDC, penna di capra, paletta bianca',
    difficulty: 'Intermedio',
    presentation: 'Superficie lenta',
    waters: 'Fiumi e torrenti chiari',
    months: 'Mar-Giu',
    bestConditions: 'Acqua limpida, corrente moderata',
    notes: 'Pattern multiuso per efemere e mosche generiche. Ottimo quando il corso d’acqua è freddo.',
    image: null,
    matchTags: ['baetis', 'ephemera']
  },
  {
    id: 'parachute-adams',
    title: 'Parachute Adams',
    category: 'Dry Flies',
    imitatedInsect: 'Mayfly adult',
    lifeStage: 'Adult',
    sizes: '#12–#18',
    color: 'Grigio/Oliva',
    materials: 'CDC, paletta bianca, piuma di gallo',
    difficulty: 'Intermedio',
    presentation: 'Superficie con galleggiamento stabile',
    waters: 'Fiumi e torrenti moderati',
    months: 'Apr-Giu',
    bestConditions: 'Serate luminose e correnti lente',
    notes: 'Perfetto per osservare gli insetti a pelo d’acqua senza attrito.',
    image: null,
    matchTags: ['baetis', 'ephemera']
  },
  {
    id: 'cdc-olive',
    title: 'CDC Olive',
    category: 'Dry Flies',
    imitatedInsect: 'Caddisfly emergent',
    lifeStage: 'Adult',
    sizes: '#14–#18',
    color: 'Oliva',
    materials: 'CDC, corpo olive',
    difficulty: 'Facile',
    presentation: 'Superficie naturale',
    waters: 'Torrenti e laghi',
    months: 'Mag-Set',
    bestConditions: 'Acqua calma, luci diffuse',
    notes: 'Eccellente sul pelo per le sedge e le emergenti oliva.',
    image: null,
    matchTags: ['trichoptera']
  },
  {
    id: 'pheasant-tail',
    title: 'Pheasant Tail',
    category: 'Nymphs',
    imitatedInsect: 'Mayfly nymph',
    lifeStage: 'Nymph',
    sizes: '#14–#18',
    color: 'Marrone',
    materials: 'Piuma di fagiano, filo rame',
    difficulty: 'Intermedio',
    presentation: 'Sospesa vicino al fondo',
    waters: 'Fiumi chiari',
    months: 'Mar-Oct',
    bestConditions: 'Corrente moderata, acqua fredda',
    notes: 'La ninfa più affidabile per le efemere classiche.',
    image: null,
    matchTags: ['baetis']
  },
  {
    id: 'hare-ear',
    title: 'Hare’s Ear',
    category: 'Nymphs',
    imitatedInsect: 'Mayfly/Stonefly nymph',
    lifeStage: 'Nymph',
    sizes: '#10–#16',
    color: 'Marrone',
    materials: 'Pelo di lepre, filo rame',
    difficulty: 'Facile',
    presentation: 'Lento sul fondo',
    waters: 'Fiumi e torrenti',
    months: 'Tutto l’anno',
    bestConditions: 'Acqua limpida, corrente moderata',
    notes: 'Versatile per diversi tipi di ninfa e condizioni di corrente.',
    image: null,
    matchTags: ['baetis', 'trichoptera']
  },
  {
    id: 'comparadun',
    title: 'Comparadun',
    category: 'Dry Flies',
    imitatedInsect: 'Mayfly adult',
    lifeStage: 'Adult',
    sizes: '#14–#18',
    color: 'Oliva/Grigio',
    materials: 'CDC, corona di gallo',
    difficulty: 'Intermedio',
    presentation: 'Superficie bassa',
    waters: 'Torrenti chiari',
    months: 'Apr-Lug',
    bestConditions: 'Giornate calme e acqua chiara',
    notes: 'Eccellente quando le trote cercano l’impostazione della superficie.',
    image: null,
    matchTags: ['baetis']
  },
  {
    id: 'klinkhammer',
    title: 'Klinkhammer',
    category: 'Emergers',
    imitatedInsect: 'Mayfly emerger',
    lifeStage: 'Emerger',
    sizes: '#14–#18',
    color: 'Oliva/Beige',
    materials: 'CDC, dubbing trasparente',
    difficulty: 'Intermedio',
    presentation: 'Sopra e sotto la superficie',
    waters: 'Fiumi e torrenti',
    months: 'Mag-Lug',
    bestConditions: 'Attività di schiusa medio-alta',
    notes: 'Ideale per chi desidera mostrare il corpo dell’emergente e la zampa fuori dall’acqua.',
    image: null,
    matchTags: ['baetis', 'ephemera']
  },
  {
    id: 'elk-hair-caddis',
    title: 'Elk Hair Caddis',
    category: 'Dry Flies',
    imitatedInsect: 'Caddisfly adult',
    lifeStage: 'Adult',
    sizes: '#12–#16',
    color: 'Marrone',
    materials: 'Pelo di alce, corpo in dubbing',
    difficulty: 'Facile',
    presentation: 'Superficie galleggiante',
    waters: 'Fiumi e torrenti',
    months: 'Mag-Set',
    bestConditions: 'Serate e correnti lente',
    notes: 'Pattern classico per le sedge; galleggia bene su acque mosse.',
    image: null,
    matchTags: ['trichoptera']
  },
  {
    id: 'royal-wulff',
    title: 'Royal Wulff',
    category: 'Dry Flies',
    imitatedInsect: 'Generic adult insect',
    lifeStage: 'Adult',
    sizes: '#12–#16',
    color: 'Rosso/Viola',
    materials: 'CDC, piume sintetiche',
    difficulty: 'Facile',
    presentation: 'Superficie visibile',
    waters: 'Fiumi e torrenti',
    months: 'Apr-Oct',
    bestConditions: 'Acqua alta o torbida',
    notes: 'Pattern visibile e attraente quando la trota è selettiva.',
    image: null,
    matchTags: ['terrestrial', 'baetis']
  },
  {
    id: 'zebra-midge',
    title: 'Zebra Midge',
    category: 'Nymphs',
    imitatedInsect: 'Chironomid',
    lifeStage: 'Pupa',
    sizes: '#16–#20',
    color: 'Nero/Argento',
    materials: 'Filo lustrato, testa dorata',
    difficulty: 'Facile',
    presentation: 'Sospesa in acqua calma',
    waters: 'Laghetti e specchi lenti',
    months: 'Mar-Set',
    bestConditions: 'Acqua piatta e trasparente',
    notes: 'Ottimo quando le trote si nutrono di chironomidi in acque lente.',
    image: null,
    matchTags: ['chironomid']
  },
  {
    id: 'woolly-bugger',
    title: 'Woolly Bugger',
    category: 'Streamers',
    imitatedInsect: 'Larvae / small fish',
    lifeStage: 'Nymph/Streamer',
    sizes: '#6–#12',
    color: 'Nero/Oliva',
    materials: 'Pelo di lepre, piume di gallo',
    difficulty: 'Facile',
    presentation: 'Retrieve lento',
    waters: 'Laghi e fiumi lenti',
    months: 'Tutto l’anno',
    bestConditions: 'Acqua fredda e nuvolosa',
    notes: 'Versatile per scodinzoli, sculpin e piccoli gamberetti.',
    image: null,
    matchTags: ['smallfish', 'gammarus']
  },
  {
    id: 'sculpin-pattern',
    title: 'Sculpin Pattern',
    category: 'Streamers',
    imitatedInsect: 'Small fish / sculpin',
    lifeStage: 'Streamer',
    sizes: '#2–#6',
    color: 'Oliva/Marrone',
    materials: 'Pelo di coniglio, piume sintetiche',
    difficulty: 'Intermedio',
    presentation: 'Near bottom retrieve',
    waters: 'Fiumi rocciosi',
    months: 'Autunno/Primavera',
    bestConditions: 'Acqua profonda e corrente',
    notes: 'Perfetta nelle buche rocciose dove le trote cercano rospi e sculpin.',
    image: null,
    matchTags: ['smallfish']
  }
];
