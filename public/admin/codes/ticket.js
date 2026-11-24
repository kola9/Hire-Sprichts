// Ticket client : même dessin que les tickets existants, 1920 × 920.
// Dessiné dans le navigateur : le code ne part vers aucun service d'images.
(function () {
    'use strict';

    var SCALE = 1.5; // dessin en 1280 × 613, exporté en 1920 × 920
    var NAVY_TEXT = '#22183D';
    var assets = {}; // par niveau : l'icône B1 porte sa pastille orange « B1 »
    var ICONS = { A2: '/assets/ticket-icon.png', B1: '/assets/ticket-icon-b1.png' };

    function image(src) {
        return new Promise(function (resolve, reject) {
            var img = new Image();
            img.onload = function () { resolve(img); };
            img.onerror = function () { reject(new Error('Image introuvable : ' + src)); };
            img.src = src;
        });
    }

    function load(level) {
        if (!assets[level]) {
            var fonts = ['300', '400', '500', '600', '700'].map(function (w) {
                // Hors ligne ou police bloquée : la police du téléphone prend le relais
                return document.fonts.load(w + ' 20px Poppins', 'Allemand é œ').catch(function () {});
            });
            assets[level] = Promise.all([image(ICONS[level]), image('/assets/logo.svg')].concat(fonts))
                .catch(function (e) { assets[level] = null; throw e; });
        }
        return assets[level];
    }

    function rounded(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
    }

    function circle(c, x, y, r) {
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.closePath();
    }

    function font(c, weight, size) {
        c.font = weight + ' ' + size + 'px Poppins, system-ui, sans-serif';
    }

    // Texte avec espacement entre les lettres (ctx.letterSpacing manque dans Safari)
    function width(c, s, gap) {
        return Array.from(s).reduce(function (w, ch) { return w + c.measureText(ch).width + gap; }, -gap);
    }
    function spaced(c, s, x, y, gap) {
        Array.from(s).forEach(function (ch) {
            c.fillText(ch, x, y);
            x += c.measureText(ch).width + gap;
        });
    }
    function centred(c, s, middle, y, gap) {
        spaced(c, s, middle - width(c, s, gap) / 2, y, gap);
    }

    function paint(c, code, number, icon, logo, level) {
        c.fillStyle = '#EFEDF7';
        c.fillRect(0, 0, 1280, 614);

        c.save();
        c.shadowColor = 'rgba(40,30,80,.32)';
        c.shadowBlur = 40;
        c.shadowOffsetY = 22;
        rounded(c, 40, 40, 1200, 506, 36);
        c.fillStyle = '#3B2A9C';
        c.fill();
        c.restore();

        c.save();
        rounded(c, 40, 40, 1200, 506, 36);
        c.clip();

        // Partie violette
        var g = c.createLinearGradient(40, 40, 700, 700);
        g.addColorStop(0, '#221E55');
        g.addColorStop(0.5, '#43299F');
        g.addColorStop(1, '#6A3AE6');
        c.fillStyle = g;
        c.fillRect(40, 40, 800, 506);
        g = c.createRadialGradient(730, 50, 0, 730, 50, 300);
        g.addColorStop(0, 'rgba(244,150,66,.30)');
        g.addColorStop(1, 'rgba(244,150,66,0)');
        c.fillStyle = g;
        c.fillRect(40, 40, 800, 506);

        c.save();
        c.beginPath();
        c.rect(40, 40, 800, 506);
        c.clip();
        c.lineWidth = 1.5;
        c.strokeStyle = 'rgba(255,255,255,.12)';
        circle(c, 733, 480, 225);
        c.stroke();
        c.strokeStyle = 'rgba(244,160,66,.38)';
        circle(c, 733, 480, 146);
        c.stroke();
        c.globalAlpha = 0.14;
        c.translate(697, 415);
        c.rotate(-0.17);
        c.drawImage(logo, -76, -74, 152, 149);
        c.restore();

        c.save();
        rounded(c, 91, 83, 82, 82, 22);
        c.clip();
        c.drawImage(icon, 91, 83, 82, 82);
        c.restore();

        c.fillStyle = '#FFFFFF';
        font(c, 700, 34);
        c.fillText('Sprichts', 186, 125);
        c.fillStyle = '#F7A928';
        font(c, 500, 14);
        spaced(c, 'DEUTSCH LERNEN', 187, 152, 4);

        rounded(c, 636, 103, 151, 43, 21.5);
        c.strokeStyle = 'rgba(247,169,40,.7)';
        c.lineWidth = 1.2;
        c.stroke();
        font(c, 700, 17);
        c.fillStyle = '#F7A928';
        centred(c, '★ PREMIUM', 711.5, 131, 2.5);

        font(c, 700, 72);
        c.fillStyle = '#FFFFFF';
        c.fillText('Allemand', 94, 265);
        var x = 94 + c.measureText('Allemand ').width;
        g = c.createLinearGradient(x, 0, x + 95, 0);
        g.addColorStop(0, '#FFD076');
        g.addColorStop(1, '#FF8A3D');
        c.fillStyle = g;
        c.fillText(level, x, 265);

        font(c, 300, 20);
        c.fillStyle = 'rgba(255,255,255,.8)';
        c.fillText("Voucher d'activation — accès complet à l'application", 94, 312);

        font(c, 500, 16);
        [['Toutes les leçons ' + level, 94], ['Exercices & quiz', 303], ['Audio natif', 478]].forEach(function (f) {
            c.fillStyle = '#F7A928';
            c.fillText('✦', f[1], 372);
            c.fillStyle = '#FFFFFF';
            c.fillText(f[0], f[1] + 17, 372);
        });

        font(c, 400, 14.5);
        c.fillStyle = 'rgba(255,255,255,.55)';
        spaced(c, 'Valable pour un seul compte · Niveau ' + level + ' (CECRL) · Activation à vie', 94, 500, 0.8);

        // Talon orange
        g = c.createLinearGradient(900, 40, 1120, 560);
        g.addColorStop(0, '#FFD27A');
        g.addColorStop(0.5, '#F9AA2B');
        g.addColorStop(1, '#F08A14');
        c.fillStyle = g;
        c.fillRect(840, 40, 400, 506);

        c.setLineDash([7, 5]);
        c.strokeStyle = 'rgba(70,40,10,.35)';
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(842, 80);
        c.lineTo(842, 508);
        c.stroke();
        c.setLineDash([]);

        c.fillStyle = NAVY_TEXT;
        font(c, 700, 14);
        c.fillText('TICKET', 875, 96);
        c.textAlign = 'right';
        c.fillText('N° ' + String(number).padStart(4, '0'), 1205, 96);
        c.textAlign = 'left';

        rounded(c, 875, 168, 330, 189, 22);
        c.fillStyle = 'rgba(255,255,255,.3)';
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,.7)';
        c.lineWidth = 1.2;
        c.stroke();

        c.fillStyle = 'rgba(34,24,61,.75)';
        font(c, 600, 13);
        centred(c, "CODE D'ACTIVATION", 1040, 207, 2.5);

        var size = 50;
        font(c, 700, size);
        while (size > 24 && c.measureText(code).width > 298) {
            size -= 1;
            font(c, 700, size);
        }
        c.fillStyle = '#221E55';
        c.textAlign = 'center';
        c.fillText(code, 1040, 264);
        c.textAlign = 'left';

        rounded(c, 953, 294, 174, 40, 20);
        c.fillStyle = '#2A2270';
        c.fill();
        c.fillStyle = '#FFD27A';
        font(c, 700, 13.5);
        centred(c, '• USAGE UNIQUE', 1040, 319, 1.5);

        c.fillStyle = NAVY_TEXT;
        [['1.', "Ouvrez l'appli Sprichts"], ['2.', 'Saisissez le code'], ['3.', 'Viel Spaß! 🎉']].forEach(function (s, i) {
            var y = 437 + i * 21;
            font(c, 700, 13.5);
            c.fillText(s[0], 875, y);
            font(c, 400, 13.5);
            c.fillText(s[1], 892, y);
        });
        c.fillStyle = 'rgba(34,24,61,.7)';
        c.fillText('Non cessible · Non remboursable', 875, 499);
        c.restore();

        // Encoches
        c.fillStyle = '#EFEDF7';
        circle(c, 840, 40, 29);
        c.fill();
        circle(c, 840, 546, 29);
        c.fill();
    }

    function blob(canvas, type, quality) {
        return new Promise(function (resolve, reject) {
            canvas.toBlob(function (b) { if (b) { resolve(b); } else { reject(new Error('Image impossible')); } }, type, quality);
        });
    }

    /** → { png, jpeg } : PNG à télécharger et partager, JPEG plus léger pour l'e-mail. */
    /** level : « A2 » (par défaut) ou « B1 ». */
    window.makeTicket = function (display, number, level) {
        level = level === 'B1' ? 'B1' : 'A2';
        return load(level).then(function (a) {
            var canvas = document.createElement('canvas');
            canvas.width = 1920;
            canvas.height = 920;
            var c = canvas.getContext('2d');
            c.scale(SCALE, SCALE);
            paint(c, display, number, a[0], a[1], level);
            return Promise.all([blob(canvas, 'image/png'), blob(canvas, 'image/jpeg', 0.88)]);
        }).then(function (b) {
            return { png: b[0], jpeg: b[1] };
        });
    };
})();
