// ============================================================
// QUICK ANIME DATA
// ============================================================
// To add a new anime fast:
// 1) Put its poster inside: image/anime/
// 2) Copy the example block at the bottom of this file.
// 3) Change id, title, image, category, genres, rating, description.
// 4) Set episodes to any number you want. Example: episodes: 24
//
// You DO NOT need to create a new HTML page for every anime.
// You DO NOT need to type every episode button by hand.
// ============================================================

window.ANIME_DATA = [
    {
        id: "attack-on-titan",
        title: "Attack on Titan",
        image: "image/anime/attack-on-titan.jpg",
        category: "action",
        genres: ["Action", "Drama", "Fantasy"],
        rating: "9.1",
        description: "Humanity lives behind enormous walls while terrifying Titans threaten the world outside. Follow Eren and his companions as they fight to uncover the truth behind the Titans.",

        // Change only this number to create more/fewer episode buttons.
        episodes: 24,

        // Optional: add your own/licensed video links later.
        // Example: 1: "videos/attack-on-titan/episode-1.mp4"
        episodeLinks: {
        }
    }

    /*
    // COPY THIS BLOCK TO ADD ANOTHER ANIME FAST.
    ,{
        id: "second-anime",
        title: "Second Anime",
        image: "image/anime/second-anime.jpg",
        category: "fantasy",
        genres: ["Fantasy", "Adventure"],
        rating: "8.8",
        description: "Write the anime description here.",
        episodes: 12,
        episodeLinks: {
            // 1: "videos/second-anime/episode-1.mp4",
            // 2: "videos/second-anime/episode-2.mp4"
        }
    }
    */
];
