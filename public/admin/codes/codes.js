// Admin « Codes ». Les données des clients ne sont jamais insérées comme du HTML.
(function () {
    'use strict';

    var API = '/api/admin/codes';
    var STATES = { unused: 'Pas encore utilisé', active: 'Activé', released: 'Déjà utilisé, libéré', error: 'Non enregistré' };
    var PLATFORMS = { android: 'Android', web: 'Web (iPhone ou navigateur)' };

    function $(id) { return document.getElementById(id); }

    var codes = [];
    var maxDevices = 2;
    var current = null;   // fiche ouverte
    var ticket = null;    // { id, png, jpeg, file, url }
    var busy = false;

    var sheet = $('sheet');
    var form = $('card-form');
    var FIELDS = ['name', 'phone', 'email', 'sold_on', 'note'];

    function api(method, path, body) {
        var opts = { method: method, credentials: 'same-origin', redirect: 'manual', headers: { accept: 'application/json' } };
        if (body !== undefined) {
            opts.headers['content-type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }
        return fetch(API + path, opts).then(function (r) {
            // Session Access expirée : redirection vers la page de connexion
            if (r.type === 'opaqueredirect') { throw new Error('Session expirée : recharge la page pour te reconnecter.'); }
            return r.json().catch(function () { return {}; }).then(function (data) {
                if (!r.ok) { throw new Error(data.error || ('Erreur ' + r.status)); }
                return data;
            });
        }, function () {
            throw new Error('Pas de connexion. Vérifie Internet et réessaie.');
        });
    }

    function notice(where, text, type) {
        var box = $(where);
        box.textContent = '';
        if (!text) { return; }
        var div = document.createElement('div');
        div.className = 'alert alert-' + (type || 'ok');
        div.textContent = text;
        box.appendChild(div);
        if (where === 'sheet-alert') { box.scrollIntoView({ block: 'nearest' }); }
    }

    function el(tag, className, text) {
        var e = document.createElement(tag);
        e.className = className;
        e.textContent = text;
        return e;
    }

    function plain(s) {
        return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    }

    // ---------- Liste ----------

    function renderList() {
        var raw = $('search').value.trim();
        var isCode = /^[\d\s]+$/.test(raw);
        var digits = raw.replace(/\s/g, '');
        var shown = codes.filter(function (c) {
            if (!raw) { return true; }
            return isCode ? c.code.indexOf(digits) >= 0 : plain(c.name).indexOf(plain(raw)) >= 0;
        });

        var list = $('list');
        list.textContent = '';
        shown.forEach(function (c) {
            var li = document.createElement('li');
            var row = document.createElement('button');
            row.type = 'button';
            row.className = 'code-row';
            row.dataset.id = c.id;
            row.appendChild(el('span', 'num', c.display));
            row.appendChild(el('span', 'pill ' + c.state, STATES[c.state]));
            row.appendChild(el('span', c.name ? 'who' : 'who none', c.name || 'Pas de client'));
            row.appendChild(el('span', 'devices', c.devices + '/' + maxDevices + ' appareils'));
            row.addEventListener('click', function () { openSheet(c.id); });
            li.appendChild(row);
            list.appendChild(li);
        });

        $('count-line').textContent = !codes.length ? 'Aucun code pour l\'instant.'
            : raw ? shown.length + ' résultat(s) sur ' + codes.length
            : codes.length + ' code(s)';
    }

    function load() {
        return api('GET', '').then(function (data) {
            codes = data.codes;
            maxDevices = data.maxDevices;
            renderList();
            setBusy(busy);
        });
    }

    function setBusy(value) {
        busy = value;
        $('make-one').disabled = value;
        $('make-many').querySelector('button').disabled = value;
    }

    function generate(count) {
        if (busy) { return; }
        setBusy(true);
        notice('page-alert', '');
        api('POST', '', { count: count })
            .then(function (made) {
                return load().then(function () {
                    $('search').value = '';
                    renderList();
                    if (made.ids.length === 1) { openSheet(made.ids[0]); } else { notice('page-alert', made.ids.length + ' codes créés. Touche un code pour remplir sa fiche.'); }
                });
            })
            .catch(function (e) { notice('page-alert', e.message, 'error'); })
            .then(function () { setBusy(false); });
    }

    $('make-one').addEventListener('click', function () { generate(1); });
    $('make-many').addEventListener('submit', function (e) {
        e.preventDefault();
        generate(Number($('count').value));
    });
    $('search').addEventListener('input', renderList);
    $('refresh').addEventListener('click', function () {
        notice('page-alert', '');
        load().catch(function (e) { notice('page-alert', e.message, 'error'); });
    });

    // ---------- Fiche ----------

    function today() {
        var d = new Date();
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }

    function changed() {
        return FIELDS.some(function (f) {
            var was = current[f] || (f === 'sold_on' && !current.name ? current.defaultDate : '');
            return form.elements[f].value.trim() !== String(was || '').trim();
        });
    }

    function updateButtons() {
        if (!current) { return; }
        var dirty = changed();
        var usable = current.state !== 'error';
        var saved = usable && !!current.name && !dirty;
        var image = !!ticket && ticket.id === current.id;

        $('copy-code').disabled = !usable;
        $('download').disabled = !usable || !image;
        $('copy-message').disabled = !saved;
        $('share').disabled = !saved || !image;
        $('send-email').hidden = !current.email;
        $('send-email').disabled = !saved || !image;
        $('send-hint').hidden = saved;
    }

    function showHead() {
        $('sheet-number').textContent = 'Ticket n° ' + String(current.number).padStart(4, '0');
        $('sheet-code').textContent = current.display;
        $('sheet-state').className = 'pill ' + current.state;
        $('sheet-state').textContent = STATES[current.state] + ' · ' + current.devices + '/' + maxDevices + ' appareils';
    }

    function openSheet(id) {
        var found = codes.find(function (c) { return c.id === id; });
        if (!found) { return; }
        current = found;
        current.defaultDate = today();
        FIELDS.forEach(function (f) { form.elements[f].value = current[f] || ''; });
        if (!current.name && !current.sold_on) { form.elements.sold_on.value = current.defaultDate; }
        notice('sheet-alert', '');
        showHead();

        if (ticket) { URL.revokeObjectURL(ticket.url); }
        ticket = null;
        $('ticket').hidden = true;
        updateButtons();
        if (!sheet.open) { sheet.showModal(); }
        sheet.scrollTop = 0;
        showDevices({ list: 'sheet-devices', alert: 'sheet-alert' }, '/' + id, {}, function () { return !!current && current.id === id; });

        // Prêt d'avance : sur iPhone, « Partager » doit suivre le toucher immédiatement
        window.makeTicket(found.display, found.number).then(function (t) {
            if (!current || current.id !== id) { return; }
            var name = 'ticket-sprichts-' + String(found.number).padStart(4, '0') + '.png';
            ticket = { id: id, png: t.png, jpeg: t.jpeg, file: new File([t.png], name, { type: 'image/png' }), url: URL.createObjectURL(t.png) };
            $('ticket').src = ticket.url;
            $('ticket').hidden = false;
            updateButtons();
        }).catch(function () {
            notice('sheet-alert', 'Le ticket n\'a pas pu être créé. Recharge la page.', 'error');
        });
    }

    function closeSheet() {
        if (current && changed() && form.elements.name.value.trim() && !confirm('Fermer sans enregistrer la fiche ?')) { return; }
        sheet.close();
    }

    $('sheet-close').addEventListener('click', closeSheet);
    sheet.addEventListener('cancel', function (e) {
        e.preventDefault();
        closeSheet();
    });
    sheet.addEventListener('close', function () { current = null; });
    form.addEventListener('input', updateButtons);

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!form.elements.name.value.trim()) {
            notice('sheet-alert', 'Le nom du client est obligatoire.', 'error');
            form.elements.name.focus();
            return;
        }
        var id = current.id;
        var body = {};
        FIELDS.forEach(function (f) { body[f] = form.elements[f].value; });
        $('save').disabled = true;
        api('PUT', '/' + id, body)
            .then(load)
            .then(function () {
                if (!current || current.id !== id) { return; }
                current = codes.find(function (c) { return c.id === id; });
                current.defaultDate = today();
                FIELDS.forEach(function (f) { form.elements[f].value = current[f] || ''; });
                showHead();
                updateButtons();
                notice('sheet-alert', 'Fiche enregistrée.');
            })
            .catch(function (err) { notice('sheet-alert', err.message, 'error'); })
            .then(function () { $('save').disabled = false; });
    });

    // ---------- Appareils ----------

    function day(iso) {
        var d = new Date(iso);
        return isNaN(d.getTime()) ? '?' : d.toLocaleDateString('fr-FR') + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * @param where  où écrire la liste et les messages
     * @param path   '/<fiche>' ou '' (code tapé)
     * @param body   {} ou { code }
     * @param still  faux si la liste n'est plus celle demandée (autre fiche ouverte…)
     */
    function showDevices(where, path, body, still) {
        var list = $(where.list);
        list.textContent = '';
        list.appendChild(el('li', 'muted small', 'Chargement…'));
        return api('POST', path + '/devices', body).then(function (data) {
            if (!still()) { return; }
            list.textContent = '';
            if (!data.devices.length) {
                list.appendChild(el('li', 'muted small', 'Aucun appareil sur ce code.'));
                return;
            }
            data.devices.forEach(function (d) {
                var name = PLATFORMS[d.platform] || 'Autre appareil';
                var li = document.createElement('li');
                var info = document.createElement('div');
                info.appendChild(el('strong', '', name));
                info.appendChild(el('span', 'muted small', 'Activé le ' + day(d.first_seen)));
                info.appendChild(el('span', 'muted small', 'Vu le ' + day(d.last_seen) + (d.takes_place ? '' : ' (plus de 30 jours : place déjà libre)')));
                var btn = el('button', 'btn release', 'Libérer un appareil');
                btn.type = 'button';
                btn.addEventListener('click', function () {
                    if (!confirm('Libérer cet appareil (' + name + ', activé le ' + day(d.first_seen) + ') ?\n\nIl devra entrer de nouveau le code. Le code et la progression ne sont pas touchés.')) { return; }
                    btn.disabled = true;
                    var send = { device: d.device };
                    if (body.code) { send.code = body.code; }
                    api('POST', path + '/release', send).then(function () {
                        if (still()) {
                            notice(where.alert, 'Appareil libéré : une place est libre.');
                            showDevices(where, path, body, still);
                        }
                        return load().then(function () {
                            if (!current) { return; }
                            var fresh = codes.find(function (c) { return c.id === current.id; });
                            if (fresh) {
                                current.state = fresh.state;
                                current.devices = fresh.devices;
                                showHead();
                            }
                        });
                    }).catch(function (e) {
                        btn.disabled = false;
                        notice(where.alert, e.message, 'error');
                    });
                });
                li.appendChild(info);
                li.appendChild(btn);
                list.appendChild(li);
            });
        }).catch(function (e) {
            if (!still()) { return; }
            list.textContent = '';
            notice(where.alert, e.message, 'error');
        });
    }

    var typed = 0;
    $('release-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var code = $('release-code').value.replace(/\s/g, '');
        var mine = ++typed;
        notice('release-alert', '');
        $('release-devices').textContent = '';
        if (!/^(\d{6}|\d{10})$/.test(code)) {
            notice('release-alert', 'Tape les 6 ou 10 chiffres du code.', 'error');
            return;
        }
        showDevices({ list: 'release-devices', alert: 'release-alert' }, '', { code: code }, function () { return mine === typed; });
    });

    // ---------- Envoyer au client ----------

    function copy(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
        }
        return Promise.resolve(false);
    }

    function download() {
        var a = document.createElement('a');
        a.href = ticket.url;
        a.download = ticket.file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    $('copy-code').addEventListener('click', function () {
        copy(current.code).then(function (ok) {
            notice('sheet-alert', ok ? 'Code copié.' : 'Copie impossible sur ce navigateur.', ok ? 'ok' : 'error');
        });
    });

    $('copy-message').addEventListener('click', function () {
        copy(current.message).then(function (ok) {
            notice('sheet-alert', ok ? 'Message copié : colle-le dans WhatsApp.' : 'Copie impossible sur ce navigateur.', ok ? 'ok' : 'error');
        });
    });

    $('download').addEventListener('click', function () {
        download();
        notice('sheet-alert', 'Ticket téléchargé.');
    });

    $('share').addEventListener('click', function () {
        var message = current.message;
        var data = { files: [ticket.file], text: message };
        var copied = copy(message); // WhatsApp sur iPhone perd parfois le texte : il est aussi copié

        function fallback() {
            download();
            copied.then(function (ok) {
                notice('sheet-alert', 'Partage impossible ici : ticket téléchargé' + (ok ? ' et message copié.' : '. Touche « Copier le message ».'));
            });
        }

        if (!navigator.share || !navigator.canShare || !navigator.canShare(data)) {
            fallback();
            return;
        }
        navigator.share(data).then(function () {
            notice('sheet-alert', 'Si le message n\'est pas parti avec le ticket, colle-le : il est copié.');
        }, function (e) {
            if (e.name !== 'AbortError') { fallback(); }
        });
    });

    $('send-email').addEventListener('click', function () {
        var btn = this;
        var id = current.id;
        if (!confirm('Envoyer le code et le ticket à ' + current.email + ' ?')) { return; }
        var reader = new FileReader();
        reader.onload = function () {
            btn.disabled = true;
            notice('sheet-alert', 'Envoi en cours…');
            api('POST', '/' + id + '/email', { ticket: String(reader.result).split(',')[1] })
                .then(function (r) { notice('sheet-alert', 'E-mail envoyé à ' + r.to + '.'); })
                .catch(function (e) { notice('sheet-alert', e.message, 'error'); })
                .then(updateButtons);
        };
        reader.readAsDataURL(ticket.jpeg);
    });

    load().catch(function (e) {
        $('count-line').textContent = '';
        notice('page-alert', e.message, 'error');
    });
})();
