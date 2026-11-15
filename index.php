<?php
require __DIR__ . '/lib.php';

$versions = get_versions();
$latest = $versions[0] ?? null;
$older = array_slice($versions, 1);
$totalDownloads = array_sum(array_map(fn($v) => (int) ($v['downloads'] ?? 0), $versions));
$guidePdf = 'assets/Guide_utilisation_Sprichts.pdf';
$hasGuide = is_file(__DIR__ . '/' . $guidePdf);

$iconDownload = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';
$iconAndroid = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.66-.38l-1.87 3.23A11.5 11.5 0 0 0 12 8.1c-1.8 0-3.5.38-4.91 1.05L5.22 5.92a.38.38 0 0 0-.66.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"/></svg>';
$iconCheck = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
$iconBook = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>';

// Les activités de l'application (guide, partie 1)
$features = [
    ['c' => 'f-pink',   'title' => 'Parler',        'text' => "Pose tes questions à Lukas, ton partenaire virtuel, et réponds aux siennes, comme à l'oral du Goethe.",
     'svg' => '<path d="M15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path d="M5 20a7 7 0 0 1 14 0"/><path d="M19 5.5a5 5 0 0 1 0 7"/>'],
    ['c' => 'f-blue',   'title' => 'Le professeur', 'text' => 'Discute librement avec Frau Schulz : elle répond à tes questions, te relance et corrige tes phrases.',
     'svg' => '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>'],
    ['c' => 'f-violet', 'title' => 'Conversations', 'text' => '7 situations de la vie quotidienne (médecin, appartement, magasin…), chacune en 5 étapes.',
     'svg' => '<path d="M4 5h11v8H8l-4 3z"/><path d="M15 9h5v8l-3-2h-6v-2"/>'],
    ['c' => 'f-teal',   'title' => 'Écouter · Hören', 'text' => "Des dialogues lus par des voix allemandes, avec des questions comme à l'examen.",
     'svg' => '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>'],
    ['c' => 'f-indigo', 'title' => 'Lire · Lesen',  'text' => "Articles, panneaux, e-mails et annonces, au format de l'examen.",
     'svg' => '<path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6v14"/>'],
    ['c' => 'f-green',  'title' => 'Écrire · Schreiben', 'text' => "Écris un message : l'application le note sur 10 et le corrige en détail.",
     'svg' => '<path d="M4 7h10M4 12h7M4 17h5"/><path d="m14 19 1-4 6-6 3 3-6 6z"/>'],
    ['c' => 'f-orange', 'title' => 'Grammaire',     'text' => 'Les règles A2 expliquées simplement en français, avec des quiz. Tes erreurs passent en priorité.',
     'svg' => '<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>'],
    ['c' => 'f-gold',   'title' => 'Prononciation', 'text' => "L'application écoute ta voix et donne un score. Il faut 80 % pour valider.",
     'svg' => '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>'],
];

// Galerie de captures
$screens = [
    ['04_accueil',    "L'accueil et le bouton « Commencer »"],
    ['09_parler',     'Sprechen : les 3 parties de l\'oral'],
    ['12_professeur', 'Discuter avec Frau Schulz'],
    ['05_exercices',  'Tous les exercices par compétence'],
    ['06_examen',     "L'examen Goethe A2 blanc"],
    ['14_hoeren',     'Hören : comprendre à l\'oral'],
    ['15_lesen',      'Lesen : comprendre à l\'écrit'],
    ['16_schreiben',  'Schreiben : écrire un message'],
    ['17_grammaire',  'Les règles de grammaire A2'],
    ['18_regle',      'Une règle expliquée simplement'],
    ['07_moi',        'Tes progrès et tes réglages'],
];

