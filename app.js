fetch("database.json")
  .then(r => r.json())
  .then(rivers => {

    const container = document.getElementById("river-list");
    const search    = document.getElementById("search");

    function difficultyStars(n) {
      return Array.from({ length: 5 }, (_, i) =>
        `<span class="star ${i < n ? 'on' : ''}">★</span>`
      ).join("");
    }

    function render(filter = "") {
      const filtered = rivers.filter(r =>
        r.name.toLowerCase().includes(filter.toLowerCase()) ||
        r.zone.toLowerCase().includes(filter.toLowerCase())
      );

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="icon">🏞️</div>
            <p>Nessun torrente trovato per "<strong>${filter}</strong>"</p>
          </div>`;
        return;
      }

      container.innerHTML = "";

      filtered.forEach(river => {
        const card = document.createElement("div");
        card.className = "river-card";

        const thumb = river.images && river.images.length
          ? `<img class="card-thumb" src="${river.images[0]}" alt="${river.name}" loading="lazy">`
          : `<div class="card-thumb-placeholder">🏞️</div>`;

        card.innerHTML = `
          ${thumb}
          <div class="card-body">
            <h2>${river.name}</h2>
            <div class="card-meta">
              <span class="chip">📍 ${river.province}</span>
              <span class="chip">🗺️ ${river.zone}</span>
            </div>
            <p class="card-species">🐟 ${river.species.join(" · ")}</p>
            <div class="difficulty">${difficultyStars(river.difficulty)}</div>
            <button class="btn btn-primary" onclick="openRiver('${river.id}')">
              Apri scheda →
            </button>
          </div>`;

        container.appendChild(card);
      });
    }

    search.addEventListener("input", e => render(e.target.value));
    render();
  });

function openRiver(id) {
  window.location.href = `river.html?id=${id}`;
}
