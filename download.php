<?php
require __DIR__ . '/lib.php';

$versions = get_versions();
$id = (string) ($_GET['id'] ?? '');

// download.php?id=latest pointe toujours vers la version la plus récente
if ($id === 'latest' && $versions) {
    $id = $versions[0]['id'];
}

$index = find_version_index($versions, $id);
if ($index === null) {
    http_response_code(404);
    exit('Version introuvable.');
}

$version = $versions[$index];
$isExternal = !empty($version['url']);
$path = $isExternal ? null : APK_DIR . '/' . basename((string) $version['file']);

if (!$isExternal && !is_file($path)) {
    http_response_code(404);
    exit('Fichier introuvable sur le serveur.');
}

// Compteur de téléchargements
$versions[$index]['downloads'] = (int) ($version['downloads'] ?? 0) + 1;
save_versions($versions);

if ($isExternal) {
    header('Location: ' . $version['url'], true, 302);
    exit;
}

while (ob_get_level() > 0) {
    ob_end_clean();
}

$filename = APK_PREFIX . '-v' . preg_replace('/[^0-9A-Za-z._-]/', '', (string) $version['version_name']) . '.apk';

header('Content-Type: application/vnd.android.package-archive');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . filesize($path));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-cache');

readfile($path);
exit;
