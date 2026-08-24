/* =========================================================
   THE EVERYTHING - SHARED ACCOUNT MENU

   Works with:
   anime.html
   films.html
   wallpaper.html

   Account button is fixed at top-left
   and does NOT modify the page header.
========================================================= */

(function () {

    /* =====================================================
       SUPABASE SETTINGS
    ===================================================== */

    const SUPABASE_URL =
        "https://tnavsfbolastevebukxl.supabase.co";


    const SUPABASE_KEY =
        "sb_publishable_3FX_mPM-A6dIY-nQTtFZQg_5HPoWO9B";



    let sharedSupabaseClient = null;



    /* =====================================================
       LOAD SUPABASE LIBRARY
    ===================================================== */

    function loadSupabaseLibrary() {

        return new Promise((resolve, reject) => {

            /*
                If Supabase already exists
                on the page, use it.
            */

            if (window.supabase) {

                resolve();

                return;

            }



            const script =
                document.createElement("script");


            script.src =
                "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";


            script.onload =
                function () {

                    resolve();

                };


            script.onerror =
                function () {

                    reject(

                        new Error(
                            "Could not load Supabase."
                        )

                    );

                };


            document.head.appendChild(
                script
            );

        });

    }



    /* =====================================================
       CREATE CSS
    ===================================================== */

    function createAccountStyles() {

        if (
            document.getElementById(
                "sharedAccountMenuStyles"
            )
        ) {

            return;

        }



        const style =
            document.createElement("style");


        style.id =
            "sharedAccountMenuStyles";


        style.textContent = `

            /* =============================================
               ACCOUNT CONTAINER
            ============================================= */

            .shared-account-menu {

                position: fixed;

                top: 17px;

                left: 22px;

                display: flex;

                align-items: center;

                justify-content: center;

                z-index: 999999;

                font-family:
                    Arial,
                    Helvetica,
                    sans-serif;

            }



            /* =============================================
               AVATAR BUTTON
            ============================================= */

            .shared-avatar-button {

                width: 44px;

                height: 44px;

                display: none;

                align-items: center;

                justify-content: center;

                padding: 0;

                overflow: hidden;

                border-radius: 50%;

                cursor: pointer;

                border:
                    2px solid
                    rgba(102,223,197,0.42);

                outline: none;

                background:
                    rgba(8,12,18,0.92);

                box-shadow:
                    0 8px 25px
                    rgba(0,0,0,0.35),
                    0 0 22px
                    rgba(66,239,184,0.12);

                transition:
                    transform 0.2s ease,
                    border-color 0.2s ease,
                    box-shadow 0.2s ease;

            }


            .shared-avatar-button:hover {

                transform:
                    translateY(-2px);

                border-color:
                    #66dfc5;

                box-shadow:
                    0 10px 30px
                    rgba(0,0,0,0.40),
                    0 0 28px
                    rgba(66,239,184,0.22);

            }



            .shared-avatar-image {

                width: 100%;

                height: 100%;

                display: none;

                object-fit: cover;

            }



            .shared-avatar-placeholder {

                width: 100%;

                height: 100%;

                display: flex;

                align-items: center;

                justify-content: center;

                font-size: 20px;

                background:
                    linear-gradient(
                        135deg,
                        rgba(124,58,237,0.45),
                        rgba(32,201,187,0.40)
                    );

            }



            /* =============================================
               LOGIN BUTTON
            ============================================= */

            .shared-login-button {

                display: none;

                align-items: center;

                justify-content: center;

                min-height: 42px;

                padding:
                    0 17px;

                border-radius: 11px;

                color:
                    #72e7db;

                text-decoration: none;

                font-size: 12px;

                font-weight: 800;

                border:
                    1px solid
                    rgba(32,201,187,0.30);

                background:
                    rgba(7,13,18,0.93);

                box-shadow:
                    0 8px 25px
                    rgba(0,0,0,0.30);

                transition:
                    transform 0.2s ease,
                    background 0.2s ease,
                    border-color 0.2s ease;

            }


            .shared-login-button:hover {

                transform:
                    translateY(-2px);

                background:
                    rgba(32,201,187,0.14);

                border-color:
                    rgba(32,201,187,0.60);

            }



            /* =============================================
               DROPDOWN
            ============================================= */

            .shared-account-dropdown {

                position: absolute;

                top:
                    calc(100% + 12px);

                left: 0;

                width: 235px;

                padding: 10px;

                visibility: hidden;

                opacity: 0;

                transform:
                    translateY(-8px)
                    scale(0.98);

                transform-origin:
                    top left;

                pointer-events: none;

                border-radius: 16px;

                background:
                    rgba(8,11,18,0.98);

                border:
                    1px solid
                    rgba(255,255,255,0.10);

                box-shadow:
                    0 24px 65px
                    rgba(0,0,0,0.55);

                backdrop-filter:
                    blur(22px);

                -webkit-backdrop-filter:
                    blur(22px);

                transition:
                    opacity 0.2s ease,
                    transform 0.2s ease,
                    visibility 0.2s ease;

            }


            .shared-account-dropdown.show {

                visibility: visible;

                opacity: 1;

                transform:
                    translateY(0)
                    scale(1);

                pointer-events: auto;

            }



            /* =============================================
               USER INFO
            ============================================= */

            .shared-user-info {

                display: flex;

                align-items: center;

                gap: 11px;

                padding:
                    10px 9px
                    14px;

                margin-bottom: 6px;

                border-bottom:
                    1px solid
                    rgba(255,255,255,0.07);

            }



            .shared-dropdown-avatar {

                width: 42px;

                height: 42px;

                flex:
                    0 0 auto;

                display: flex;

                align-items: center;

                justify-content: center;

                overflow: hidden;

                border-radius: 50%;

                background:
                    linear-gradient(
                        135deg,
                        rgba(124,58,237,0.35),
                        rgba(32,201,187,0.35)
                    );

                border:
                    1px solid
                    rgba(255,255,255,0.10);

            }


            .shared-dropdown-avatar img {

                width: 100%;

                height: 100%;

                display: none;

                object-fit: cover;

            }


            .shared-dropdown-placeholder {

                font-size: 18px;

            }



            .shared-user-text {

                min-width: 0;

            }


            .shared-username {

                display: block;

                max-width: 150px;

                color: white;

                font-size: 13px;

                font-weight: 800;

                white-space: nowrap;

                overflow: hidden;

                text-overflow: ellipsis;

            }


            .shared-email {

                display: block;

                max-width: 150px;

                margin-top: 3px;

                color:
                    #707988;

                font-size: 10px;

                white-space: nowrap;

                overflow: hidden;

                text-overflow: ellipsis;

            }



            /* =============================================
               MENU OPTIONS
            ============================================= */

            .shared-account-option {

                width: 100%;

                min-height: 43px;

                display: flex;

                align-items: center;

                gap: 11px;

                padding:
                    0 12px;

                border: none;

                border-radius: 10px;

                cursor: pointer;

                color:
                    #aeb6c3;

                background:
                    transparent;

                text-decoration: none;

                font-family:
                    Arial,
                    Helvetica,
                    sans-serif;

                font-size: 12px;

                font-weight: 700;

                text-align: left;

                transition:
                    color 0.2s ease,
                    background 0.2s ease;

            }


            .shared-account-option:hover {

                color: white;

                background:
                    rgba(255,255,255,0.06);

            }



            .shared-option-icon {

                width: 22px;

                display: flex;

                align-items: center;

                justify-content: center;

                font-size: 15px;

            }



            .shared-logout {

                color:
                    #dd8d94;

            }


            .shared-logout:hover {

                color:
                    #ffadb3;

                background:
                    rgba(255,82,99,0.08);

            }



            /* =============================================
               MOBILE
            ============================================= */

            @media (max-width: 650px) {

                .shared-account-menu {

                    top: 12px;

                    left: 12px;

                }


                .shared-avatar-button {

                    width: 40px;

                    height: 40px;

                }


                .shared-account-dropdown {

                    width: 220px;

                }

            }

        `;


        document.head.appendChild(
            style
        );

    }



    /* =====================================================
       CREATE HTML
    ===================================================== */

    function createAccountMenu() {

        const account =
            document.createElement(
                "div"
            );


        account.className =
            "shared-account-menu";


        account.id =
            "sharedAccountMenu";


        account.innerHTML = `

            <!-- LOGIN -->

            <a
                href="login.html"
                class="shared-login-button"
                id="sharedLoginButton"
            >
                Login
            </a>


            <!-- AVATAR -->

            <button
                type="button"
                class="shared-avatar-button"
                id="sharedAvatarButton"
                aria-label="Open account menu"
                aria-expanded="false"
            >

                <img
                    src=""
                    alt="Profile"
                    class="shared-avatar-image"
                    id="sharedAvatarImage"
                >

                <span
                    class="shared-avatar-placeholder"
                    id="sharedAvatarPlaceholder"
                >
                    👤
                </span>

            </button>


            <!-- ACCOUNT MENU -->

            <div
                class="shared-account-dropdown"
                id="sharedAccountDropdown"
            >


                <!-- USER INFO -->

                <div class="shared-user-info">


                    <div class="shared-dropdown-avatar">

                        <img
                            src=""
                            alt="Profile"
                            id="sharedDropdownAvatar"
                        >

                        <span
                            class="shared-dropdown-placeholder"
                            id="sharedDropdownPlaceholder"
                        >
                            👤
                        </span>

                    </div>


                    <div class="shared-user-text">

                        <span
                            class="shared-username"
                            id="sharedUsername"
                        >
                            User
                        </span>


                        <span
                            class="shared-email"
                            id="sharedEmail"
                        >
                        </span>

                    </div>

                </div>



              <!-- PROFILE -->

<a
    href="profile.html"
    class="shared-account-option"
>

    <span class="shared-option-icon">
        👤
    </span>

    Profile

</a>



<!-- MY WALLPAPERS -->

<a
    href="my-wallpapers.html"
    class="shared-account-option"
>

    <span class="shared-option-icon">
        🖼️
    </span>

    My Wallpapers

</a>




                <!-- SETTINGS -->

                <a
                    href="settings.html"
                    class="shared-account-option"
                >

                    <span class="shared-option-icon">
                        ⚙️
                    </span>

                    Settings

                </a>



                <!-- LOGOUT -->

                <button
                    type="button"
                    class="shared-account-option shared-logout"
                    id="sharedLogoutButton"
                >

                    <span class="shared-option-icon">
                        ↪
                    </span>

                    Logout

                </button>


            </div>

       `;

const currentPage =
    window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();

if (currentPage !== "wallpaper.html") {

    const myWallpapersLink =
        account.querySelector(
            'a[href="my-wallpapers.html"]'
        );

    if (myWallpapersLink) {
        myWallpapersLink.remove();
    }

}

return account;


    }



    /* =====================================================
       PLACE ACCOUNT MENU
       IMPORTANT:
       DON'T TOUCH PAGE HEADER
    ===================================================== */

    function placeAccountMenu(
        account
    ) {

        /*
            Put it directly inside body.

            It uses position: fixed,
            so it will always stay
            at the top-left of the screen.

            This prevents it from entering
            the Anime / Films hero sections.
        */

        document.body.appendChild(
            account
        );

    }



    /* =====================================================
       GET ELEMENTS
    ===================================================== */

    function getElements() {

        return {

            loginButton:
                document.getElementById(
                    "sharedLoginButton"
                ),


            avatarButton:
                document.getElementById(
                    "sharedAvatarButton"
                ),


            avatarImage:
                document.getElementById(
                    "sharedAvatarImage"
                ),


            avatarPlaceholder:
                document.getElementById(
                    "sharedAvatarPlaceholder"
                ),


            dropdown:
                document.getElementById(
                    "sharedAccountDropdown"
                ),


            dropdownAvatar:
                document.getElementById(
                    "sharedDropdownAvatar"
                ),


            dropdownPlaceholder:
                document.getElementById(
                    "sharedDropdownPlaceholder"
                ),


            username:
                document.getElementById(
                    "sharedUsername"
                ),


            email:
                document.getElementById(
                    "sharedEmail"
                ),


            logoutButton:
                document.getElementById(
                    "sharedLogoutButton"
                ),


            account:
                document.getElementById(
                    "sharedAccountMenu"
                )

        };

    }



    /* =====================================================
       SET AVATAR
    ===================================================== */

    function resolveSharedAvatarUrl(
        avatarUrl
    ) {

        const cleanValue =
            typeof avatarUrl === "string"
                ? avatarUrl.trim()
                : "";


        if (!cleanValue) {
            return null;
        }


        if (
            cleanValue.startsWith("http://")
            ||
            cleanValue.startsWith("https://")
        ) {

            return cleanValue;

        }


        const {
            data
        } =
            sharedSupabaseClient
                .storage
                .from("avatars")
                .getPublicUrl(
                    cleanValue
                );


        return data?.publicUrl
            ||
            null;

    }


    function setAvatar(
        elements,
        avatarUrl
    ) {

        const resolvedAvatarUrl =
            resolveSharedAvatarUrl(
                avatarUrl
            );


        if (
            resolvedAvatarUrl
        ) {

            /*
                HEADER / FLOATING AVATAR
            */

            elements.avatarImage.src =
                resolvedAvatarUrl;


            elements.avatarImage.style.display =
                "block";


            elements.avatarPlaceholder.style.display =
                "none";



            /*
                DROPDOWN AVATAR
            */

            elements.dropdownAvatar.src =
                resolvedAvatarUrl;


            elements.dropdownAvatar.style.display =
                "block";


            elements.dropdownPlaceholder.style.display =
                "none";


            return;

        }



        /*
            NO AVATAR
        */

        elements.avatarImage.style.display =
            "none";


        elements.avatarImage.removeAttribute(
            "src"
        );


        elements.avatarPlaceholder.style.display =
            "flex";



        elements.dropdownAvatar.style.display =
            "none";


        elements.dropdownAvatar.removeAttribute(
            "src"
        );


        elements.dropdownPlaceholder.style.display =
            "block";

    }



    /* =====================================================
       SHOW LOGGED OUT
    ===================================================== */

    function showLoggedOut(
        elements
    ) {

        elements.avatarButton.style.display =
            "none";


        elements.loginButton.style.display =
            "inline-flex";


        elements.dropdown.classList.remove(
            "show"
        );


        elements.avatarButton.setAttribute(
            "aria-expanded",
            "false"
        );

    }



    /* =====================================================
       SHOW LOGGED IN
    ===================================================== */

    function showLoggedIn(
        elements
    ) {

        elements.loginButton.style.display =
            "none";


        elements.avatarButton.style.display =
            "flex";

    }



    /* =====================================================
       LOAD USER ACCOUNT
    ===================================================== */

    async function loadAccount(
        elements
    ) {

        const {
            data: {
                session
            },
            error
        } =
            await sharedSupabaseClient
                .auth
                .getSession();



        if (
            error
        ) {

            console.error(
                "Account session error:",
                error
            );

        }



        /* =================================
           NOT LOGGED IN
        ================================= */

        if (
            !session
            ||
            !session.user
        ) {

            showLoggedOut(
                elements
            );


            return;

        }



        const user =
            session.user;



        showLoggedIn(
            elements
        );



        /* =================================
           EMAIL
        ================================= */

        elements.email.textContent =
            user.email || "";



        /* =================================
           PROFILE
        ================================= */

        const {
            data: profile,
            error: profileError
        } =
            await sharedSupabaseClient

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



        /* =================================
           USERNAME
        ================================= */

        const username =

            profile?.username

            ||

            user.user_metadata
                ?.username

            ||

            "User";



        elements.username.textContent =
            username;



        /* =================================
           AVATAR
        ================================= */

        setAvatar(

            elements,

            profile?.avatar_url
            ||
            null

        );

    }



    /* =====================================================
       CLOSE MENU
    ===================================================== */

    function closeAccountMenu(
        elements
    ) {

        elements.dropdown
            .classList
            .remove(
                "show"
            );


        elements.avatarButton
            .setAttribute(
                "aria-expanded",
                "false"
            );

    }



    /* =====================================================
       MENU EVENTS
    ===================================================== */

    function setupMenuEvents(
        elements
    ) {

        /* =================================
           OPEN / CLOSE MENU
        ================================= */

        elements.avatarButton
            .addEventListener(

                "click",

                function(event) {

                    event.stopPropagation();



                    const open =
                        elements.dropdown

                            .classList

                            .toggle(
                                "show"
                            );



                    elements.avatarButton
                        .setAttribute(

                            "aria-expanded",

                            open
                                ? "true"
                                : "false"

                        );

                }

            );



        /* =================================
           CLICK INSIDE DROPDOWN
        ================================= */

        elements.dropdown
            .addEventListener(

                "click",

                function(event) {

                    event.stopPropagation();

                }

            );



        /* =================================
           CLICK OUTSIDE
        ================================= */

        document.addEventListener(

            "click",

            function(event) {

                if (
                    !elements.account.contains(
                        event.target
                    )
                ) {

                    closeAccountMenu(
                        elements
                    );

                }

            }

        );



        /* =================================
           ESCAPE
        ================================= */

        document.addEventListener(

            "keydown",

            function(event) {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeAccountMenu(
                        elements
                    );

                }

            }

        );



        /* =================================
           LOGOUT
        ================================= */

        elements.logoutButton
            .addEventListener(

                "click",

                async function() {

                    elements.logoutButton.disabled =
                        true;


                    elements.logoutButton.textContent =
                        "Logging out...";



                    const {
                        error
                    } =
                        await sharedSupabaseClient

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


                        elements.logoutButton.disabled =
                            false;


                        elements.logoutButton.innerHTML =
                            `
                                <span class="shared-option-icon">
                                    ↪
                                </span>

                                Logout
                            `;


                        return;

                    }



                    window.location.href =
                        "index.html";

                }

            );

    }



    /* =====================================================
       WATCH AUTH CHANGES
    ===================================================== */

    function watchAuth(
        elements
    ) {

        sharedSupabaseClient

            .auth

            .onAuthStateChange(

                function(
                    event
                ) {

                    setTimeout(

                        function() {

                            /* =============================
                               LOGOUT
                            ============================= */

                            if (
                                event ===
                                "SIGNED_OUT"
                            ) {

                                showLoggedOut(
                                    elements
                                );

                            }



                            /* =============================
                               LOGIN / PROFILE UPDATE
                            ============================= */

                            if (
                                event ===
                                "SIGNED_IN"
                                ||
                                event ===
                                "USER_UPDATED"
                            ) {

                                loadAccount(
                                    elements
                                );

                            }

                        },

                        0

                    );

                }

            );

    }



    /* =====================================================
       START
    ===================================================== */

    async function startAccountMenu() {

        /*
            Prevent duplicate account menu.
        */

        if (
            document.getElementById(
                "sharedAccountMenu"
            )
        ) {

            return;

        }



        try {


            /* =================================
               LOAD SUPABASE
            ================================= */

            await loadSupabaseLibrary();



            /* =================================
               CLIENT
            ================================= */

            sharedSupabaseClient =
                window.supabase
                    .createClient(

                        SUPABASE_URL,

                        SUPABASE_KEY

                    );



            /* =================================
               CSS
            ================================= */

            createAccountStyles();



            /* =================================
               HTML
            ================================= */

            const account =
                createAccountMenu();



            placeAccountMenu(
                account
            );



            /* =================================
               ELEMENTS
            ================================= */

            const elements =
                getElements();



            /* =================================
               EVENTS
            ================================= */

            setupMenuEvents(
                elements
            );



            /* =================================
               AUTH WATCH
            ================================= */

            watchAuth(
                elements
            );



            /* =================================
               FIRST LOAD
            ================================= */

            await loadAccount(
                elements
            );

        }

        catch(
            error
        ) {

            console.error(
                "Account menu error:",
                error
            );

        }

    }



    /* =====================================================
       START WHEN PAGE IS READY
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(

            "DOMContentLoaded",

            startAccountMenu

        );

    }

    else {

        startAccountMenu();

    }

})();