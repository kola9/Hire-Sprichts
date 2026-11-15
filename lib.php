<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

define('DATA_DIR', __DIR__ . '/data');
define('APK_DIR', __DIR__ . '/apks');

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    ]);
    session_start();
}

// ---------- Utilitaires ----------

function h($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function redirect(string $to): void
{
    header('Location: ' . $to, true, 303);
    exit;
}

function format_size(?int $bytes): string
{
    if (!$bytes) {
        return '—';
    }
    $units = ['o', 'Ko', 'Mo', 'Go'];
    $i = 0;
    $size = (float) $bytes;
    while ($size >= 1024 && $i < count($units) - 1) {
        $size /= 1024;
        $i++;
    }
    return number_format($size, $i === 0 ? 0 : 1, ',', ' ') . ' ' . $units[$i];
}

function format_date(int $ts): string
{
    return date('d/m/Y', $ts);
}

// ---------- Stockage JSON ----------

function read_json(string $name, $default)
{
    $path = DATA_DIR . '/' . $name;
    if (!is_file($path)) {
        return $default;
    }
    $raw = file_get_contents($path);
    if ($raw === false || $raw === '') {
        return $default;
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $default;
}

function write_json(string $name, $data): bool
{
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return file_put_contents(DATA_DIR . '/' . $name, $json, LOCK_EX) !== false;
}

/** Versions triées de la plus récente à la plus ancienne (par version_code). */
function get_versions(): array
{
    $versions = read_json('versions.json', []);
    usort($versions, function ($a, $b) {
        return ($b['version_code'] ?? 0) <=> ($a['version_code'] ?? 0);
    });
    return $versions;
}

function save_versions(array $versions): bool
{
    return write_json('versions.json', array_values($versions));
}

function find_version_index(array $versions, string $id): ?int
{
    foreach ($versions as $i => $v) {
        if (($v['id'] ?? '') === $id) {
            return $i;
        }
    }
    return null;
}

// ---------- Sécurité ----------

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_check(): bool
{
    return isset($_POST['csrf']) && hash_equals(csrf_token(), (string) $_POST['csrf']);
}

function is_admin(): bool
{
    return !empty($_SESSION['admin']);
}

function flash(?string $message = null, string $type = 'ok'): ?array
{
    if ($message !== null) {
        $_SESSION['flash'] = ['msg' => $message, 'type' => $type];
        return null;
    }
    $f = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return $f;
}

// ---------- Mise en page ----------

function logo(string $class = 'logo'): string
{
    return '<img class="' . h($class) . '" src="assets/logo.svg" alt="' . h(SITE_NAME) . '" width="260" height="255">';
}

function layout_start(string $title, string $bodyClass = ''): void
{
    ?><!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <meta name="theme-color" content="#1F1C4A">
    <title><?= h($title) ?></title>
    <link rel="icon" type="image/svg+xml" href="assets/logo.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/style.css?v=<?= (int) @filemtime(__DIR__ . '/assets/style.css') ?>">
</head>
<body class="<?= h($bodyClass) ?>">
<div class="bg" aria-hidden="true"><span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span><span class="grid"></span></div>
<main class="wrap">
<?php
}

function layout_end(): void
{
    ?>
</main>
</body>
</html>
<?php
}