// Questions fréquentes (guide, partie 11)
$faq = [
    ['« Serveur injoignable » au moment du code', "Connecte le téléphone au même Wi-Fi que l'ordinateur Sprichts, vérifie que le serveur est allumé, puis réessaie."],
    ['« Ce code a déjà été utilisé »', "Chaque code ne marche qu'une fois, sur un seul téléphone. Demande un nouveau code à l'équipe Sprichts."],
    ['« Trop d\'essais »', 'Attends 15 minutes, puis tape le code avec attention.'],
    ["L'application ne m'entend pas", 'Autorise le micro : Paramètres du téléphone › Applications › Sprichts › Autorisations › Micro. Parle plus fort, dans un endroit calme.'],
    ["Je n'entends rien", 'Monte le volume « multimédia » du téléphone et vérifie que le mode silencieux est coupé. Touche de nouveau le bouton ▶.'],
    ['La voix est robotique / bandeau « Mode hors ligne »', "Le serveur n'est pas joignable : l'application passe en mode simplifié (voix du téléphone, correction de base). Reconnecte le Wi-Fi, tout revient automatiquement."],
    ['Le professeur met du temps à répondre', "C'est normal pour le premier message (le serveur se prépare, jusqu'à 20 s). Ensuite, quelques secondes."],
    ['Lukas me propose une autre question', 'Ta question était hors du thème de la carte ou contenait un mot inconnu. Remets les mots dans l\'ordre et prononce la question proposée.'],
    ['Comment mettre à jour l\'application ?', 'Télécharge la nouvelle version ici et installe-la par-dessus l\'ancienne : ta progression est conservée. Ne désinstalle pas l\'application, sinon il faudra un nouveau code.'],
];

layout_start(SITE_NAME . ' · Ton coach d\'allemand pour le Goethe A2');
?>
<nav class="nav">
    <a class="brand" href="index.php"><?= logo() ?><?= h(SITE_NAME) ?></a>
    <div class="nav-links">
        <a class="nav-link" href="#fonctionnalites">Fonctionnalités</a>
        <a class="nav-link" href="#examen">Examen A2</a>
        <a class="nav-link" href="#installer">Installer</a>
        <a class="nav-link" href="#faq">Aide</a>
        <?php if ($latest): ?>
            <a class="btn btn-gold" href="download.php?id=<?= h($latest['id']) ?>"><?= $iconDownload ?><span>Télécharger</span></a>
        <?php endif; ?>
    </div>
</nav>

<header class="hero">
    <div>
        <span class="eyebrow"><span class="dot"></span><?= $latest ? 'v' . h($latest['version_name']) . ' disponible sur Android' : 'Bientôt sur Android' ?></span>
        <h1>Parle allemand.<br><span class="grad">Réussis le Goethe A2.</span></h1>
        <p class="lead"><?= h(SITE_NAME) ?> est ton coach d'allemand dans le téléphone. Il te fait <strong>parler</strong>, te <strong>corrige</strong> en français et t'entraîne à l'examen <strong>Goethe-Zertifikat A2</strong>.</p>
        <div class="cta">
            <?php if ($latest): ?>
                <a class="btn btn-primary" href="download.php?id=<?= h($latest['id']) ?>"><?= $iconAndroid ?> Télécharger l'APK</a>
                <a class="btn btn-ghost" href="#installer">Comment installer ?</a>
            <?php else: ?>
                <button class="btn btn-primary" disabled><?= $iconAndroid ?> Bientôt disponible</button>
                <a class="btn btn-ghost" href="#fonctionnalites">Découvrir l'appli</a>
            <?php endif; ?>
        </div>
        <?php if ($latest): ?>
            <div class="chips">
                <span class="chip">Version <strong>v<?= h($latest['version_name']) ?></strong></span>
                <span class="chip">Taille <strong><?= format_size($latest['size'] ?? null) ?></strong></span>
                <span class="chip">Mise à jour <strong><?= format_date((int) $latest['created_at']) ?></strong></span>
            </div>
        <?php else: ?>
            <div class="chips">
                <span class="chip">Explications <strong>en français</strong></span>
                <span class="chip">Niveau <strong>A2</strong></span>
                <span class="chip">Android <strong>8+</strong></span>
            </div>
        <?php endif; ?>
    </div>

    <div class="phones" aria-hidden="true">
        <span class="halo"></span>
        <div class="phone phone-back"><img src="assets/screens/06_examen.jpg" alt="" width="480" height="1066"></div>
        <div class="phone phone-front"><img src="assets/screens/04_accueil.jpg" alt="" width="480" height="1066"></div>
        <div class="float-card fc-1"><span class="fc-ico ok"><?= $iconCheck ?></span><div><strong>Mit wem reist du?</strong><small>Prononciation 92 %</small></div></div>
        <div class="float-card fc-2"><?= logo('fc-logo') ?><div><strong>Dein Deutschcoach</strong><small>Niveau A2</small></div></div>
    </div>
