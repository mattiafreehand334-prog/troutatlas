const params = new URLSearchParams(window.location.search);
const riverId = params.get("id");

fetch("database.json")
  .then(response => response.json())
  .then(rivers => {

    const river = rivers.find(r => r.id === riverId);

    if (!river) {
      document.body.innerHTML = "<h1>Torrente non trovato</h1>";
      return;
    }

    document.getElementById("river-name").textContent = river.name;
    document.getElementById("river-location").textContent =
      `${river.region} • ${river.province} • ${river.zone}`;

    document.getElementById("river-species").textContent =
      river.species.join(", ");

    document.getElementById("river-rod").textContent =
      river.recommendedRod;

    document.getElementById("river-line").textContent =
      river.recommendedLine;

    document.getElementById("river-lures").textContent =
      river.recommendedLures.join(", ");

    document.getElementById("river-difficulty").textContent =
      river.difficulty + "/5";
  });