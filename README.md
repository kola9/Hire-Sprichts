# Sprichts – plateforme de téléchargement APK

Petit site en PHP natif (sans base de données) pour publier les versions APK de l'appli Sprichts et les installer directement depuis un téléphone.

## Structure

| Fichier / dossier | Rôle |
|---|---|
| `index.php` | Page publique : dernière version, QR code, anciennes versions |
| `download.php` | Envoie l'APK (`?id=latest` = toujours la dernière version) et compte les téléchargements |
| `admin.php` | Connexion, publication et suppression de versions |
| `config.php` | Nom du site, slogan, clé d'installation |
| `data/` | `versions.json` (liste des versions) + `admin.json` (mot de passe haché) — inaccessible depuis le web |
| `apks/` | Les fichiers APK envoyés — inaccessible directement, tout passe par `download.php` |

## Mise en ligne sur InfinityFree

1. Dans `config.php`, remplace `SETUP_KEY` par une valeur longue et secrète.
2. Envoie **tout le contenu** du dossier dans `htdocs/` par FTP (FileZilla) ou avec le gestionnaire de fichiers. N'oublie pas les fichiers `.htaccess` (fichiers cachés).
3. Ouvre `https://ton-site/admin.php`, saisis la clé d'installation et choisis ton mot de passe admin.
4. Publie ta première version : nom (`1.0.0`), numéro de build (le `versionCode` de ton `build.gradle`), APK et notes.

## Limites d'InfinityFree

- **Taille max d'un fichier : 10 Mo.** Si ton APK dépasse 10 Mo, publie-le sur **GitHub Releases** et colle le lien dans le champ « lien externe » : la page et le QR code fonctionnent pareil.
- Leurs conditions d'utilisation interdisent les sites dont le but principal est l'hébergement de fichiers. Une page de téléchargement pour ta propre appli est tolérée en général, mais l'option « lien externe » évite tout souci.

## Test en local

```bash
php -S 127.0.0.1:8000
```
puis ouvre http://127.0.0.1:8000
