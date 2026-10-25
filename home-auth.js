/* Preserved original home Supabase auth, profile menu, and admin permissions. */
(function(){
if (!window.supabase){console.warn("Supabase library unavailable; sign-in menu uses fallback.");return;}


        /* =================================================
           SUPABASE SETTINGS
        ================================================= */

        const SUPABASE_URL =
            "https://tnavsfbolastevebukxl.supabase.co";


        const SUPABASE_KEY =
            "sb_publishable_3FX_mPM-A6dIY-nQTtFZQg_5HPoWO9B";


        const supabaseClient =
            supabase.createClient(
                SUPABASE_URL,
                SUPABASE_KEY
            );



        /* =================================================
           ACCOUNT ELEMENTS
        ================================================= */

        const headerLoginButton =
            document.getElementById(
                "headerLoginButton"
            );


        const accountAvatarButton =
            document.getElementById(
                "accountAvatarButton"
            );


        const headerAvatarImage =
            document.getElementById(
                "headerAvatarImage"
            );


        const headerAvatarPlaceholder =
            document.getElementById(
                "headerAvatarPlaceholder"
            );


        const accountDropdown =
            document.getElementById(
                "accountDropdown"
            );


        const dropdownAvatarImage =
            document.getElementById(
                "dropdownAvatarImage"
            );


        const dropdownAvatarPlaceholder =
            document.getElementById(
                "dropdownAvatarPlaceholder"
            );


        const accountUsername =
            document.getElementById(
                "accountUsername"
            );


        const accountEmail =
            document.getElementById(
                "accountEmail"
            );


        const logoutButton =
            document.getElementById(
                "logoutButton"
            );


        const accountArea =
            document.getElementById(
                "accountArea"
            );



        /* =================================================
           SHOW AVATAR
        ================================================= */

        function setAccountAvatar(
            avatarUrl
        ) {

            if (
                avatarUrl
            ) {

                headerAvatarImage.src =
                    avatarUrl;


                headerAvatarImage.style.display =
                    "block";


                headerAvatarPlaceholder.style.display =
                    "none";



                dropdownAvatarImage.src =
                    avatarUrl;


                dropdownAvatarImage.style.display =
                    "block";


                dropdownAvatarPlaceholder.style.display =
                    "none";

            }

            else {

                headerAvatarImage.removeAttribute(
                    "src"
                );


                headerAvatarImage.style.display =
                    "none";


                headerAvatarPlaceholder.style.display =
                    "flex";



                dropdownAvatarImage.removeAttribute(
                    "src"
                );


                dropdownAvatarImage.style.display =
                    "none";


                dropdownAvatarPlaceholder.style.display =
                    "block";

            }

        }



        /* =================================================
           SHOW LOGGED OUT
        ================================================= */

        function showLoggedOut() {

            accountAvatarButton.style.display =
                "none";


            accountDropdown.classList.remove(
                "show"
            );


            headerLoginButton.style.display =
                "inline-flex";


            accountAvatarButton.setAttribute(
                "aria-expanded",
                "false"
            );

        }



        /* =================================================
           SHOW LOGGED IN
        ================================================= */

        function showLoggedIn() {

            headerLoginButton.style.display =
                "none";


            accountAvatarButton.style.display =
                "flex";

        }



        /* =================================================
           LOAD ACCOUNT
        ================================================= */

        async function loadAccount() {

            /*
                Get current browser session.
            */

            const {
                data: {
                    session
                },
                error: sessionError
            } =
                await supabaseClient
                    .auth
                    .getSession();



            if (
                sessionError
            ) {

                console.error(
                    "Session error:",
                    sessionError
                );

            }



            /*
                No login
            */

            if (
                !session
                ||
                !session.user
            ) {

                showLoggedOut();

                return;

            }



            const user =
                session.user;



            showLoggedIn();



            /*
                Email
            */

            accountEmail.textContent =
                user.email || "";



            /*
                Get profile from profiles table.
            */

            const {
                data: profile,
                error: profileError
            } =
                await supabaseClient

                    .from(
                        "profiles"
                    )

                    .select(
                        "username, avatar_url"
                    )

                    .eq(
                        "id",
                        user.id
                    )

                    .maybeSingle();



            if (
                profileError
            ) {

                console.error(
                    "Profile error:",
                    profileError
                );

            }



            /*
                Username fallback
            */

            const username =

                profile?.username

                ||

                user.user_metadata
                    ?.username

                ||

                "User";



            accountUsername.textContent =
                username;



            /*
                Avatar
            */

            setAccountAvatar(
                profile?.avatar_url || null
            );

        }



        /* =================================================
           OPEN / CLOSE DROPDOWN
        ================================================= */

        accountAvatarButton.addEventListener(

            "click",

            function(
                event
            ) {

                event.stopPropagation();


                const isOpen =
                    accountDropdown
                        .classList
                        .toggle(
                            "show"
                        );


                accountAvatarButton
                    .setAttribute(

                        "aria-expanded",

                        isOpen
                            ? "true"
                            : "false"

                    );

            }

        );



        /* =================================================
           CLICK OUTSIDE
        ================================================= */

        document.addEventListener(

            "click",

            function(
                event
            ) {

                if (
                    !accountArea.contains(
                        event.target
                    )
                ) {

                    accountDropdown
                        .classList
                        .remove(
                            "show"
                        );


                    accountAvatarButton
                        .setAttribute(
                            "aria-expanded",
                            "false"
                        );

                }

            }

        );



        /* =================================================
           ESCAPE
        ================================================= */

        document.addEventListener(

            "keydown",

            function(
                event
            ) {

                if (
                    event.key ===
                    "Escape"
                ) {

                    accountDropdown
                        .classList
                        .remove(
                            "show"
                        );


                    accountAvatarButton
                        .setAttribute(
                            "aria-expanded",
                            "false"
                        );

                }

            }

        );



        /* =================================================
           LOGOUT
        ================================================= */

        logoutButton.addEventListener(

            "click",

            async function() {

                logoutButton.disabled =
                    true;


                logoutButton.textContent =
                    "Logging out...";


                const {
                    error
                } =
                    await supabaseClient
                        .auth
                        .signOut({

                            scope:
                                "local"

                        });



                if (
                    error
                ) {

                    console.error(
                        "Logout error:",
                        error
                    );


                    logoutButton.disabled =
                        false;


                    logoutButton.innerHTML =

                        '<span class="account-option-icon">↪</span> Logout';


                    return;

                }



                window.location.href =
                    "index.html";

            }

        );



        /* =================================================
           AUTH CHANGES
        ================================================= */

        supabaseClient
            .auth
            .onAuthStateChange(

                function(
                    event,
                    session
                ) {

                    if (
                        event ===
                        "SIGNED_OUT"
                    ) {

                        showLoggedOut();

                    }

                }

            );



        /* =================================================
           START
        ================================================= */

        loadAccount();

    

(function () {
    let generation = 0;
    async function refreshAdminLink() {
        const current = ++generation;
        const link = document.getElementById('homeAdminLink');
        link.style.display = 'none';
        try {
            const result = await supabaseClient.rpc('site_is_admin');
            if (current === generation && !result.error && result.data === true) link.style.display = 'flex';
        } catch (_) {}
    }
    supabaseClient.auth.onAuthStateChange(() => setTimeout(refreshAdminLink, 0));
    refreshAdminLink();
})();

})();
