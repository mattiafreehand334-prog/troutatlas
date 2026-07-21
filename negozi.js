fetch("negozi.json")
  .then(r => r.json())
  .then(shops => {

    /* ── Map ──────────────────────────────────────────────── */
    const map = L.map("shops-map", { zoomControl: true, attributionControl: false })
      .setView([45.62, 8.12], 9);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);

    const icon = L.divIcon({
      html: '<div style="font-size:26px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))">🏪</div>',
      className: "", iconSize: [32, 32], iconAnchor: [16, 28]
    });

    shops.forEach((shop, i) => {
      const marker = L.marker([shop.coordinates.lat, shop.coordinates.lng], { icon }).addTo(map);
      marker.bindPopup(`<strong>${shop.name}</strong><br><span style="font-size:12px;color:#666">${shop.type}</span>`);
      marker.on("click", () => {
        const el = document.getElementById(`shop-${i}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    /* ── List ─────────────────────────────────────────────── */
    const list = document.getElementById("shops-list");
    list.innerHTML = shops.map((s, i) => `
      <div class="shop-card" id="shop-${i}">
        <div class="shop-icon">🏪</div>
        <div class="shop-body">
          <h3>${s.name}</h3>
          <div class="shop-type">${s.type}</div>
          <div class="shop-addr">📍 ${s.address}</div>
          <div class="shop-spec">🎣 ${s.speciality}</div>
          <div class="shop-btns">
            <a class="btn-sm btn-sm-green"
               href="https://www.google.com/maps/dir/?api=1&destination=${s.coordinates.lat},${s.coordinates.lng}"
               target="_blank" rel="noopener">🧭 Portami qui</a>
            ${s.phone ? `<a class="btn-sm btn-sm-blue" href="tel:${s.phone}">📞 Chiama</a>` : ""}
          </div>
        </div>
      </div>`).join("");
  })
  .catch(() => {
    document.getElementById("shops-list").innerHTML = `
      <div class="empty-state"><div class="icon">📡</div><p>Dati non disponibili offline.<br>Connettiti a Internet almeno una volta per scaricarli.</p></div>`;
  });
