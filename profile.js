"use strict";
(function () {
    const SUPABASE_URL = "https://tnavsfbolastevebukxl.supabase.co";
    const SUPABASE_KEY = "sb_publishable_3FX_mPM-A6dIY-nQTtFZQg_5HPoWO9B";
    const supabaseClient = supabase.createClient( SUPABASE_URL, SUPABASE_KEY );
    const profileAvatar = document.getElementById( "profileAvatar" );
    const profileAvatarPlaceholder = document.getElementById( "profileAvatarPlaceholder" );
    const profileUsername = document.getElementById( "profileUsername" );
    const profileEmail = document.getElementById( "profileEmail" );
    const joinedDate = document.getElementById( "joinedDate" );
    const wallpaperMeta = document.getElementById( "wallpaperMeta" );
    const wallpaperCount = document.getElementById( "wallpaperCount" );
    const memberSince = document.getElementById( "memberSince" );
    const recentGrid = document.getElementById( "recentGrid" );
    const pageMessage = document.getElementById( "pageMessage" );
    const editProfileButton = document.getElementById( "editProfileButton" );
    const editModal = document.getElementById( "editModal" );
    const closeEditButton = document.getElementById( "closeEditButton" );
    const usernameInput = document.getElementById( "username" );
    const emailInput = document.getElementById( "email" );
    const avatarFileInput = document.getElementById( "avatarFile" );
    const editAvatarImage = document.getElementById( "editAvatarImage" );
    const editAvatarPlaceholder = document.getElementById( "editAvatarPlaceholder" );
    const saveButton = document.getElementById( "saveButton" );
    const editMessage = document.getElementById( "editMessage" );
    let currentUser = null;
    let currentUsername = "";
    let currentAvatarUrl = null;
    let selectedAvatar = null;
    let temporaryPreview = null;
    function getInitials( username ) {
        const clean = ( username || "User" ) .trim();
        return clean .split(/\s+/) .filter(Boolean) .slice( 0, 2 ) .map( part => part .charAt(0) .toUpperCase() ) .join("") || "U";
    }
    function formatMonthYear( value ) {
        if (!value) {
            return "—";
        }
        const date = new Date( value );
        if ( Number.isNaN( date.getTime() ) ) {
            return "—";
        }
        return date .toLocaleDateString( undefined, {
            month: "short", year: "numeric" }
            );
        }
        function formatCategory( value ) {
            if (!value) {
                return "Other";
            }
            return value .replace( /[-_]+/g, " " ) .split(" ") .map( word => word .charAt(0) .toUpperCase() + word.slice(1) ) .join(" ");
        }
        function setAvatarElement( image, placeholder, url, username ) {
            if (url) {
                image.src = url;
                image.style.display = "block";
                placeholder.style.display = "none";
                return;
            }
            image.style.display = "none";
            image.removeAttribute( "src" );
            placeholder.style.display = "inline";
            placeholder.textContent = getInitials( username );
        }
        function refreshAvatarDisplays() {
            setAvatarElement( profileAvatar, profileAvatarPlaceholder, currentAvatarUrl, currentUsername );
            setAvatarElement( editAvatarImage, editAvatarPlaceholder, currentAvatarUrl, currentUsername );
        }
        async function loadProfile() {
            pageMessage.textContent = "Loading profile...";
            const {
                data: {
                    session }
                    , error: sessionError }
                    = await supabaseClient .auth .getSession();
                    if ( sessionError ) {
                        console.error( sessionError );
                    }
                    if ( !session || !session.user ) {
                        window.location.href = "login.html";
                        return;
                    }
                    currentUser = session.user;
                    window.initProfileCover(supabaseClient, currentUser).catch(console.error);
                    window.initProfilePageBackground(supabaseClient, currentUser).catch(console.error);
                    const {
                        data: profile, error: profileError }
                        = await supabaseClient .from( "profiles" ) .select( "username, avatar_url" ) .eq( "id", currentUser.id ) .maybeSingle();
                        if ( profileError ) {
                            console.error( "Profile error:", profileError );
                        }
                        currentUsername = profile ?.username || currentUser .user_metadata ?.username || "User";
                        currentAvatarUrl = profile ?.avatar_url || null;
                        profileUsername.textContent = currentUsername;
                        profileEmail.textContent = currentUser.email || "";
                        usernameInput.value = currentUsername;
                        emailInput.value = currentUser.email || "";
                        const joined = formatMonthYear( currentUser.created_at );
                        joinedDate.textContent = "Joined " + joined;
                        memberSince.textContent = joined;
                        refreshAvatarDisplays();
                        await loadWallpapers();
                        pageMessage.textContent = "";
                    }
                    async function loadWallpapers() {
                        recentGrid.innerHTML = ` <div class="empty-recent"> Loading your wallpapers... </div> `;
                        const {
                            data: wallpapers, count, error }
                            = await supabaseClient .from( "wallpapers" ) .select( "id, title, category, file_path, created_at", { count: "exact" } ) .eq( "user_id", currentUser.id ) .order( "created_at", {
                                ascending: false }
                                ).limit(3);
                                if ( error ) {
                                    console.error( "Wallpapers error:", error );
                                    wallpaperCount.textContent = "—";
                                    wallpaperMeta.textContent = "Wallpapers unavailable";
                                    recentGrid.innerHTML = ` <div class="empty-recent"> Could not load your wallpapers. </div> `;
                                    return;
                                }
                                const total = count ?? wallpapers?.length ?? 0;
                                wallpaperCount.textContent = total;
                                wallpaperMeta.textContent = total;
                                if ( total === 0 ) {
                                    recentGrid.innerHTML = ` <div class="empty-recent"> You haven't uploaded any wallpapers yet. </div> `;
                                    return;
                                }
                                recentGrid.innerHTML = "";
                                wallpapers .slice( 0, 3 ) .forEach( wallpaper => {
                                    const {
                                        data: publicUrlData }
                                        = supabaseClient .storage .from( "wallpapers" ) .getPublicUrl( wallpaper.file_path );
                                        const card = document.createElement( "article" );
                                        card.className = "recent-card";
                                        const image = document.createElement( "img" );
                                        image.src = publicUrlData .publicUrl;
                                        image.alt = wallpaper.title;
                                        image.loading = "lazy";
                                        const info = document.createElement( "div" );
                                        info.className = "recent-info";
                                        const title = document.createElement( "h3" );
                                        title.className = "recent-title";
                                        title.textContent = wallpaper.title;
                                        const category = document.createElement( "p" );
                                        category.className = "recent-category";
                                        category.textContent = formatCategory( wallpaper.category );
                                        info.append( title, category );
                                        card.append( image, info );
                                        recentGrid.appendChild( card );
                                    }
                                    );
                                }
                                function openEditModal() {
                                    if (!currentUser) return;
                                    usernameInput.value = currentUsername;
                                    emailInput.value = currentUser ?.email || "";
                                    editMessage.textContent = "";
                                    selectedAvatar = null;
                                    avatarFileInput.value = "";
                                    refreshAvatarDisplays();
                                    editModal.classList.add( "show" );
                                    usernameInput.focus();
                                    document.body.style.overflow = "hidden";
                                }
                                function hideEditModal() {
                                    if (saveButton.disabled) return;
                                    editModal.classList.remove( "show" );
                                    editProfileButton.focus();
                                    document.body.style.overflow = "";
                                    editMessage.textContent = "";
                                    selectedAvatar = null;
                                    avatarFileInput.value = "";
                                    if ( temporaryPreview ) {
                                        URL.revokeObjectURL( temporaryPreview );
                                        temporaryPreview = null;
                                    }
                                    refreshAvatarDisplays();
                                }
                                editProfileButton.addEventListener( "click", openEditModal );
                                closeEditButton.addEventListener( "click", hideEditModal );
                                editModal.addEventListener( "click", function(event) {
                                    if ( event.target === editModal ) {
                                        hideEditModal();
                                    }
                                }
                                );
                                avatarFileInput.addEventListener( "change", function() {
                                    const file = this.files[0];
                                    selectedAvatar = null;
                                    if (temporaryPreview) {
                                        URL.revokeObjectURL(temporaryPreview);
                                        temporaryPreview = null;
                                    }
                                    refreshAvatarDisplays();
                                    if (!file) return;
                                    if ( !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type) ) {
                                        editMessage.textContent = "Please choose an image file.";
                                        this.value = "";
                                        return;
                                    }
                                    const maximumSize = 2 * 1024 * 1024;
                                    if ( file.size > maximumSize ) {
                                        editMessage.textContent = "Image must be 2 MB or smaller.";
                                        this.value = "";
                                        return;
                                    }
                                    selectedAvatar = file;
                                    if ( temporaryPreview ) {
                                        URL.revokeObjectURL( temporaryPreview );
                                    }
                                    temporaryPreview = URL.createObjectURL( file );
                                    setAvatarElement( editAvatarImage, editAvatarPlaceholder, temporaryPreview, currentUsername );
                                    editMessage.textContent = "";
                                }
                                );
                                async function uploadNewAvatar() {
                                    if ( !selectedAvatar || !currentUser ) {
                                        return currentAvatarUrl;
                                    }
                                    let extension = selectedAvatar .name .split(".") .pop() .toLowerCase();
                                    const allowedExtensions = [ "jpg", "jpeg", "png", "webp", "gif" ];
                                    if ( !allowedExtensions .includes( extension ) ) {
                                        extension = "jpg";
                                    }
                                    const filePath = currentUser.id + "/avatar-" + Date.now() + "." + extension;
                                    const {
                                        error: uploadError }
                                        = await supabaseClient .storage .from( "avatars" ) .upload( filePath, selectedAvatar, {
                                            cacheControl: "3600", upsert: false, contentType: selectedAvatar.type }
                                            );
                                            if ( uploadError ) {
                                                throw uploadError;
                                            }
                                            const {
                                                data: publicUrlData }
                                                = supabaseClient .storage .from( "avatars" ) .getPublicUrl( filePath );
                                                return publicUrlData .publicUrl;
                                            }
                                            function isValidUsername( username ) {
                                                return /^[A-Za-z0-9._-]{3,30}$/.test( username );
                                            }
                                            async function isUsernameAvailable( username ) {
                                                const {
                                                    data, error }
                                                    = await supabaseClient .rpc( "is_username_available", {
                                                        candidate_username: username, exclude_user_id: currentUser.id }
                                                        );
                                                        if (error) {
                                                            throw error;
                                                        }
                                                        return data === true;
                                                    }
                                                    saveButton.addEventListener( "click", async function() {
                                                        if ( !currentUser ) {
                                                            return;
                                                        }
                                                        const username = usernameInput .value .trim();
                                                        if (!username) {
                                                            editMessage.textContent = "Username cannot be empty.";
                                                            return;
                                                        }
                                                        if ( username.length < 3 ) {
                                                            editMessage.textContent = "Username must be at least 3 characters.";
                                                            return;
                                                        }
                                                        if ( !isValidUsername( username ) ) {
                                                            editMessage.textContent = "Username can only use letters, numbers, dot, underscore, or hyphen (3–30 characters).";
                                                            return;
                                                        }
                                                        saveButton.disabled = true;
                                                        saveButton.textContent = "Saving...";
                                                        editMessage.textContent = "Saving changes...";
                                                        try {
                                                            editMessage.textContent = "Checking username...";
                                                            const available = username === currentUsername || await isUsernameAvailable( username );
                                                            if (!available) {
                                                                editMessage.textContent = "That username is already taken. Choose another one.";
                                                                saveButton.disabled = false;
                                                                saveButton.textContent = "Save Changes";
                                                                return;
                                                            }
                                                            let avatarUrl = currentAvatarUrl;
                                                            if ( selectedAvatar ) {
                                                                editMessage.textContent = "Uploading profile picture...";
                                                                avatarUrl = await uploadNewAvatar();
                                                            }
                                                            const {
                                                                error: profileUpdateError }
                                                                = await supabaseClient .from( "profiles" ) .update({
                                                                    username: username, avatar_url: avatarUrl }
                                                                    ) .eq( "id", currentUser.id ).select("id").single();
                                                                    if ( profileUpdateError ) {
                                                                        throw profileUpdateError;
                                                                    }
                                                                    const {
                                                                        error: authUpdateError }
                                                                        = await supabaseClient .auth .updateUser({
                                                                            data: {
                                                                                username: username }
                                                                            }
                                                                            );
                                                                            if ( authUpdateError ) {
                                                                                console.error( "Metadata update:", authUpdateError );
                                                                            }
                                                                            currentUsername = username;
                                                                            currentAvatarUrl = avatarUrl;
                                                                            selectedAvatar = null;
                                                                            avatarFileInput.value = "";
                                                                            profileUsername.textContent = currentUsername;
                                                                            refreshAvatarDisplays();
                                                                            editMessage.textContent = "Profile updated successfully!";
                                                                            saveButton.textContent = "Saved ✓";
                                                                            setTimeout( function() {
                                                                                saveButton.disabled = false;
                                                                                saveButton.textContent = "Save Changes";
                                                                                hideEditModal();
                                                                            }
                                                                            , 900 );
                                                                        }
                                                                        catch ( error ) {
                                                                            console.error( error );
                                                                            editMessage.textContent = error?.code === "23505" ? "That username is already taken. Choose another one." : "Could not save profile: " + error.message;
                                                                            saveButton.disabled = false;
                                                                            saveButton.textContent = "Save Changes";
                                                                        }
                                                                    }
                                                                    );
                                                                    document.addEventListener( "keydown", function(event) {
                                                                        if (event.key === "Tab" && editModal.classList.contains("show")) {
                                                                            const items = Array.from(editModal.querySelectorAll("button:not(:disabled), input:not(:disabled):not([type=file]), [tabindex='0']"));
                                                                            const first = items[0], last = items[items.length - 1];
                                                                            if (event.shiftKey && document.activeElement === first) {
                                                                                event.preventDefault();
                                                                                last.focus();
                                                                            }
                                                                            else if (!event.shiftKey && document.activeElement === last) {
                                                                                event.preventDefault();
                                                                                first.focus();
                                                                            }
                                                                        }
                                                                        if ( event.key === "Escape" && editModal .classList .contains( "show" ) ) {
                                                                            hideEditModal();
                                                                        }
                                                                    }
                                                                    );
                                                                    loadProfile().catch(function(error) {
                                                                        console.error(error);
                                                                        pageMessage.textContent = "Could not load your profile. Please reload the page.";
                                                                    }
                                                                    );
                                                                let refreshingWallpapers = false;
async function refreshCollection() {
    if (!currentUser || refreshingWallpapers || document.visibilityState === "hidden") return;
    refreshingWallpapers = true;
    try { await loadWallpapers(); }
    catch (error) {
        console.error(error);
        wallpaperCount.textContent = "—";
        wallpaperMeta.textContent = "Unavailable";
        recentGrid.textContent = "Could not load your wallpapers. Please reload the page.";
    } finally { refreshingWallpapers = false; }
}
window.addEventListener("pageshow", function (event) { if (event.persisted) refreshCollection(); });
window.addEventListener("focus", refreshCollection);
document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") refreshCollection(); });


})();
