(async function () {
    await window.ANIME_READY;
    const data = Array.isArray(window.ANIME_DATA) ? window.ANIME_DATA : [];
    const grid = document.getElementById("animeGrid");
    const searchInput = document.getElementById("animeSearch");
    const genresToggle = document.getElementById("genresToggle");
    const genreMenu = document.getElementById("genreMenu");
    const genreList = document.getElementById("genreList");
    const genresBackdrop = document.getElementById("genresBackdrop");
    const quickGenres = document.getElementById("teQuickGenres");
    const sortInput = document.getElementById("teAnimeSort");
    const resultsText = document.getElementById("teAnimeResults");
    const searchClear = document.getElementById("teSearchClear");
    const allGenresButton = document.getElementById("teMoreGenres");
    const resetButton = document.getElementById("teClearFilters");

    if (!grid) return;

    /* Full, practical anime genre/theme list for this site. New genres found in
       anime-data.js are automatically merged in too, so the menu stays complete. */
    const genreCatalog = [
        "Action",
        "Adventure",
        "Comedy",
        "Drama",
        "Ecchi",
        "Fantasy",
        "Horror",
        "Mystery",
        "Psychological",
        "Romance",
        "Sci-Fi",
        "Slice of Life",
        "Sports",
        "Supernatural",
        "Thriller",
        "Suspense",
        "Historical",
        "Isekai",
        "Magic",
        "Martial Arts",
        "Mecha",
        "Military",
        "Music",
        "School",
        "Samurai",
        "Space",
        "Super Power",
        "Vampire",
        "Demons",
        "Game",
        "Harem",
        "Parody",
        "Shounen",
        "Shoujo",
        "Seinen",
        "Josei",
        "Kids",
        "Avant Garde",
        "Award Winning",
        "Boys Love",
        "Girls Love",
        "Gourmet",
        "Adult Cast",
        "Anthropomorphic",
        "CGDCT",
        "Childcare",
        "Combat Sports",
        "Crossdressing",
        "Delinquents",
        "Detective",
        "Educational",
        "Gag Humor",
        "Gore",
        "High Stakes Game",
        "Idols",
        "Iyashikei",
        "Love Polygon",
        "Magical Girl",
        "Medical",
        "Mythology",
        "Organized Crime",
        "Otaku Culture",
        "Performing Arts",
        "Pets",
        "Racing",
        "Reincarnation",
        "Reverse Harem",
        "Romantic Subtext",
        "Showbiz",
        "Strategy Game",
        "Survival",
        "Team Sports",
        "Time Travel",
        "Video Game",
        "Visual Arts",
        "Workplace"
    ];

    let selectedCategory = "all";
    let menuOpen = false;

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function normalizeGenre(value) {
        return String(value || "")
            .trim()
            .toLowerCase()
            .replace(/&/g, "and")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function getGenreLabels() {
        const labels = new Map();

        // Show only genres actually represented in the user's anime catalog.
        // A long empty list made discovery unnecessarily difficult.

        data.forEach(function (anime) {
            if (anime.category && normalizeGenre(anime.category) !== "all") {
                const raw = String(anime.category).trim();
                const pretty = raw.replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
                labels.set(normalizeGenre(raw), pretty);
            }

            (Array.isArray(anime.genres) ? anime.genres : []).forEach(function (genre) {
                labels.set(normalizeGenre(genre), String(genre));
            });
        });

        return Array.from(labels.entries()).map(function ([key, label]) {
            return { key: key, label: label };
        });
    }

    function buildGenreMenu() {
        if (!genreList) return;

        const allItem = { key: "all", label: "All Anime" };
        const items = [allItem].concat(getGenreLabels());

        genreList.innerHTML = items.map(function (item) {
            const active = item.key === selectedCategory;
            return `
                <button
                    class="category${active ? " active" : ""}"
                    type="button"
                    data-category="${escapeHtml(item.key)}"
                    aria-pressed="${active ? "true" : "false"}"
                >
                    <span class="genre-item-icon" aria-hidden="true"></span>
                    <span class="genre-item-label">${escapeHtml(item.label)}</span>
                </button>
            `;
        }).join("");
    }

    function setGenreMenu(open) {
        if (!genreMenu || !genresToggle) return;

        menuOpen = Boolean(open);
        genreMenu.classList.toggle("is-open", menuOpen);
        genreMenu.setAttribute("aria-hidden", String(!menuOpen));
        genresToggle.classList.toggle("is-open", menuOpen);
        genresToggle.setAttribute("aria-expanded", String(menuOpen));
        genresToggle.setAttribute("aria-label", menuOpen ? "Close anime genres" : "Open anime genres");
        document.body.classList.toggle("genre-drawer-open", menuOpen);
        if (allGenresButton) allGenresButton.setAttribute("aria-expanded", String(menuOpen));

        if (genresBackdrop) {
            genresBackdrop.classList.toggle("is-open", menuOpen);
            genresBackdrop.setAttribute("aria-hidden", String(!menuOpen));
        }
    }

    function renderCards() {
        const sorted = data.slice();
        const direction = sortInput ? sortInput.value : 'newest';
        if (direction === 'az') sorted.sort((a,b) => String(a.title||'').localeCompare(String(b.title||'')));
        else if (direction === 'za') sorted.sort((a,b) => String(b.title||'').localeCompare(String(a.title||'')));
        else if (direction === 'rating') sorted.sort((a,b) => Number(b.rating||b.score||0)-Number(a.rating||a.score||0));
        else sorted.sort((a,b) => String(b.created_at||'').localeCompare(String(a.created_at||'')));
        grid.innerHTML = sorted.map(function (anime) {
            const genresArray = Array.isArray(anime.genres) ? anime.genres : [];
            const genres = genresArray.join(" • ");
            const normalizedGenres = genresArray.map(normalizeGenre).filter(Boolean);
            const normalizedCategory = normalizeGenre(anime.category || "all");

            if (normalizedCategory && normalizedCategory !== "all" && !normalizedGenres.includes(normalizedCategory)) {
                normalizedGenres.push(normalizedCategory);
            }

            const title = escapeHtml(anime.title || "Anime");
            const image = escapeHtml(anime.image || "");
            const ageRating = escapeHtml(anime.age_rating || "Not rated");
            const id = encodeURIComponent(anime.id || "");

            return `
                <a
                    href="anime-details.html?id=${id}"
                    class="anime-card-link"
                    data-genres="${escapeHtml(normalizedGenres.join("|"))}"
                >
                    <article class="anime-card">
                        <div class="poster">
                            <img src="${image}" alt="${title}" onerror="this.style.opacity='0.15'">
                            <div class="rating age-classification" aria-label="Age rating: ${ageRating}">${ageRating}</div>
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

    function getSelectedLabel() {
        if (selectedCategory === "all") return "All Anime";
        const button = genreList && genreList.querySelector(`.category[data-category="${CSS.escape(selectedCategory)}"]`);
        return button ? button.textContent.trim() : selectedCategory;
    }

    function showEmptyState(show, message) {
        let empty = document.getElementById("animeEmptyState");

        if (!empty) {
            empty = document.createElement("div");
            empty.id = "animeEmptyState";
            empty.className = "anime-empty-state";
            empty.setAttribute("role", "status");
            grid.insertAdjacentElement("afterend", empty);
        }

        empty.textContent = message || "No anime found.";
        empty.hidden = !show;
    }

    function applyFilters() {
        const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
        const links = Array.from(grid.querySelectorAll(".anime-card-link"));
        let visibleCount = 0;

        links.forEach(function (link) {
            const genres = String(link.dataset.genres || "")
                .split("|")
                .map(function (value) { return value.trim(); })
                .filter(Boolean);
            const text = (link.textContent || "").toLowerCase();
            const categoryMatches = selectedCategory === "all" || genres.includes(selectedCategory);
            const searchMatches = !query || text.includes(query) || genres.some(function (genre) {
                return genre.includes(normalizeGenre(query));
            });
            const show = categoryMatches && searchMatches;

            link.classList.toggle("search-hidden", !show);
            if (show) visibleCount += 1;
        });

        if (resultsText) resultsText.textContent = visibleCount + (visibleCount === 1 ? ' anime found' : ' anime found');
        if (searchClear) searchClear.hidden = !Boolean(searchInput && searchInput.value);
        if (visibleCount === 0) {
            const message = query
                ? "No anime matched your search."
                : `No anime has been added to ${getSelectedLabel()} yet.`;
            showEmptyState(true, message);
        } else {
            showEmptyState(false);
        }
    }

    function selectGenre(button) {
        if (!button) return;

        const buttons = Array.from(genreList.querySelectorAll(".category"));
        buttons.forEach(function (btn) {
            btn.classList.remove("active");
            btn.setAttribute("aria-pressed", "false");
        });

        button.classList.add("active");
        button.setAttribute("aria-pressed", "true");
        selectedCategory = String(button.dataset.category || "all");
        syncQuickGenres();
        applyFilters();
        setGenreMenu(false);
    }

    buildGenreMenu();

    function syncQuickGenres() {
        if (!quickGenres) return;
        quickGenres.querySelectorAll('[data-quick-genre]').forEach(btn => {
            const isActive = btn.dataset.quickGenre === selectedCategory;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', String(isActive));
        });
    }

    function buildQuickGenres() {
        if (!quickGenres) return;
        const activeGenres = new Map();
        data.forEach(anime => {
            (Array.isArray(anime.genres) ? anime.genres : []).forEach(genre => {
                const key = normalizeGenre(genre);
                if (!key) return;
                const found = activeGenres.get(key) || { label: String(genre), count: 0 };
                found.count++;
                activeGenres.set(key, found);
            });
        });
        const preferred = ['action','romance','fantasy','adventure','comedy','drama','isekai','school','sci-fi'];
        const featured = [...activeGenres.entries()].sort((a,b) => {
            const ia = preferred.indexOf(a[0]), ib = preferred.indexOf(b[0]);
            return (ia < 0 ? 50 : ia) - (ib < 0 ? 50 : ib) || b[1].count-a[1].count;
        }).slice(0,8);
        const buttons = [{key:'all',label:'All anime'}].concat(featured.map(([key,value])=>({key,label:value.label})));
        quickGenres.replaceChildren(...buttons.map(item => {
            const btn = document.createElement('button');
            btn.type='button'; btn.dataset.quickGenre=item.key;
            btn.textContent=item.label; return btn;
        }));
        syncQuickGenres();
        quickGenres.addEventListener('click', event => {
            const btn=event.target.closest('[data-quick-genre]'); if(!btn) return;
            const item = genreList && Array.from(genreList.querySelectorAll('[data-category]')).find(el => el.dataset.category === btn.dataset.quickGenre);
            if(item) selectGenre(item);
            document.getElementById('animeGrid')?.scrollIntoView({behavior:'smooth',block:'start'});
        });
    }
    buildQuickGenres();

    if (genreList) {
        genreList.addEventListener("click", function (event) {
            const button = event.target.closest(".category");
            if (!button) return;
            selectGenre(button);
        });
    }

    if (allGenresButton && genresToggle) {
        allGenresButton.addEventListener('click', () => setGenreMenu(!menuOpen));
    }
    if (resetButton) resetButton.addEventListener('click', () => {
        if(searchInput) searchInput.value='';
        if(sortInput) sortInput.value='newest';
        const all=genreList && genreList.querySelector('[data-category="all"]');
        if(all) selectGenre(all);
        else {selectedCategory='all';syncQuickGenres();}
        renderCards();
    });
    if (searchClear) searchClear.addEventListener('click', () => {
        searchInput.value=''; applyFilters(); searchInput.focus();
    });
    if (sortInput) sortInput.addEventListener('change', renderCards);

    if (genresToggle && genreMenu) {
        genresToggle.addEventListener("click", function (event) {
            event.stopPropagation();
            setGenreMenu(!menuOpen);
        });

        genreMenu.addEventListener("click", function (event) {
            event.stopPropagation();
        });

        if (genresBackdrop) {
            genresBackdrop.addEventListener("click", function () {
                setGenreMenu(false);
            });
        }

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && menuOpen) {
                setGenreMenu(false);
                (allGenresButton || genresToggle).focus();
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", applyFilters);
        searchInput.addEventListener("search", applyFilters);
    }

    renderCards();
})();
