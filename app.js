fetch("database.json")
  .then(response => response.json())
  .then(rivers => {

    const container = document.getElementById("river-list");
    const search = document.getElementById("search");

    function render(filter = "") {

      container.innerHTML = "";

      rivers
        .filter(river =>
          river.name.toLowerCase().includes(filter.toLowerCase())
        )
        .forEach(river => {

          const card = document.createElement("div");
          card.className = "river-card";

          card.innerHTML = `
            <h2>${river.name}</h2>

            <p>📍 ${river.region} - ${river.province}</p>

            <p>🗺️ ${river.zone}</p>

            <p>🐟 ${river.species.join(", ")}</p>

            <p>🥾 Difficoltà: ${river.difficulty}/5</p>

            <button onclick="openRiver('${river.id}')">
              Apri scheda
            </button>
          `;

          container.appendChild(card);

        });

    }

    search.addEventListener("input", e => {
      render(e.target.value);
    });

    render();

});

function openRiver(id){

    window.location.href = `river.html?id=${id}`;

}