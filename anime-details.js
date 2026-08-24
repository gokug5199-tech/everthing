(function () {
    const data = Array.isArray(window.ANIME_DATA) ? window.ANIME_DATA : [];
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("id") || "attack-on-titan";
    const anime = data.find(function (item) {
        return String(item.id) === requestedId;
    });

    const page = document.getElementById("animePage");

    if (!anime) {
        page.innerHTML = `
            <a href="anime.html" class="back-button">← Back to Anime</a>
            <div class="page-message">
                Anime not found. Check the <strong>id</strong> value in anime-data.js.
            </div>
        `;
        return;
    }

    document.title = `${anime.title} | Episodes`;

    const poster = document.getElementById("animePoster");
    poster.src = anime.image || "";
    poster.alt = anime.title || "Anime poster";

    document.getElementById("animeTitle").textContent = anime.title || "Anime";
    document.getElementById("animeGenres").textContent = Array.isArray(anime.genres)
        ? anime.genres.join(" • ")
        : "";
    document.getElementById("animeDescription").textContent = anime.description || "";
    document.getElementById("animeRating").textContent = `★ ${anime.rating || "-"}`;

    const episodeTotal = Math.max(0, Number.parseInt(anime.episodes, 10) || 0);
    document.getElementById("episodeCount").textContent = `${episodeTotal} episode${episodeTotal === 1 ? "" : "s"}`;

    const grid = document.getElementById("episodesGrid");
    const html = [];

    for (let episode = 1; episode <= episodeTotal; episode += 1) {
        html.push(`
            <a href="watch.html?anime=${encodeURIComponent(anime.id)}&episode=${episode}" class="episode">
                <span class="episode-number">Episode ${episode}</span>
                <span class="play">PLAY ▶</span>
            </a>
        `);
    }

    grid.innerHTML = html.join("");
})();
