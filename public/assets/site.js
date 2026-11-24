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
    // Sans « app » : Sprichts A2, comme tous les liens déjà partagés
    function dl(id, app) { return '/download.php?' + (app && app !== 'a2' ? 'app=' + app + '&' : '') + 'id=' + encodeURIComponent(id); }
    function isA2(v) { return !v.app || v.app === 'a2'; }

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
        (device === 'ios' ? ['iphone', 'b1-iphone'] : ['android', 'b1-android']).forEach(function (id) {
            var mine = document.getElementById(id);
            if (!mine || mine.hidden || mine.classList.contains('b1-soon')) { return; }
            mine.classList.add('is-you');
            var badge = mine.querySelector('.badge.you');
            if (badge) { badge.hidden = false; }
        });
        if (device === 'ios') {
            document.getElementById('platforms').classList.add('ios-first');
            document.getElementById('b1-platforms').classList.add('ios-first');
            document.getElementById('nav-download').hidden = true;
            document.getElementById('nav-ios').hidden = false;
            document.getElementById('eyebrow-text').textContent = 'Sur iPhone, depuis Safari';
            document.getElementById('hero-cta').innerHTML =
                '<a class="btn btn-primary" href="https://sprichts.pages.dev/" target="_blank" rel="noopener">' + ICON_SAFARI + ' Sprichts A2 dans Safari</a>' +
                (hero.b1
                    ? '<a class="btn btn-primary btn-b1" href="https://sprichts-b1.pages.dev/" target="_blank" rel="noopener">' + ICON_SAFARI + ' Sprichts B1 dans Safari</a>'
                    : '<a class="btn btn-ghost" href="#b1">Sprichts B1 : bientôt</a>');
            document.getElementById('hero-chips').innerHTML =
                '<span class="chip">Sur iPhone <strong>via Safari</strong></span>' +
                '<span class="chip">Sans <strong>App Store</strong></span>' +
                '<span class="chip">Niveaux <strong>A2 et B1</strong></span>';
        }
    }
    // En-tête commun aux deux applis (les boutons mènent à la section de chaque appli)
    var hero = { a2: null, b1: null };
    function updateHero() {
        var parts = [];
        if (hero.a2) { parts.push('Sprichts A2 v' + hero.a2.version_name); }
        if (hero.b1) { parts.push('Sprichts B1 v' + hero.b1.version_name); }
        document.getElementById('eyebrow-text').textContent = parts.length
            ? parts.join(' et ') + (parts.length > 1 ? ' disponibles' : ' disponible')
            : 'Sprichts A2 et Sprichts B1';
        document.getElementById('hero-cta').innerHTML =
            '<a class="btn btn-primary" href="#telecharger">' + ICON_ANDROID + ' Sprichts A2</a>' +
            (hero.b1
                ? '<a class="btn btn-primary btn-b1" href="#b1">' + ICON_ANDROID + ' Sprichts B1</a>'
                : '<a class="btn btn-ghost" href="#b1">Sprichts B1 : bientôt</a>');
        applyDevice();
    }

    applyDevice();

    // ---------- Onglets A2 / B1 ----------
    var TABS = { a2: ['tab-a2', 'panel-a2'], b1: ['tab-b1', 'b1'] };
    function selectTab(app, focus) {
        Object.keys(TABS).forEach(function (k) {
            var on = k === app;
            var tab = document.getElementById(TABS[k][0]);
            tab.setAttribute('aria-selected', on ? 'true' : 'false');
            tab.tabIndex = on ? 0 : -1;
            document.getElementById(TABS[k][1]).hidden = !on;
            if (on && focus) { tab.focus(); }
        });
    }
    function goTo(app) {
        selectTab(app);
        document.getElementById('niveaux').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    document.getElementById('tab-a2').addEventListener('click', function () { selectTab('a2'); });
    document.getElementById('tab-b1').addEventListener('click', function () { selectTab('b1'); });
    document.querySelector('.level-tabs').addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') { return; }
        e.preventDefault();
        selectTab(document.getElementById('tab-a2').getAttribute('aria-selected') === 'true' ? 'b1' : 'a2', true);
    });
    // Un lien vers « #b1 » ouvre l'onglet B1 ; « #telecharger », « #android », « #iphone » l'onglet A2
    var HASH_TAB = { '#b1': 'b1', '#telecharger': 'a2', '#android': 'a2', '#iphone': 'a2', '#niveaux': null };
    document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a || !Object.prototype.hasOwnProperty.call(HASH_TAB, a.getAttribute('href'))) { return; }
        var app = HASH_TAB[a.getAttribute('href')];
        e.preventDefault();
        if (app) { goTo(app); } else { document.getElementById('niveaux').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        history.replaceState(null, '', a.getAttribute('href'));
    });
    if (HASH_TAB[location.hash]) { goTo(HASH_TAB[location.hash]); }

    // Galerie : flèches
    var gallery = document.getElementById('gallery');
    document.querySelectorAll('[data-scroll]').forEach(function (b) {
        b.addEventListener('click', function () {
            var g = document.getElementById(b.getAttribute('data-target') || 'gallery');
            g.scrollBy({ left: g.clientWidth * 0.8 * Number(b.getAttribute('data-scroll')), behavior: 'smooth' });
        });
    });

    fetch('/api/versions', { headers: { accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
            if (!data || !data.versions) { return; }
            var a2 = data.versions.filter(isA2);
            var b1 = data.versions.filter(function (v) { return v.app === 'b1'; });
            if (a2.length) { render(a2); }
            if (b1.length) { renderB1(b1); }
        })
        .catch(function () { /* page statique conservée */ });

    function render(versions) {
        var latest = versions[0];
        var older = versions.slice(1);
        var total = versions.reduce(function (s, v) { return s + (Number(v.downloads) || 0); }, 0);
        var name = esc(latest.version_name);

        hero.a2 = latest;
        updateHero();

        document.getElementById('release-slot').innerHTML =
            '<section class="card release platform" id="android"><div>' +
            '<div class="platform-badges"><span class="badge purple">Sur Android</span><span class="badge">Dernière version</span>' +
            '<span class="badge you" hidden>Ton téléphone</span></div>' +
            '<div class="version">v' + name + ' <small>build ' + Number(latest.version_code) + '</small></div>' +
            '<p class="meta">Publiée le ' + fmtDate(latest.created_at) + (latest.size ? ' · ' + fmtSize(latest.size) : '') +
            (total ? ' · ' + total + ' téléchargement' + (total > 1 ? 's' : '') : '') + '</p>' +
            '<a class="btn btn-primary" href="' + dl(latest.id) + '">' + ICON_DOWNLOAD + ' Télécharger v' + name + '</a>' +
            (latest.notes ? '<details class="howto"><summary>Nouveautés de la v' + name + '</summary><p>' + nl2br(latest.notes) + '</p></details>' : '') +
            '</div><div class="qr"><div class="qr-frame"><div id="qr"></div></div>' +
            '<p>Avec ton téléphone Android.</p></div></section>';
        document.getElementById('tab-a2-sub').textContent = 'v' + latest.version_name;

        if (older.length) {
            document.getElementById('older-slot').innerHTML =
                '<details class="card older"><summary>Versions précédentes (' + older.length + ')</summary><ul class="versions">' +
                older.map(function (v) {
                    return '<li><div><strong>v' + esc(v.version_name) + '</strong>' +
                        '<span class="sub">build ' + Number(v.version_code) + ' · ' + fmtDate(v.created_at) + (v.size ? ' · ' + fmtSize(v.size) : '') + '</span>' +
                        (v.notes ? '<p>' + nl2br(v.notes) + '</p>' : '') + '</div>' +
                        '<a class="btn" href="' + dl(v.id) + '">' + ICON_DOWNLOAD + ' Télécharger</a></li>';
                }).join('') + '</ul></details>';
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

    function qr(id, text) {
        var el = document.getElementById(id);
        if (el && typeof QRCode !== 'undefined') {
            new QRCode(el, { text: text, width: 156, height: 156, colorDark: '#064E3B', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
        }
    }

    // Sprichts B1 : dès qu'une version est publiée, comme pour l'A2
    function renderB1(versions) {
        var latest = versions[0];
        var older = versions.slice(1);
        var total = versions.reduce(function (s, v) { return s + (Number(v.downloads) || 0); }, 0);
        var name = esc(latest.version_name);

        hero.b1 = latest;
        updateHero();

        document.getElementById('tab-b1-sub').textContent = 'v' + latest.version_name;

        document.getElementById('b1-slot').innerHTML =
            '<section class="card release platform" id="b1-android"><div>' +
            '<div class="platform-badges"><span class="badge badge-b1">Sprichts B1</span><span class="badge purple">Sur Android</span><span class="badge">Dernière version</span>' +
            '<span class="badge you" hidden>Ton téléphone</span></div>' +
            '<div class="version">v' + name + ' <small>build ' + Number(latest.version_code) + '</small></div>' +
            '<p class="meta">Publiée le ' + fmtDate(latest.created_at) + (latest.size ? ' · ' + fmtSize(latest.size) : '') +
            (total ? ' · ' + total + ' téléchargement' + (total > 1 ? 's' : '') : '') + '</p>' +
            '<a class="btn btn-primary" href="' + dl(latest.id, 'b1') + '">' + ICON_DOWNLOAD + ' Télécharger Sprichts B1 v' + name + '</a>' +
            (latest.notes ? '<details class="howto"><summary>Nouveautés de la v' + name + '</summary><p>' + nl2br(latest.notes) + '</p></details>' : '') +
            '</div><div class="qr"><div class="qr-frame"><div id="qr-b1"></div></div>' +
            '<p>Avec ton téléphone Android.</p></div></section>';

        document.getElementById('b1-iphone').hidden = false;

        if (older.length) {
            document.getElementById('b1-older-slot').innerHTML =
                '<details class="card older"><summary>Versions précédentes (' + older.length + ')</summary><ul class="versions">' +
                older.map(function (v) {
                    return '<li><div><strong>v' + esc(v.version_name) + '</strong>' +
                        '<span class="sub">build ' + Number(v.version_code) + ' · ' + fmtDate(v.created_at) + (v.size ? ' · ' + fmtSize(v.size) : '') + '</span>' +
                        (v.notes ? '<p>' + nl2br(v.notes) + '</p>' : '') + '</div>' +
                        '<a class="btn" href="' + dl(v.id, 'b1') + '">' + ICON_DOWNLOAD + ' Télécharger</a></li>';
                }).join('') + '</ul></details>';
        }

        qr('qr-b1', new URL('/download.php?app=b1&id=latest', window.location.href).href);
        qr('qr-b1-iphone', 'https://sprichts-b1.pages.dev/');
        applyDevice();
    }
})();
