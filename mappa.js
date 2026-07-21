/* ── Storage ──────────────────────────────────────────────── */
function getSpots() { return JSON.parse(localStorage.getItem("trout_spots") || "[]"); }
function saveSpots(s) { localStorage.setItem("trout_spots", JSON.stringify(s)); }

/* ── Map ──────────────────────────────────────────────────── */
const map = L.map("user-map", {zoomControl:true, attributionControl:false})
  .setView([45.65, 8.05], 9);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom:18}).addTo(map);

function makeIcon(e="📍") {
  return L.divIcon({html:`<div class="spot-marker">${e}</div>`,className:"",iconSize:[36,36],iconAnchor:[18,30]});
}

/* ── Render spots ─────────────────────────────────────────── */
const markersLayer = L.layerGroup().addTo(map);

function renderSpots() {
  markersLayer.clearLayers();
  const spots = getSpots();
  const c = document.getElementById("spot-count");
  c.textContent = spots.length ? `${spots.length} spot salvat${spots.length===1?"o":"i"}` : "";
  spots.forEach((spot, i) => {
    const m = L.marker([spot.lat, spot.lng], {icon: makeIcon("🎣")}).addTo(markersLayer);
    m.on("click", () => openDetail(i));
  });
}

/* ── Detail modal ─────────────────────────────────────────── */
function openDetail(i) {
  const spot = getSpots()[i]; if (!spot) return;
  document.getElementById("detail-title").textContent = spot.name;
  document.getElementById("detail-body").innerHTML = `
    ${spot.photo ? `<img src="${spot.photo}" class="detail-photo">` : ""}
    ${spot.species ? `<div class="reg-item"><span class="reg-label">🐟 Specie</span><span class="reg-value">${spot.species}</span></div>` : ""}
    ${spot.desc    ? `<div class="reg-item"><span class="reg-label">📝 Note</span><span class="reg-value">${spot.desc}</span></div>` : ""}
    <div class="reg-item"><span class="reg-label">📍 Coordinate</span><span class="reg-value">${spot.lat.toFixed(5)}, ${spot.lng.toFixed(5)}</span></div>
    <div class="reg-item"><span class="reg-label">📅 Salvato il</span><span class="reg-value">${new Date(spot.savedAt).toLocaleDateString("it-IT",{day:"2-digit",month:"long",year:"numeric"})}</span></div>
    <a class="btn btn-maps" style="text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px"
       href="geo:0,0?q=${spot.lat},${spot.lng}">🧭 Portami qui</a>
    <button class="btn btn-danger" onclick="deleteSpot(${i})">🗑️ Elimina spot</button>`;
  document.getElementById("detail-modal").classList.add("open");
}

window.deleteSpot = i => {
  const spots = getSpots(); spots.splice(i,1); saveSpots(spots);
  renderSpots();
  document.getElementById("detail-modal").classList.remove("open");
};

["detail-close","detail-modal"].forEach((id, isOverlay) => {
  const el = document.getElementById(id);
  el.addEventListener("click", e => {
    if (!isOverlay || e.target === el) document.getElementById("detail-modal").classList.remove("open");
  });
});

/* ── Add spot ─────────────────────────────────────────────── */
let pendingLat=null, pendingLng=null, pendingMarker=null, photoDataUrl=null, addingMode=false;

const fab=document.getElementById("fab-add"), addModal=document.getElementById("add-modal"),
      addClose=document.getElementById("add-modal-close"), coordDisp=document.getElementById("coord-display"),
      hint=document.getElementById("map-hint");

fab.addEventListener("click", () => { resetForm(); addModal.classList.add("open"); addingMode=true; });
addClose.addEventListener("click", closeAddModal);
addModal.addEventListener("click", e => { if(e.target===addModal) closeAddModal(); });

function closeAddModal() {
  addModal.classList.remove("open"); addingMode=false;
  if(pendingMarker){map.removeLayer(pendingMarker);pendingMarker=null;}
  pendingLat=pendingLng=null;
}

function resetForm() {
  ["spot-name","spot-species","spot-desc"].forEach(id=>document.getElementById(id).value="");
  document.getElementById("spot-photo").value="";
  document.getElementById("photo-preview").style.display="none";
  document.getElementById("photo-text").style.display="block";
  photoDataUrl=null; pendingLat=pendingLng=null;
  coordDisp.textContent="📍 Posizione non selezionata";
  coordDisp.classList.remove("coord-set");
  hint.style.display="block";
}

map.on("click", e => {
  if(!addingMode) return;
  pendingLat=e.latlng.lat; pendingLng=e.latlng.lng;
  coordDisp.textContent=`📍 ${pendingLat.toFixed(5)}, ${pendingLng.toFixed(5)}`;
  coordDisp.classList.add("coord-set"); hint.style.display="none";
  if(pendingMarker) map.removeLayer(pendingMarker);
  pendingMarker=L.marker([pendingLat,pendingLng],{icon:makeIcon("📍")}).addTo(map);
});

const photoInput=document.getElementById("spot-photo"), photoLabel=document.getElementById("photo-label");
photoLabel.addEventListener("click", ()=>photoInput.click());
photoInput.addEventListener("change", ()=>{
  const file=photoInput.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    photoDataUrl=e.target.result;
    const prev=document.getElementById("photo-preview");
    prev.src=photoDataUrl; prev.style.display="block";
    document.getElementById("photo-text").style.display="none";
  };
  reader.readAsDataURL(file);
});

document.getElementById("save-spot-btn").addEventListener("click", ()=>{
  const name=document.getElementById("spot-name").value.trim();
  if(!name){alert("Dai un nome allo spot!"); return;}
  if(pendingLat===null){alert("Tocca la mappa per scegliere la posizione."); return;}
  const spots=getSpots();
  spots.push({name, species:document.getElementById("spot-species").value.trim(),
    desc:document.getElementById("spot-desc").value.trim(),
    photo:photoDataUrl, lat:pendingLat, lng:pendingLng, savedAt:Date.now()});
  saveSpots(spots);
  if(pendingMarker){map.removeLayer(pendingMarker);pendingMarker=null;}
  addingMode=false; addModal.classList.remove("open");
  renderSpots();
  map.setView([pendingLat,pendingLng],14,{animate:true});
  pendingLat=pendingLng=null;
});

/* ── Init ─────────────────────────────────────────────────── */
renderSpots();
if(!getSpots().length){
  L.popup({closeButton:false,autoClose:false,closeOnClick:false})
   .setLatLng([45.65,8.05])
   .setContent('<div style="text-align:center;font-size:13px;line-height:1.5">🎣 Nessuno spot ancora.<br>Tocca <strong>＋</strong> per aggiungerne uno!</div>')
   .openOn(map);
}
