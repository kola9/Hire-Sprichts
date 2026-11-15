<?php
require __DIR__ . '/lib.php';

// ---------- Accès caché ----------
// L'espace admin n'est lié nulle part. On y entre uniquement avec
// admin.php?k=ADMIN_KEY ; la session retient ensuite l'ouverture.
// Sans la clé, on répond comme si la page n'existait pas.
if (isset($_GET['k']) && ADMIN_KEY !== '' && hash_equals(ADMIN_KEY, (string) $_GET['k'])) {
    session_regenerate_id(true);
    $_SESSION['admin_gate'] = true;
    redirect('admin.php');            // retire la clé de la barre d'adresse et de l'historique
}
if (empty($_SESSION['admin_gate'])) {
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    echo "<!DOCTYPE HTML PUBLIC \"-//IETF//DTD HTML 2.0//EN\">\n<html><head>\n<title>404 Not Found</title>\n</head><body>\n<h1>Not Found</h1>\n<p>The requested URL was not found on this server.</p>\n</body></html>\n";
    exit;
}
header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer');

$admin =read_json('admin.json', []);
$hasPassword = !empty($admin['hash']);
$errors = [];
$old = ['version_name' => '', 'version_code' => '', 'notes' => '', 'url' => ''];

// Requête trop grosse : PHP vide $_POST et $_FILES sans prévenir
if ($_SERVER['REQUEST_METHOD'] === 'POST' && empty($_POST) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    $errors[] = 'Fichier trop volumineux pour le serveur (limite : ' . ini_get('post_max_size') . '). Utilise plutôt un lien externe.';
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string) ($_POST['action'] ?? '');

    if (!csrf_check()) {
        $errors[] = 'Session expirée, recharge la page et réessaie.';
    } elseif ($action === 'setup' && !$hasPassword) {
        $key = (string) ($_POST['setup_key'] ?? '');
        $pass = (string) ($_POST['password'] ?? '');
        $pass2 = (string) ($_POST['password2'] ?? '');

        if (SETUP_KEY === 'change-moi-avant-de-mettre-en-ligne') {
            $errors[] = 'Change d\'abord SETUP_KEY dans config.php.';
        } elseif (!hash_equals(SETUP_KEY, $key)) {
            sleep(1);
            $errors[] = 'Clé d\'installation incorrecte.';
        } elseif (strlen($pass) < 8) {
            $errors[] = 'Le mot de passe doit faire au moins 8 caractères.';
        } elseif ($pass !== $pass2) {
            $errors[] = 'Les deux mots de passe ne correspondent pas.';
        } elseif (!write_json('admin.json', ['user' => 'admin', 'hash' => password_hash($pass, PASSWORD_DEFAULT)])) {
            $errors[] = 'Impossible d\'écrire dans le dossier data/. Vérifie les permissions.';
        } else {
            session_regenerate_id(true);
            $_SESSION['admin'] = true;
            flash('Mot de passe admin créé. Bienvenue !');
            redirect('admin.php');
        }
    } elseif ($action === 'login' && $hasPassword) {
        $user = trim((string) ($_POST['username'] ?? ''));
        $userOk = hash_equals(strtolower((string) ($admin['user'] ?? 'admin')), strtolower($user));
        if (password_verify((string) ($_POST['password'] ?? ''), $admin['hash']) && $userOk) {
            session_regenerate_id(true);
            $_SESSION['admin'] = true;
            redirect('admin.php');
        }
        sleep(1);
        $errors[] = 'Identifiant ou mot de passe incorrect.';
    } elseif ($action === 'logout') {
        $_SESSION = [];
        session_destroy();
        redirect('admin.php');
    } elseif (!is_admin()) {
        $errors[] = 'Action non autorisée.';
    } elseif ($action === 'password') {
        $current = (string) ($_POST['current'] ?? '');
        $pass = (string) ($_POST['password'] ?? '');
        $pass2 = (string) ($_POST['password2'] ?? '');
        if (!password_verify($current, $admin['hash'])) {
            $errors[] = 'Mot de passe actuel incorrect.';
        } elseif (strlen($pass) < 8) {
            $errors[] = 'Le nouveau mot de passe doit faire au moins 8 caractères.';
        } elseif ($pass !== $pass2) {
            $errors[] = 'Les deux mots de passe ne correspondent pas.';
        } elseif (!write_json('admin.json', ['user' => $admin['user'] ?? 'admin', 'hash' => password_hash($pass, PASSWORD_DEFAULT)])) {
            $errors[] = 'Impossible d\'écrire dans le dossier data/.';
        } else {
            flash('Mot de passe modifié.');
            redirect('admin.php');
        }
    } elseif ($action === 'add') {
        $errors = handle_add($old);
        if (!$errors) {
            redirect('admin.php');
        }
    } elseif ($action === 'delete') {
        $versions = get_versions();
        $index = find_version_index($versions, (string) ($_POST['id'] ?? ''));
        if ($index !== null) {
            $v = $versions[$index];
            if (!empty($v['file'])) {
                @unlink(APK_DIR . '/' . basename($v['file']));
            }
            array_splice($versions, $index, 1);
            save_versions($versions);
            flash('Version v' . $v['version_name'] . ' supprimée.');
        }
        redirect('admin.php');
    }
}

