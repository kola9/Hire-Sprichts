<?php
require __DIR__ . '/lib.php';

$versions = get_versions();
$latest = $versions[0] ?? null;
$older = array_slice($versions, 1);
$totalDownloads = array_sum(array_map(fn($v) => (int) ($v['downloads'] ?? 0), $versions));

$iconDownload = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';
$iconAndroid = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.66-.38l-1.87 3.23A11.5 11.5 0 0 0 12 8.1c-1.8 0-3.5.38-4.91 1.05L5.22 5.92a.38.38 0 0 0-.66.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"/></svg>';

layout_start(SITE_NAME . ' · Télécharger l\'appli');
?>
<nav class="nav">
    <a class="brand" href="index.php"><?= logo() ?><?= h(SITE_NAME) ?></a>
    <div class="nav-links">
        <?php if ($latest): ?>
            <a class="btn btn-gold" href="download.php?id=<?= h($latest['id']) ?>"><?= $iconDownload ?><span>Télécharger</span></a>
        <?php endif; ?>
    </div>
</nav>

<header class="hero">
    <div>
        <span class="eyebrow"><span class="dot"></span><?= $latest ? 'v' . h($latest['version_name']) . ' disponible sur Android' : 'Bientôt sur Android' ?></span>
        <h1>Apprends l'allemand,<br><span class="grad">une phrase à la fois.</span></h1>
        <p class="lead">Installe <?= h(SITE_NAME) ?> directement sur ton téléphone Android, sans passer par un store. Gratuit, léger, toujours à jour.</p>
        <div class="cta">
            <?php if ($latest): ?>
                <a class="btn btn-primary" href="download.php?id=<?= h($latest['id']) ?>"><?= $iconAndroid ?> Télécharger l'APK</a>
                <a class="btn btn-ghost" href="#installer">Comment installer ?</a>
            <?php else: ?>
                <button class="btn btn-primary" disabled><?= $iconAndroid ?> Bientôt disponible</button>
            <?php endif; ?>
        </div>
        <?php if ($latest): ?>
            <div class="chips">
                <span class="chip">Version <strong>v<?= h($latest['version_name']) ?></strong></span>
                <span class="chip">Taille <strong><?= format_size($latest['size'] ?? null) ?></strong></span>
                <span class="chip">Mise à jour <strong><?= format_date((int) $latest['created_at']) ?></strong></span>
            </div>
        <?php endif; ?>
    </div>

    <div class="visual" aria-hidden="true">
        <span class="ring r3"></span><span class="ring r1"></span><span class="ring r2"></span>
        <span class="halo"></span>
        <span class="orb o1"></span><span class="orb o2"></span><span class="orb o3"></span>
        <?= logo('logo-xl') ?>
    </div>
</header>

<?php if ($latest): ?>
    <section class="card release">
        <div>
            <span class="badge">Dernière version</span>
            <div class="version">v<?= h($latest['version_name']) ?> <small>build <?= (int) $latest['version_code'] ?></small></div>
            <p class="meta">Publiée le <?= format_date((int) $latest['created_at']) ?> · <?= format_size($latest['size'] ?? null) ?><?= $totalDownloads ? ' · ' . $totalDownloads . ' téléchargement' . ($totalDownloads > 1 ? 's' : '') : '' ?></p>
            <a class="btn btn-primary" href="download.php?id=<?= h($latest['id']) ?>"><?= $iconDownload ?> Télécharger v<?= h($latest['version_name']) ?></a>
            <?php if (!empty($latest['notes'])): ?>
                <div class="notes">
                    <h3>Nouveautés</h3>
                    <p><?= nl2br(h($latest['notes'])) ?></p>
                </div>
            <?php endif; ?>
        </div>
        <div class="qr">
            <div class="qr-frame"><div id="qr"></div></div>
            <p>Sur ordinateur ? Scanne ce code avec ton téléphone.</p>
        </div>
    </section>
<?php else: ?>
    <section class="card empty">
        <?= logo() ?>
        <h2>La première version arrive bientôt</h2>
        <p class="muted">Reviens très vite pour installer <?= h(SITE_NAME) ?> sur ton téléphone.</p>
    </section>
<?php endif; ?>

<div class="section-title" id="installer">
    <div>
        <div class="kicker">Installation</div>
        <h2>Prêt en 3 étapes</h2>
    </div>
</div>
<div class="steps">
    <div class="card step">
        <div class="num">1</div>
        <h3>Télécharge</h3>
        <p>Appuie sur « Télécharger l'APK » depuis ton téléphone Android, ou scanne le QR code.</p>
    </div>
    <div class="card step">
        <div class="num">2</div>
        <h3>Autorise</h3>
        <p>Ouvre le fichier. Si Android le demande, autorise ton navigateur à installer des applis inconnues.</p>
    </div>
    <div class="card step">
        <div class="num">3</div>
        <h3>Apprends</h3>
        <p>C'est installé ! Pour une mise à jour, installe la nouvelle version par-dessus : tes données sont conservées.</p>
    </div>
</div>

<?php if ($older): ?>
    <div class="section-title">
        <div>
            <div class="kicker">Historique</div>
            <h2>Versions précédentes</h2>
        </div>
    </div>
    <section class="card">
        <ul class="versions">
            <?php foreach ($older as $v): ?>
                <li>
                    <div>
                        <strong>v<?= h($v['version_name']) ?></strong>
                        <span class="sub">build <?= (int) $v['version_code'] ?> · <?= format_date((int) $v['created_at']) ?> · <?= format_size($v['size'] ?? null) ?></span>
                        <?php if (!empty($v['notes'])): ?><p><?= nl2br(h($v['notes'])) ?></p><?php endif; ?>
                    </div>
                    <a class="btn" href="download.php?id=<?= h($v['id']) ?>"><?= $iconDownload ?> Télécharger</a>
                </li>
            <?php endforeach; ?>
        </ul>
    </section>
<?php endif; ?>

<footer class="footer">
    <span>© <?= date('Y') ?> <?= h(SITE_NAME) ?> · <?= h(SITE_TAGLINE) ?></span>
    <a href="admin.php">Espace admin</a>
</footer>

<?php if ($latest): ?>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <script>
        (function () {
            var el = document.getElementById('qr');
            if (!el || typeof QRCode === 'undefined') { return; }
            var url = new URL('download.php?id=latest', window.location.href).href;
            new QRCode(el, { text: url, width: 156, height: 156, colorDark: '#1F1C4A', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
        })();
    </script>
<?php endif; ?>
<?php
layout_end();
