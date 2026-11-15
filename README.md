# Sprichts – site de téléchargement de l'appli

Site vitrine et de téléchargement de l'appli Android **Sprichts**, hébergé sur **Cloudflare Pages** (gratuit).

- Les **APK** sont publiés dans les **GitHub Releases** du dépôt public [`olabusyness-prog/Sprichts`](https://github.com/olabusyness-prog/Sprichts/releases). Le site n'enregistre que les liens.
- La **liste des versions** et les **compteurs** sont dans une base **Cloudflare D1**.
- L'**admin** (`/admin/`) est protégé par **Cloudflare Access** (connexion par e-mail + code à usage unique) et chaque appel d'admin revérifie le jeton Access.

## Structure

| Fichier / dossier | Rôle |
|---|---|
| `public/index.html` + `public/assets/site.js` | Page publique ; la dernière version, le QR code et l'historique viennent de `/api/versions` |
| `public/admin/index.html` | Tableau de bord : publier un lien GitHub Releases, supprimer une version, voir les compteurs |
| `public/_worker.js` | Le seul code serveur : `/download.php`, `/api/versions`, `/api/admin/*` |
| `public/_routes.json` | Limite le Worker à ces chemins : tout le reste est statique (gratuit et illimité) |
| `public/_headers`, `_redirects`, `404.html` | En-têtes de sécurité, anciennes adresses `.php`, page introuvable |
| `migrations/` | Schéma de la base D1 |
| `test/` | Tests (jeton Access, liens autorisés) : `npm test` |

## Adresses

| Adresse | Effet |
|---|---|
| `/` | Page publique |
| `/download.php?id=latest` | Compte le téléchargement et redirige vers l'APK le plus récent (lien du QR code) |
| `/download.php?id=<id>` | Idem pour une version précise |
| `/admin/` | Administration (Cloudflare Access) |

## Publier une nouvelle version

1. Sur GitHub : **Releases › Draft a new release**, tag `v1.2.0`, glisse le `.apk`, **Publish release**.
2. Sur `/admin/` : choisis l'APK dans la liste, indique le build (`versionCode` du `build.gradle`), **Publier**.

Seuls les liens `https://github.com/olabusyness-prog/Sprichts/releases/download/<tag>/<fichier>.apk` sont acceptés.

## Développement local

```bash
npm install
cp .dev.vars.example .dev.vars        # ouvre l'admin sans Access, UNIQUEMENT sur localhost
npm run db:migrate:local
npm run dev                           # http://127.0.0.1:8788
npm test
```

## Configuration Cloudflare (une seule fois)

Projet Pages **séparé** : `sprichts-download`. Il ne touche à aucun autre projet du compte.

1. `npx wrangler d1 create sprichts-download`, puis reporter le `database_id` dans `wrangler.toml`.
2. `npm run db:migrate:remote`
3. `npx wrangler pages project create sprichts-download --production-branch main`
4. Cloudflare Zero Trust › Access › Applications › **Self-hosted** « Sprichts download admin » : chemins `admin` et `api/admin` sur `sprichts-download.pages.dev` **et** `*.sprichts-download.pages.dev` (adresses de test), règle « Emails = ton e-mail », connexion **One-time PIN**.
5. Secrets (jamais dans Git) :
   ```bash
   npx wrangler pages secret put ACCESS_TEAM_DOMAIN --project-name sprichts-download   # ex. monequipe.cloudflareaccess.com
   npx wrangler pages secret put ACCESS_AUD         --project-name sprichts-download   # « Application Audience (AUD) Tag »
   npx wrangler pages secret put ADMIN_EMAILS       --project-name sprichts-download   # ton e-mail
   ```
6. `npm run deploy`

Tant que ces trois secrets ne sont pas définis, l'admin reste **fermé** (réponse 503).

## Ancienne version PHP

La version PHP (prévue pour InfinityFree, jamais mise en ligne) est conservée dans Git sous le tag `avant-cloudflare`.