/** Ajoute une version. Retourne la liste des erreurs (vide si OK). */
function handle_add(array &$old): array
{
    $errors = [];
    $name = trim((string) ($_POST['version_name'] ?? ''));
    $codeRaw = trim((string) ($_POST['version_code'] ?? ''));
    $notes = trim((string) ($_POST['notes'] ?? ''));
    $url = trim((string) ($_POST['url'] ?? ''));
    $old = ['version_name' => $name, 'version_code' => $codeRaw, 'notes' => $notes, 'url' => $url];

    $file = $_FILES['apk'] ?? null;
    $hasFile = $file && ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE;
    $code = filter_var($codeRaw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $versions = get_versions();

    if (!preg_match('/^[0-9A-Za-z._-]{1,32}$/', $name)) {
        $errors[] = 'Nom de version invalide (ex. 1.2.0).';
    }
    if ($code === false) {
        $errors[] = 'Le numéro de build doit être un entier positif.';
    } else {
        foreach ($versions as $v) {
            if ((int) $v['version_code'] === $code) {
                $errors[] = "Le build $code existe déjà.";
                break;
            }
        }
    }
    if (mb_strlen($notes) > 5000) {
        $errors[] = 'Notes trop longues (5000 caractères max).';
    }
    if ($hasFile === ($url !== '')) {
        $errors[] = 'Choisis soit un fichier APK, soit un lien externe (pas les deux).';
    }
    if ($url !== '' && (!filter_var($url, FILTER_VALIDATE_URL) || stripos($url, 'https://') !== 0)) {
        $errors[] = 'Le lien externe doit être une URL valide en https://.';
    }
    if ($errors) {
        return $errors;
    }

    $entry = [
        'id'           => bin2hex(random_bytes(6)),
        'version_name' => $name,
        'version_code' => $code,
        'notes'        => $notes,
        'file'         => null,
        'url'          => null,
        'size'         => null,
        'sha256'       => null,
        'created_at'   => time(),
        'downloads'    => 0,
    ];

    if ($hasFile) {
        if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE) {
            return ['Fichier trop volumineux (limite serveur : ' . ini_get('upload_max_filesize') . '). Utilise un lien externe.'];
        }
        if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
            return ['Échec de l\'envoi du fichier (code ' . (int) $file['error'] . ').'];
        }
        if (strtolower(pathinfo((string) $file['name'], PATHINFO_EXTENSION)) !== 'apk') {
            return ['Le fichier doit avoir l\'extension .apk.'];
        }
        // Un APK est une archive ZIP : il commence par "PK\x03\x04"
        $fh = fopen($file['tmp_name'], 'rb');
        $magic = $fh ? fread($fh, 4) : '';
        if ($fh) {
            fclose($fh);
        }
        if ($magic !== "PK\x03\x04") {
            return ['Ce fichier ne ressemble pas à un APK valide.'];
        }

        $target = APK_PREFIX . '-' . $name . '-' . $code . '-' . substr($entry['id'], 0, 6) . '.apk';
        if (!move_uploaded_file($file['tmp_name'], APK_DIR . '/' . $target)) {
            return ['Impossible d\'enregistrer le fichier dans apks/. Vérifie les permissions.'];
        }
        $entry['file'] = $target;
        $entry['size'] = filesize(APK_DIR . '/' . $target) ?: null;
        $entry['sha256'] = hash_file('sha256', APK_DIR . '/' . $target) ?: null;
    } else {
        $entry['url'] = $url;
    }

    $versions[] = $entry;
    if (!save_versions($versions)) {
        return ['Impossible d\'écrire dans data/versions.json.'];
    }
    flash('Version v' . $name . ' publiée.');
    return [];
}