</header>

<section class="band">
    <div><strong>8</strong><span>activités pour progresser</span></div>
    <div><strong>7</strong><span>conversations du quotidien</span></div>
    <div><strong>4</strong><span>modules d'examen blanc</span></div>
    <div><strong>100 %</strong><span>des explications en français</span></div>
</section>

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

<!-- ============ Fonctionnalités ============ -->
<div class="section-title" id="fonctionnalites">
    <div>
        <div class="kicker">Ce que tu peux faire</div>
        <h2>Tout pour parler allemand,<br>du quotidien jusqu'à l'examen</h2>
    </div>
</div>
<div class="features">
    <?php foreach ($features as $f): ?>
        <div class="card feature">
            <div class="f-ico <?= $f['c'] ?>"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><?= $f['svg'] ?></svg></div>
            <h3><?= h($f['title']) ?></h3>
            <p><?= h($f['text']) ?></p>
        </div>
    <?php endforeach; ?>
</div>

<div class="callout">
    <strong>Le principe le plus important :</strong> parler à voix haute. Parle dans le micro, même si tu fais des fautes : chaque phrase est analysée, corrigée et expliquée en français.
</div>

<!-- ============ Parler avec Lukas ============ -->
<section class="showcase">
    <div class="phone"><img src="assets/screens/09_parler.jpg" alt="L'écran Sprechen avec les trois parties de l'oral" width="480" height="1066" loading="lazy"></div>
    <div>
        <div class="kicker">L'oral avec Lukas</div>
        <h2>Entraîne-toi à l'oral comme le jour J</h2>
        <p class="muted">L'oral du Goethe A2 se passe à deux candidats devant un examinateur. Dans <?= h(SITE_NAME) ?>, l'examinatrice est <strong>Frau Schulz</strong> et ton partenaire est <strong>Lukas</strong>, 29 ans, infirmier à Cologne.</p>
        <ul class="teile">
            <li><span class="t-num">1</span><div><strong>Fragen zur Person</strong><p>Tu reçois des cartes avec un thème (Reisen, Beruf, Sport…). Tu poses une question à Lukas, il répond, puis il te questionne.</p></div></li>
            <li><span class="t-num">2</span><div><strong>Über sich sprechen</strong><p>Une carte, une question et 4 mots-clés : tu parles de ta vie, puis l'examinatrice te pose une question.</p></div></li>
            <li><span class="t-num">3</span><div><strong>Etwas planen</strong><p>Chacun a son agenda : vous cherchez ensemble un moment libre en discutant.</p></div></li>
        </ul>
        <p class="small muted">3 essais par question · la simulation est gardée 24 h · un mode « Je parle sans réfléchir » pour gagner en aisance.</p>
    </div>
</section>

<!-- ============ Le professeur ============ -->
<section class="showcase reverse">
    <div class="phone"><img src="assets/screens/12_professeur.jpg" alt="Le professeur conversationnel et ses thèmes" width="480" height="1066" loading="lazy"></div>
    <div>
        <div class="kicker">Le professeur</div>
        <h2>Une vraie discussion, sans script</h2>
        <p class="muted">Choisis un thème (Alltag, Reisen, Arbeit, Freizeit, Familie, Wohnen, Essen ou Frei). Frau Schulz comprend ce que tu dis, te répond, te relance et corrige tes phrases en direct.</p>
        <div class="chat">
            <div class="bubble me">Wie alt bist du?</div>
            <div class="bubble her">Ich bin 46 Jahre alt.</div>
            <div class="bubble me">Hast du Kinder?</div>
            <div class="bubble her">Ja, ich habe einen Sohn, Jonas.</div>
        </div>
        <p class="small muted">Réponds au micro ou au clavier. Touche une bulle pour réécouter la phrase.</p>
    </div>
