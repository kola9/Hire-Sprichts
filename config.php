<?php
// ------------------------------------------------------------
// Configuration de la plateforme Sprichts
//
// Les valeurs SECRÈTES (SETUP_KEY, ADMIN_KEY) se mettent dans
// config.local.php : ce fichier n'est pas versionné dans Git,
// mais doit être envoyé sur l'hébergeur avec le reste du site.
// ------------------------------------------------------------

if (is_file(__DIR__ . '/config.local.php')) {
    require __DIR__ . '/config.local.php';
}

// Nom et slogan affichés sur la page publique
defined('SITE_NAME') || define('SITE_NAME', 'Sprichts');
defined('SITE_TAGLINE') || define('SITE_TAGLINE', "Apprends l'allemand, une phrase à la fois.");

// Clé demandée UNE SEULE FOIS pour créer le mot de passe admin
// (sur l'espace admin, à la première visite).
defined('SETUP_KEY') || define('SETUP_KEY', 'change-moi-avant-de-mettre-en-ligne');

// Clé secrète d'accès à l'espace admin : il n'est joignable que par
// admin.php?k=ADMIN_KEY. Sans la bonne clé, la page répond « 404 ».
// Vide = espace admin totalement fermé.
defined('ADMIN_KEY') || define('ADMIN_KEY', '');

// Préfixe des fichiers APK enregistrés sur le serveur
defined('APK_PREFIX') || define('APK_PREFIX', 'sprichts');