$flash = flash();
$iconUser = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';
$iconLock = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="3"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
$iconKey = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9"/><path d="m17 6 3 3"/></svg>';

$alerts = function () use ($flash, $errors) {
    if ($flash) {
        echo '<div class="alert alert-' . h($flash['type']) . '">' . h($flash['msg']) . '</div>';
    }
    foreach ($errors as $e) {
        echo '<div class="alert alert-error">' . h($e) . '</div>';
    }
};

layout_start('Admin · ' . SITE_NAME);
?>

<?php if (!is_admin()): ?>
    <nav class="nav">
        <a class="brand" href="index.php"><?= logo() ?><?= h(SITE_NAME) ?></a>
    </nav>
    <div class="auth">
        <section class="card auth-card">
            <?= logo() ?>
            <?php if (!$hasPassword): ?>
                <h1>Première configuration</h1>
                <p class="sub">Crée le mot de passe admin avec la clé <code>SETUP_KEY</code> de <code>config.php</code>.</p>
                <?php $alerts(); ?>
                <form method="post" class="form">
                    <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
                    <label>Clé d'installation <span class="field"><?= $iconKey ?><input type="password" name="setup_key" required></span></label>
                    <label>Mot de passe <span class="field"><?= $iconLock ?><input type="password" name="password" minlength="8" required></span></label>
                    <label>Confirmer <span class="field"><?= $iconLock ?><input type="password" name="password2" minlength="8" required></span></label>
                    <button class="btn btn-primary" name="action" value="setup">Créer le compte admin</button>
                </form>
            <?php else: ?>
                <h1>Bon retour 👋</h1>
                <p class="sub">Connecte-toi à l'espace admin <?= h(SITE_NAME) ?>.</p>
                <?php $alerts(); ?>
                <form method="post" class="form">
                    <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
                    <label>Identifiant <span class="field"><?= $iconUser ?><input name="username" autocomplete="username" required autofocus value="<?= h($_POST['username'] ?? '') ?>"></span></label>
                    <label>Mot de passe <span class="field"><?= $iconLock ?><input type="password" name="password" autocomplete="current-password" required></span></label>
                    <button class="btn btn-primary" name="action" value="login">Se connecter</button>
                </form>
            <?php endif; ?>
            <a class="back" href="index.php">← Retour au site</a>
        </section>
    </div>