</section>

<!-- ============ Examen ============ -->
<div class="section-title" id="examen">
    <div>
        <div class="kicker">Examen blanc</div>
        <h2>Le format officiel du Goethe-Zertifikat A2</h2>
    </div>
</div>
<section class="exam">
    <div class="modules">
        <div class="card module"><span class="m-tag">Lesen</span><strong>4 Teile · 20 questions</strong><span>30 minutes</span></div>
        <div class="card module"><span class="m-tag">Hören</span><strong>4 Teile · ~30 min</strong><span>Teil 1 et 4 : 2 écoutes · Teil 2 et 3 : 1 écoute</span></div>
        <div class="card module"><span class="m-tag">Schreiben</span><strong>2 messages · 2 × 10 points</strong><span>30 minutes</span></div>
        <div class="card module"><span class="m-tag">Sprechen</span><strong>3 Teile</strong><span>environ 15 minutes</span></div>
        <div class="card modes">
            <div><span class="badge">Mode examen</span><p>Chronomètre et écoutes limitées, comme le jour J.</p></div>
            <div><span class="badge purple">Mode entraînement</span><p>Sans chrono, écoutes illimitées, pour apprendre tranquillement.</p></div>
            <p class="small muted">Fais les 4 modules pour obtenir une estimation sur 100 : on réussit à partir de <strong>60</strong>. Sujets originaux au format de l'examen, pas des sujets officiels.</p>
        </div>
    </div>
    <div class="phone"><img src="assets/screens/06_examen.jpg" alt="L'onglet Examen Goethe A2" width="480" height="1066" loading="lazy"></div>
</section>

<!-- ============ Galerie ============ -->
<div class="section-title">
    <div>
        <div class="kicker">Aperçu</div>
        <h2>L'application en images</h2>
    </div>
    <div class="gal-nav">
        <button class="btn" type="button" data-scroll="-1" aria-label="Captures précédentes">←</button>
        <button class="btn" type="button" data-scroll="1" aria-label="Captures suivantes">→</button>
    </div>
</div>
<div class="gallery" id="gallery">
    <?php foreach ($screens as [$file, $caption]): ?>
        <figure>
            <div class="phone"><img src="assets/screens/<?= h($file) ?>.jpg" alt="<?= h($caption) ?>" width="480" height="1066" loading="lazy"></div>
            <figcaption><?= h($caption) ?></figcaption>
        </figure>
    <?php endforeach; ?>
</div>

<!-- ============ Installation ============ -->
<div class="section-title" id="installer">
    <div>
        <div class="kicker">Installation</div>
        <h2>Prêt en 4 étapes</h2>
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
        <p>Ouvre le fichier. Si Android le demande, autorise « l'installation d'applications inconnues » pour ton navigateur.</p>
    </div>
    <div class="card step">
        <div class="num">3</div>
        <h3>Débloque</h3>
        <p>Tape ton <strong>code d'accès à 6 chiffres</strong>. Il n'est demandé qu'une seule fois, puis plus jamais, même hors ligne.</p>
    </div>
    <div class="card step">
        <div class="num">4</div>
        <h3>Commence</h3>
        <p>Écris ton prénom, autorise le micro, puis touche chaque jour le bouton jaune « Commencer ».</p>
    </div>
</div>

<section class="card needs">
    <div>
        <h3>Il te faut</h3>
        <ul class="checks">
            <li><?= $iconCheck ?> Un téléphone <strong>Android 8</strong> ou plus récent</li>
            <li><?= $iconCheck ?> Un <strong>code d'accès</strong> fourni par l'équipe <?= h(SITE_NAME) ?></li>
            <li><?= $iconCheck ?> L'autorisation du <strong>micro</strong> pour l'oral</li>
            <li><?= $iconCheck ?> Des <strong>écouteurs</strong> (conseillé) pour Hören</li>
        </ul>
    </div>
    <div class="needs-note">
        <h3>Et sans connexion ?</h3>
        <p class="muted">L'application fonctionne aussi hors ligne, en mode simplifié : voix du téléphone, correction de base, questions préparées. Dès que le serveur est joignable, tout revient automatiquement.</p>
        <p class="small muted">Chaque code ne fonctionne qu'une fois, sur un seul téléphone. Pour une mise à jour, installe la nouvelle version par-dessus : ta progression est conservée.</p>
    </div>
