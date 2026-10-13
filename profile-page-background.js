/* Private per-account profile backgrounds; uses the existing authenticated client. */
window.initProfilePageBackground = async function (client, user) {
    const hero = document.body;
    const dialog = document.getElementById('pageCoverDialog');
    const open = document.getElementById('pageCoverOpen');
    const file = document.getElementById('pageCoverFile');
    const preview = document.getElementById('pageCoverPreview');
    const save = document.getElementById('pageCoverSave');
    const remove = document.getElementById('pageCoverRemove');
    const close = document.getElementById('pageCoverClose');
    const message = document.getElementById('pageCoverMessage');
    const bucket = client.storage.from('profile-page-backgrounds');
    let path = null, blob = null, previewURL = null, busy = false, selection = 0;
    function state(working) {
        busy = working;
        save.disabled = working || !blob;
        remove.disabled = working || !path;
        close.disabled = working;
        file.disabled = working;
    }
    function errorText(error) {
        console.error('Profile cover:', error);
        return 'Could not complete this action. Check your connection and that PROFILE-PAGE-BACKGROUND.sql has been installed.';
    }
    function clearPreview() {
        selection++;
        blob = null;
        if (previewURL) URL.revokeObjectURL(previewURL);
        previewURL = null;
        preview.removeAttribute('src');
        preview.hidden = true;
        file.value = '';
        state(false);
    }
    async function paint() {
        if (!path) {
            hero.style.removeProperty('--profile-page-image');
            hero.classList.remove('has-page-background');
            return;
        }
        const result = await bucket.createSignedUrl(path, 3600);
        if (result.error) throw result.error;
        hero.style.setProperty('--profile-page-image', 'url(' + JSON.stringify(result.data.signedUrl) + ')');
        hero.classList.add('has-page-background');
    }
    open.disabled = false;
    open.addEventListener('click', () => { clearPreview(); message.textContent = ''; dialog.showModal(); });
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    dialog.addEventListener('close', () => { clearPreview(); open.focus(); });
    file.addEventListener('change', async () => {
        const chosen = file.files[0];
        const token = ++selection;
        blob = null;
        save.disabled = true;
        if (previewURL) URL.revokeObjectURL(previewURL);
        previewURL = null; preview.hidden = true;
        if (!chosen) return;
        if (!['image/jpeg', 'image/png'].includes(chosen.type)) {
            message.textContent = 'Choose a JPG or PNG image. GIF is not supported.'; return;
        }
        if (chosen.size > 5 * 1024 * 1024) {
            message.textContent = 'The image must be 5 MB or smaller.'; return;
        }
        message.textContent = 'Preparing preview...';
        let bitmap;
        try {
            bitmap = await createImageBitmap(chosen);
            if (bitmap.width < 320 || bitmap.height < 180 || bitmap.width * bitmap.height > 40000000) {
                throw new Error('Image dimensions must be at least 320 × 180 and no more than 40 megapixels.');
            }
            const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 900;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#0b1119'; ctx.fillRect(0, 0, 1600, 900);
            const scale = Math.max(1600 / bitmap.width, 900 / bitmap.height);
            const width = bitmap.width * scale, height = bitmap.height * scale;
            ctx.drawImage(bitmap, (1600 - width) / 2, (900 - height) / 2, width, height);
            const converted = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .88));
            if (!converted) throw new Error('This image could not be processed.');
            if (token !== selection) return;
            blob = converted;
            previewURL = URL.createObjectURL(blob); preview.src = previewURL; preview.hidden = false;
            message.textContent = '1600 × 900 preview. The image is cropped from the centre and saved as a still image.';
            state(false);
        } catch (error) {
            if (token === selection) message.textContent = error.message || 'Invalid image.';
        } finally { if (bitmap) bitmap.close(); }
    });
    save.addEventListener('click', async () => {
        if (!blob || busy) return;
        state(true); message.textContent = 'Uploading background...';
        const newPath = user.id + '/' + crypto.randomUUID() + '.jpg';
        let uploaded = false, committed = false;
        try {
            const upload = await bucket.upload(newPath, blob, { contentType: 'image/jpeg', upsert: false });
            if (upload.error) throw upload.error;
            uploaded = true;
            const update = await client.from('profile_page_backgrounds').upsert({user_id: user.id, file_path: newPath}, {onConflict:'user_id'}).select('file_path').single();
            if (update.error) throw update.error;
            committed = true;
            const oldPath = path; path = newPath;
            // Database save is authoritative; cleanup failure does not undo it.
            if (oldPath && oldPath !== path) {
                try { const cleanup = await bucket.remove([oldPath]); if (cleanup.error) console.warn(cleanup.error); } catch (e) { console.warn(e); }
            }
            try { await paint(); message.textContent = 'Background saved.'; }
            catch (error) { message.textContent = 'Background saved. Reload the page to display it.'; }
            blob = null;
        } catch (error) {
            if (uploaded && !committed) { try { await bucket.remove([newPath]); } catch (_) {} }
            message.textContent = errorText(error);
        } finally { state(false); }
    });
    remove.addEventListener('click', async () => {
        if (!path || busy) return;
        state(true); message.textContent = 'Removing background...';
        try {
            const result = await client.from('profile_page_backgrounds').delete().eq('user_id', user.id).select('user_id');
            if (result.error) throw result.error;
            const old = path; path = null;
            await paint();
            try { await bucket.remove([old]); } catch (_) {}
            clearPreview(); message.textContent = 'Background removed.';
        } catch (error) { message.textContent = errorText(error); }
        finally { state(false); }
    });
    async function load() {
        if (busy) return;
        const result = await client.from('profile_page_backgrounds').select('file_path').eq('user_id', user.id).maybeSingle();
        if (result.error) throw result.error;
        path = result.data?.file_path || null;
        await paint();
        state(false);
    }
    try { await load(); } catch (error) { message.textContent = errorText(error); }
    // Renew private signed URLs while this page is open.
    setInterval(() => { if (!document.hidden) load().catch(console.warn); }, 30 * 60 * 1000);
    window.addEventListener('pageshow', event => { if (event.persisted) load().catch(console.warn); });
};
