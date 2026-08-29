/* =========================================================
   THE EVERYTHING - shared logo, footer and site links
========================================================= */
(function () {
    "use strict";

    const BRAND = "The Everything";

    // Replace # with the real account links whenever they are ready.
    const SOCIALS = [
        { name: "Instagram", icon: "fa-instagram", href: "https://www.instagram.com/theeverthing18?igsi=MWM4ZDNncDU2dW5oaw%3D%3D&utm_source=qr" },
        { name: "YouTube", icon: "fa-youtube", href: "https://www.youtube.com/@THEeverything18" },
        { name: "X", icon: "fa-x-twitter", href: "#" },
        { name: "TikTok", icon: "fa-tiktok", href: "https://www.tiktok.com/@everything..1.1?_r=1&_t=ZS-99IM0caEyCi" }
    ];

    function brandMarkup() {
        return [
            '<span class="te-brandmark" aria-label="The Everything">',
            '<span class="te-brand-the">THE</span>',
            '<span class="te-brand-word"><span class="te-brand-e">E</span><span class="te-brand-rest">VERYTHING</span></span>',
            '<span class="te-brand-spark" aria-hidden="true"></span>',
            '</span>'
        ].join("");
    }

    function decorateExistingBrands() {
        const selectors = [".logo", ".top-logo", "[data-te-brand]"];
        document.querySelectorAll(selectors.join(",")).forEach(function (node) {
            const text = (node.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
            const explicitlyBrand = node.hasAttribute("data-te-brand");
            const looksLikeBrand = text.includes("the everything") || text.includes("discover everything");

            if (!explicitlyBrand && !looksLikeBrand) return;
            if (node.querySelector(".te-brandmark")) return;

            node.classList.add("te-brand-host");
            node.innerHTML = brandMarkup();
            if (node.tagName === "A") node.setAttribute("aria-label", BRAND);
        });
    }

    function addFloatingBrandWhenMissing() {
        if (document.querySelector(".te-brand-host, [data-te-brand] .te-brandmark, .te-info-header .te-brandmark")) return;
        if (location.pathname.toLowerCase().endsWith("attack-on-titan.html")) return;

        const link = document.createElement("a");
        link.href = "index.html";
        link.className = "te-floating-brand te-brand-host";
        link.setAttribute("aria-label", BRAND);
        link.innerHTML = brandMarkup();
        document.body.appendChild(link);
    }

    function normalizeTitle() {
        let title = document.title || "";
        title = title.replace(/Yokso Anime\s*\|\s*Discover Everything/gi, "Anime | The Everything");
        title = title.replace(/Discover Everything/gi, "The Everything");

        if (title === "Anime Episodes") title = "Anime Episodes | The Everything";
        if (title === "Watch Episode") title = "Watch Episode | The Everything";
        if (title === "Attack on Titan") title = "Attack on Titan | The Everything";

        document.title = title;
    }

    function socialMarkup() {
        return SOCIALS.map(function (item) {
            const placeholder = item.href === "#" ? ' data-placeholder="true"' : "";
            return '<a class="te-social-link" href="' + item.href + '"' + placeholder +
                ' aria-label="' + item.name + '" title="' + item.name + '">' +
                '<i class="fa-brands ' + item.icon + '" aria-hidden="true"></i>' +
                '</a>';
        }).join("");
    }

    function injectFooter() {
        if (document.querySelector(".te-site-footer")) return;
        if (location.pathname.toLowerCase().endsWith("attack-on-titan.html")) return;

        document.querySelectorAll("footer:not(.te-site-footer)").forEach(function (oldFooter) {
            oldFooter.remove();
        });

        const footer = document.createElement("footer");
        footer.className = "te-site-footer";
        footer.innerHTML = [
            '<div class="te-footer-inner">',
              '<div class="te-footer-main">',
                '<div class="te-footer-brand">',
                  '<a href="index.html" class="te-brand-host" aria-label="The Everything">' + brandMarkup() + '</a>',
                  '<p class="te-footer-copyline">Anime. Films. Wallpapers.<br>One place. Endless worlds.</p>',
                '</div>',
                '<nav class="te-footer-links" aria-label="روابط الموقع">',
                  '<a href="about.html">About Us</a>',
                  '<a href="contact.html">Contact Us</a>',
                  '<a href="support.html">Support</a>',
                  '<a href="privacy.html">Privacy policy</a>',
                  '<a href="terms.html">Terms & conditions</a>',
                  '<a href="dmca.html">DMCA</a>',
                '</nav>',
                '<div class="te-footer-social-wrap">',
                  '<span class="te-footer-social-title">FOLLOW THE WORLD</span>',
                  '<div class="te-footer-social">' + socialMarkup() + '</div>',
                '</div>',
              '</div>',
              '<div class="te-footer-divider"></div>',
              '<div class="te-footer-bottom">',
                '<p>© <span class="te-year"></span> <strong>THE EVERYTHING</strong> — All Rights Reserved.</p>',
                '<span class="te-footer-universe">ENTER THE UNIVERSE</span>',
              '</div>',
            '</div>'
        ].join("");

        document.body.appendChild(footer);
        footer.querySelector(".te-year").textContent = String(new Date().getFullYear());

        if (document.querySelector(".login-container, .reset-box")) {
            document.body.classList.add("te-auth-with-footer");
        }
    }

    function disablePlaceholderSocialLinks() {
        document.addEventListener("click", function (event) {
            const link = event.target.closest(".te-social-link[data-placeholder='true']");
            if (!link) return;
            event.preventDefault();
        });
    }

    function init() {
        normalizeTitle();
        decorateExistingBrands();
        addFloatingBrandWhenMissing();
        injectFooter();
        disablePlaceholderSocialLinks();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
