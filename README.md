# Sprichts – plateforme de téléchargement APK

Petit site en PHP natif (sans base de données) pour publier les versions APK de l'appli Sprichts et les installer directement depuis un téléphone.

## Structure

| Fichier / dossier | Rôle |
|---|---|
| `index.php` | Page publique : dernière version, QR code, anciennes versions |
| `download.php` | Envoie l'APK (`?id=latest` = toujours la dernière version) et compte les téléchargements |
| `admin.php` | Connexion, publication et suppression de versions — **accès caché** (voir plus bas) |
| `config.php` | Nom du site, slogan, valeurs par défaut |
| `config.local.php` | **Secrets** (`ADMIN_KEY`, `SETUP_KEY`) — hors Git, à créer et à envoyer sur l'hébergeur |
| `data/` | `versions.json` (liste des versions) + `admin.json` (mot de passe haché) — inaccessible depuis le web |
| `apks/` | Les fichiers APK envoyés — inaccessible directement, tout passe par `download.php` |

## Mise en ligne sur InfinityFree

1. Crée `config.local.php` (il n'est pas dans Git) avec deux valeurs longues et aléatoires :
   ```php
   <?php
   define('ADMIN_KEY', 'une-cle-secrete-pour-entrer-dans-l-admin');
   define('SETUP_KEY', 'une-autre-cle-pour-creer-le-mot-de-passe');
   ```
2. Envoie **tout le contenu** du dossier dans `htdocs/` par FTP (FileZilla) ou avec le gestionnaire de fichiers, **y compris `config.local.php`**. N'oublie pas les fichiers `.htaccess` (fichiers cachés).
3. Ouvre `https://ton-site/admin.php?k=TON_ADMIN_KEY`, saisis la `SETUP_KEY` et choisis ton mot de passe admin.
4. Publie ta première version : nom (`1.0.0`), numéro de build (le `versionCode` de ton `build.gradle`), APK et notes.

## Accès à l'espace admin (caché)

Aucun lien vers l'admin n'apparaît sur le site. Pour y entrer :

- Ouvre **`admin.php?k=ADMIN_KEY`** (mets cette adresse en favori). La clé disparaît aussitôt de la barre d'adresse et la session reste ouverte.
- Sans la bonne clé, `admin.php` répond **404**, comme si la page n'existait pas.
- La connexion par mot de passe reste obligatoire derrière : la clé cache la page, le mot de passe la protège.
- Pour changer d'accès (clé divulguée…), modifie `ADMIN_KEY` dans `config.local.php`.

## Limites d'InfinityFree

- **Taille max d'un fichier : 10 Mo.** Si ton APK dépasse 10 Mo, publie-le sur **GitHub Releases** et colle le lien dans le champ « lien externe » : la page et le QR code fonctionnent pareil.
- Leurs conditions d'utilisation interdisent les sites dont le but principal est l'hébergement de fichiers. Une page de téléchargement pour ta propre appli est tolérée en général, mais l'option « lien externe » évite tout souci.

## Test en local

```bash
php -S 127.0.0.1:8000
```
puis ouvre http://127.0.0.1:8000
