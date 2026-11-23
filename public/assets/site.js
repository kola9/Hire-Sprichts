// Page publique : remplit la dernière version, le QR code et l'historique
// à partir de /api/versions. Sans réponse, la page reste en « Bientôt disponible ».
(function () {
    'use strict';

    var ICON_DOWNLOAD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';
    var ICON_ANDROID = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.66-.38l-1.87 3.23A11.5 11.5 0 0 0 12 8.1c-1.8 0-3.5.38-4.91 1.05L5.22 5.92a.38.38 0 0 0-.66.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"/></svg>';

    function esc(v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function nl2br(v) { return esc(v).replace(/\r?\n/g, '<br>'); }
    function fmtDate(ts) {
        var d = new Date(Number(ts) * 1000);
        function p(n) { return n < 10 ? '0' + n : '' + n; }
        return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
    }
    function fmtSize(bytes) {
        bytes = Number(bytes);
        if (!bytes) { return '—'; }
        var units = ['o', 'Ko', 'Mo', 'Go'], i = 0;
        // Comme Android : 1 Mo = 1 000 000 octets
        while (bytes >= 1000 && i < units.length - 1) { bytes /= 1000; i++; }
        return (i === 0 ? String(Math.round(bytes)) : bytes.toFixed(1).replace('.', ',')) + ' ' + units[i];
    }
    function dl(id) { return '/download.php?id=' + encodeURIComponent(id); }

    document.getElementById('year').textContent = new Date().getFullYear();

    // ---------- Téléphone du visiteur : iPhone, Android ou ordinateur ----------
    var ua = navigator.userAgent || '';
    var device = (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) ? 'ios'
        : /Android/i.test(ua) ? 'android' : 'desktop';

    var ICON_SAFARI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>';

    // Met en avant la section qui correspond au téléphone (rappelé après chaque rendu)
    function applyDevice() {
        document.documentElement.setAttribute('data-device', device);
        if (device === 'desktop') { return; }
        var mine = document.getElementById(device === 'ios' ? 'iphone' : 'android');
        if (mine) {
            mine.classList.add('is-you');
            var badge = mine.querySelector('.badge.you');
            if (badge) { badge.hidden = false; }
        }
        if (device === 'ios') {
            document.getElementById('platforms').classList.add('ios-first');
            document.getElementById('nav-download').hidden = true;
            document.getElementById('nav-ios').hidden = false;
            document.getElementById('eyebrow-text').textContent = 'Disponible sur iPhone, depuis Safari';
            document.getElementById('hero-cta').innerHTML =
                '<a class="btn btn-primary" href="https://sprichts.pages.dev/" target="_blank" rel="noopener">' + ICON_SAFARI + ' Ouvrir Sprichts dans Safari</a>' +
                '<a class="btn btn-ghost" href="#iphone">Comment installer ?</a>';
            // La version et la taille décrivent l'APK Android : sans intérêt sur iPhone
            document.getElementById('hero-chips').innerHTML =
                '<span class="chip">Sur iPhone <strong>via Safari</strong></span>' +
                '<span class="chip">Sans <strong>App Store</strong></span>' +
                '<span class="chip">Niveau <strong>A2</strong></span>';
        }
    }
    applyDevice();

    // Galerie : flèches
    var gallery = document.getElementById('gallery');
    document.querySelectorAll('[data-scroll]').forEach(function (b) {
        b.addEventListener('click', function () {
            gallery.scrollBy({ left: gallery.clientWidth * 0.8 * Number(b.getAttribute('data-scroll')), behavior: 'smooth' });
        });
    });

    fetch('/api/versions', { headers: { accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) { if (data && data.versions && data.versions.length) { render(data.versions); } })
        .catch(function () { /* page statique conservée */ });

    function render(versions) {
        var latest = versions[0];
        var older = versions.slice(1);
        var total = versions.reduce(function (s, v) { return s + (Number(v.downloads) || 0); }, 0);
        var name = esc(latest.version_name);

        var nav = document.getElementById('nav-download');
        nav.href = dl(latest.id);
        nav.hidden = false;

        document.getElementById('eyebrow-text').textContent = 'v' + latest.version_name + ' disponible sur Android';

        document.getElementById('hero-cta').innerHTML =
            '<a class="btn btn-primary" href="' + dl(latest.id) + '">' + ICON_ANDROID + ' Télécharger l\'APK</a>' +
            '<a class="btn btn-ghost" href="#installer">Comment installer ?</a>';

        document.getElementById('hero-chips').innerHTML =
            '<span class="chip">Version <strong>v' + name + '</strong></span>' +
            (latest.size ? '<span class="chip">Taille <strong>' + fmtSize(latest.size) + '</strong></span>' : '') +
            '<span class="chip">Mise à jour <strong>' + fmtDate(latest.created_at) + '</strong></span>';

        document.getElementById('release-slot').innerHTML =
            '<section class="card release platform" id="android"><div>' +
            '<div class="platform-badges"><span class="badge purple">Sur Android</span><span class="badge">Dernière version</span>' +
            '<span class="badge you" hidden>Ton téléphone</span></div>' +
            '<div class="version">v' + name + ' <small>build ' + Number(latest.version_code) + '</small></div>' +
            '<p class="meta">Publiée le ' + fmtDate(latest.created_at) + (latest.size ? ' · ' + fmtSize(latest.size) : '') +
            (total ? ' · ' + total + ' téléchargement' + (total > 1 ? 's' : '') : '') + '</p>' +
            '<a class="btn btn-primary" href="' + dl(latest.id) + '">' + ICON_DOWNLOAD + ' Télécharger v' + name + '</a>' +
            (latest.notes ? '<div class="notes"><h3>Nouveautés</h3><p>' + nl2br(latest.notes) + '</p></div>' : '') +
            '</div><div class="qr"><div class="qr-frame"><div id="qr"></div></div>' +
            '<p>Sur ordinateur ? Scanne ce code avec ton téléphone Android.</p></div></section>';

        if (older.length) {
            document.getElementById('older-slot').innerHTML =
                '<div class="section-title"><div><div class="kicker">Historique</div><h2>Versions précédentes</h2></div></div>' +
                '<section class="card"><ul class="versions">' +
                older.map(function (v) {
                    return '<li><div><strong>v' + esc(v.version_name) + '</strong>' +
                        '<span class="sub">build ' + Number(v.version_code) + ' · ' + fmtDate(v.created_at) + (v.size ? ' · ' + fmtSize(v.size) : '') + '</span>' +
                        (v.notes ? '<p>' + nl2br(v.notes) + '</p>' : '') + '</div>' +
                        '<a class="btn" href="' + dl(v.id) + '">' + ICON_DOWNLOAD + ' Télécharger</a></li>';
                }).join('') + '</ul></section>';
        }

        var el = document.getElementById('qr');
        if (el && typeof QRCode !== 'undefined') {
            new QRCode(el, {
                text: new URL('/download.php?id=latest', window.location.href).href,
                width: 156, height: 156, colorDark: '#1F1C4A', colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        }
        applyDevice();
    }
})();
