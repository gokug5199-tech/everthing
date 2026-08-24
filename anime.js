(function () {
    const data = Array.isArray(window.ANIME_DATA) ? window.ANIME_DATA : [];
    const grid = document.getElementById("animeGrid");
    const categoryButtons = Array.from(document.querySelectorAll(".category"));
    const searchInput = document.getElementById("animeSearch");

    if (!grid) return;

    let selectedCategory = "all";

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function renderCards() {
        grid.innerHTML = data.map(function (anime) {
            const genres = Array.isArray(anime.genres) ? anime.genres.join(" • ") : "";
            const category = String(anime.category || "all").toLowerCase();
            const title = escapeHtml(anime.title || "Anime");
            const image = escapeHtml(anime.image || "");
            const rating = escapeHtml(anime.rating || "-");
            const id = encodeURIComponent(anime.id || "");

            return `
                <a href="anime-details.html?id=${id}" class="anime-card-link" data-category="${escapeHtml(category)}">
                    <article class="anime-card" data-category="${escapeHtml(category)}">
                        <div class="poster">
                            <img src="${image}" alt="${title}" onerror="this.style.opacity='0.15'">
                            <div class="rating">★ ${rating}</div>
                            <div class="card-overlay"><span class="view-details">View Episodes</span></div>
                        </div>
                        <div class="anime-info">
                            <h3>${title}</h3>
                            <p>${escapeHtml(genres)}</p>
                        </div>
                    </article>
                </a>
            `;
        }).join("");

        applyFilters();
    }

    function applyFilters() {
        const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
        const links = Array.from(grid.querySelectorAll(".anime-card-link"));

        links.forEach(function (link) {
            const category = String(link.dataset.category || "").toLowerCase();
            const text = (link.textContent || "").toLowerCase();
            const categoryMatches = selectedCategory === "all" || selectedCategory === category;
            const searchMatches = !query || text.includes(query) || category.includes(query);
            link.classList.toggle("search-hidden", !(categoryMatches && searchMatches));
        });
    }

    categoryButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            categoryButtons.forEach(function (btn) {
                btn.classList.remove("active");
            });
            button.classList.add("active");
            selectedCategory = String(button.dataset.category || "all").toLowerCase();
            applyFilters();
        });
    });

    if (searchInput) {
        searchInput.addEventListener("input", applyFilters);
        searchInput.addEventListener("search", applyFilters);
    }

    renderCards();
})();