<?php else: ?>
    <?php
    $versions = get_versions();
    $totalDownloads = array_sum(array_map(fn($v) => (int) ($v['downloads'] ?? 0), $versions));
    ?>
    <nav class="nav">
        <a class="brand" href="index.php"><?= logo() ?><?= h(SITE_NAME) ?> <span class="badge purple">Admin</span></a>
        <div class="nav-links">
            <a class="btn btn-ghost" href="index.php" target="_blank"><span>Voir le site</span> ↗</a>
            <form method="post">
                <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
                <button class="btn" name="action" value="logout">Déconnexion</button>
            </form>
        </div>
    </nav>

    <div class="dash-head">
        <div>
            <div class="kicker">Tableau de bord</div>
            <h1>Salut, <?= h($admin['user'] ?? 'admin') ?> ✨</h1>
            <p>Publie et gère les versions de l'appli.</p>
        </div>
    </div>

    <?php $alerts(); ?>

    <div class="stats">
        <div class="card stat"><div class="label">Versions</div><div class="value"><?= count($versions) ?></div></div>
        <div class="card stat"><div class="label">Téléchargements</div><div class="value"><?= $totalDownloads ?></div></div>
        <div class="card stat"><div class="label">Version actuelle</div><div class="value"><?= $versions ? 'v' . h($versions[0]['version_name']) : '—' ?></div></div>
    </div>

    <div class="dash-grid">
        <section class="card">
            <h2>Publier une version</h2>
            <p class="desc">Envoie un APK, ou colle un lien externe si le fichier est trop lourd.</p>
            <form method="post" enctype="multipart/form-data" class="form">
                <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
                <div class="row">
                    <label>Nom de version
                        <input name="version_name" placeholder="1.2.0" value="<?= h($old['version_name']) ?>" required>
                    </label>
                    <label>Build (versionCode)
                        <input name="version_code" type="number" min="1"
                               placeholder="<?= $versions ? (int) $versions[0]['version_code'] + 1 : 1 ?>"
                               value="<?= h($old['version_code']) ?>" required>
                    </label>
                </div>
                <label>Fichier APK <span class="hint">max <?= h(ini_get('upload_max_filesize')) ?> sur ce serveur</span>
                    <input type="file" name="apk" accept=".apk,application/vnd.android.package-archive">
                </label>
                <label>… ou lien externe <span class="hint">GitHub Releases, Google Drive…</span>
                    <input name="url" type="url" placeholder="https://github.com/…/app-release.apk" value="<?= h($old['url']) ?>">
                </label>
                <label>Nouveautés
                    <textarea name="notes" rows="4" placeholder="- Nouveau module de vocabulaire&#10;- Corrections de bugs"><?= h($old['notes']) ?></textarea>
                </label>
                <button class="btn btn-primary" name="action" value="add">🚀 Publier</button>
            </form>
        </section>

        <div class="stack">
            <section class="card">
                <h2>Versions publiées</h2>
                <?php if (!$versions): ?>
                    <p class="desc">Aucune version pour l'instant.</p>
                <?php else: ?>
                    <div class="table-scroll">
                        <table>
                            <thead><tr><th>Version</th><th>Date</th><th>Taille</th><th>DL</th><th></th></tr></thead>
                            <tbody>
                            <?php foreach ($versions as $i => $v): ?>
                                <tr>
                                    <td><strong>v<?= h($v['version_name']) ?></strong> <span class="muted small">#<?= (int) $v['version_code'] ?></span><?= $i === 0 ? ' <span class="badge">actuelle</span>' : '' ?></td>
                                    <td><?= format_date((int) $v['created_at']) ?></td>
                                    <td><?= !empty($v['url']) ? 'Lien' : format_size($v['size'] ?? null) ?></td>
                                    <td><?= (int) ($v['downloads'] ?? 0) ?></td>
                                    <td>
                                        <form method="post" onsubmit="return confirm('Supprimer la version v<?= h($v['version_name']) ?> ?');">
                                            <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
                                            <input type="hidden" name="id" value="<?= h($v['id']) ?>">
                                            <button class="btn btn-danger" name="action" value="delete">Supprimer</button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                    <p class="muted small">Lien permanent : <code>download.php?id=latest</code></p>
                <?php endif; ?>
            </section>

            <section class="card">
                <h2>Changer le mot de passe</h2>
                <p class="desc">Remplace le mot de passe par défaut dès ta première connexion.</p>
                <form method="post" class="form">
                    <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
                    <label>Mot de passe actuel <input type="password" name="current" autocomplete="current-password" required></label>
                    <div class="row">
                        <label>Nouveau <input type="password" name="password" minlength="8" autocomplete="new-password" required></label>
                        <label>Confirmer <input type="password" name="password2" minlength="8" autocomplete="new-password" required></label>
                    </div>
                    <button class="btn btn-gold" name="action" value="password">Mettre à jour</button>
                </form>
            </section>
        </div>
    </div>
<?php endif; ?>
<?php
layout_end();
