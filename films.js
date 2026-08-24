const genreButtons =
    document.querySelectorAll(".genre");

const filmCards =
    document.querySelectorAll(".film-card");


genreButtons.forEach(button => {

    button.addEventListener("click", () => {

        genreButtons.forEach(btn => {
            btn.classList.remove("active");
        });


        button.classList.add("active");


        const selectedGenre =
            button.dataset.category;


        filmCards.forEach(card => {

            const filmGenre =
                card.dataset.category;


            if (
                selectedGenre === "all" ||
                selectedGenre === filmGenre
            ) {

                card.style.display = "block";

            } else {

                card.style.display = "none";

            }

        });

    });

});