</section>

<!-- ============ Méthode ============ -->
<div class="section-title">
    <div>
        <div class="kicker">La méthode</div>
        <h2>20 minutes par jour, ça suffit</h2>
    </div>
</div>
<section class="method">
    <div class="card">
        <ul class="plan">
            <li><span>Chaque jour</span><p>Le bouton jaune « Commencer » sur l'accueil</p><em>10 min</em></li>
            <li><span>Chaque jour</span><p>Une discussion avec Frau Schulz ou « Je parle sans réfléchir »</p><em>10 min</em></li>
            <li><span>2 × / semaine</span><p>Un module Hören ou Lesen en mode entraînement</p><em>30 min</em></li>
            <li><span>1 × / semaine</span><p>Un message Schreiben et une règle de grammaire</p><em>30 min</em></li>
            <li><span>Avant l'examen</span><p>Les 4 modules en mode examen, pour viser 60 ou plus</p><em>2 h</em></li>
        </ul>
    </div>
    <div class="card golden">
        <h3>Les 5 règles d'or</h3>
        <ol>
            <li><strong>Parle à voix haute</strong>, même avec des fautes.</li>
            <li><strong>Lis chaque correction</strong> et répète la bonne phrase.</li>
            <li>Place le <strong>verbe conjugué en 2<sup>e</sup> position</strong> (et à la fin après « weil »).</li>
            <li>Parle dans un endroit <strong>calme</strong>, le téléphone à 20 cm.</li>
            <li>Reviens <strong>chaque jour</strong> : ta série s'affiche dans « Moi ».</li>
        </ol>
    </div>
</section>

<!-- ============ FAQ ============ -->
<div class="section-title" id="faq">
    <div>
        <div class="kicker">Aide</div>
        <h2>Questions fréquentes</h2>
    </div>
    <?php if ($hasGuide): ?>
        <a class="btn" href="<?= h($guidePdf) ?>" target="_blank" rel="noopener"><?= $iconBook ?> Guide complet (PDF)</a>
    <?php endif; ?>
</div>
<section class="card faq">
    <?php foreach ($faq as [$q, $a]): ?>
        <details>
            <summary><?= h($q) ?></summary>
            <p><?= h($a) ?></p>
        </details>
    <?php endforeach; ?>
</section>

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

<!-- ============ Équipe ============ -->
<section class="team">
    <div class="kicker">L'équipe <?= h(SITE_NAME) ?></div>
    <p class="muted">Imaginé et développé par une petite équipe passionnée par l'allemand et l'enseignement.</p>
    <div class="people">
        <div><small>Initiateur du projet</small><strong>DJAGOUN Jean-Baptiste</strong></div>
        <div><small>Associé &amp; développeur</small><strong>DJAGOUN Mickael</strong></div>
        <div><small>Collaboratrice</small><strong>Sonia</strong></div>
        <div><small>Collaborateur</small><strong>Rodriguez</strong></div>
    </div>
</section>

<footer class="footer">
    <span>© <?= date('Y') ?> <?= h(SITE_NAME) ?> · <?= h(SITE_TAGLINE) ?></span>
    <span class="small">Entraînements originaux au format de l'examen, sans lien officiel avec le Goethe-Institut.</span>
</footer>

<script>
    (function () {
        var g = document.getElementById('gallery');
        document.querySelectorAll('[data-scroll]').forEach(function (b) {
            b.addEventListener('click', function () {
                g.scrollBy({ left: g.clientWidth * 0.8 * Number(b.getAttribute('data-scroll')), behavior: 'smooth' });
            });
        });
    })();
</script>
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
