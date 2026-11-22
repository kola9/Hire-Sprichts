// ============================================================
// Sprichts · site de téléchargement — Worker Cloudflare Pages
//
// N'est appelé QUE pour les chemins listés dans _routes.json :
//   /download.php        → compte le téléchargement puis redirige vers l'APK
//   /api/versions        → liste publique des versions (page d'accueil)
//   /api/admin/*         → administration, protégée par Cloudflare Access
//   /api/admin/codes*    → relayé au service privé « sprichts-codes » (liaison CODES),
//                          qui revérifie le jeton ; ce site n'a aucun accès à la base de l'appli
// Tout le reste (pages, CSS, images) est servi en statique, sans Worker.
//
// Variables (Pages → Settings → Variables and Secrets) :
//   GITHUB_RELEASES_REPO  dépôt public des APK, ex. "olabusyness-prog/Sprichts"
//   ACCESS_TEAM_DOMAIN    secret — ex. "monequipe.cloudflareaccess.com"
//   ACCESS_AUD            secret — « Application Audience (AUD) Tag » de l'appli Access
//   ADMIN_EMAILS          secret — e-mail(s) autorisé(s), séparés par des virgules
// Sans ces trois secrets, l'admin reste FERMÉ (réponse 503).
// ============================================================

const VERSION_NAME_RE = /^[0-9A-Za-z._-]{1,32}$/;
const MAX_NOTES = 5000;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        try {
            if (path === '/download.php') {
                return await handleDownload(request, env, url);
            }
            if (path === '/api/versions') {
                return await handlePublicVersions(request, env);
            }
            if (path === '/api/admin' || path.startsWith('/api/admin/')) {
                return await handleAdmin(request, env, url);
            }
            return env.ASSETS.fetch(request);
        } catch (err) {
            console.error(err && err.stack ? err.stack : err);
            return json({ error: 'Erreur interne du serveur.' }, 500);
        }
    },
};

// ---------- Utilitaires ----------

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff',
        },
    });
}

function text(body, status) {
    return new Response(body, {
        status,
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
}

function releasesPrefix(env) {
    const repo = String(env.GITHUB_RELEASES_REPO || '').trim();
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
        return null;
    }
    return `https://github.com/${repo}/releases/download/`;
}

function newId() {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Téléchargement : /download.php?id=latest | <id> ----------

async function handleDownload(request, env, url) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Méthode non autorisée.', { status: 405, headers: { allow: 'GET, HEAD' } });
    }
    const id = url.searchParams.get('id') || '';
    const row = id === 'latest'
        ? await env.DB.prepare('SELECT id, url FROM versions ORDER BY version_code DESC LIMIT 1').first()
        : await env.DB.prepare('SELECT id, url FROM versions WHERE id = ?').bind(id).first();

    if (!row) {
        return text('Version introuvable.', 404);
    }
    // Seul un vrai téléchargement (GET) est compté, pas les aperçus de liens (HEAD)
    if (request.method === 'GET') {
        await env.DB.prepare('UPDATE versions SET downloads = downloads + 1 WHERE id = ?').bind(row.id).run();
    }
    return new Response(null, { status: 302, headers: { location: row.url, 'cache-control': 'no-store' } });
}

// ---------- Liste publique ----------

async function handlePublicVersions(request, env) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        return json({ error: 'Méthode non autorisée.' }, 405);
    }
    const { results } = await env.DB.prepare(
        'SELECT id, version_name, version_code, notes, size, created_at, downloads FROM versions ORDER BY version_code DESC'
    ).all();
    return json({ versions: results });
}

// ---------- Administration ----------

async function handleAdmin(request, env, url) {
    const auth = await authorizeAdmin(request, env, url);
    if (!auth.ok) {
        return json({ error: auth.error }, auth.status);
    }

    // Anti-CSRF : toute modification doit venir de ce site, en JSON
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        if (request.headers.get('origin') !== url.origin) {
            return json({ error: 'Origine de la requête refusée.' }, 403);
        }
    }

    const path = url.pathname;
    if (path === '/api/admin/codes' || path.startsWith('/api/admin/codes/')) {
        return await handleCodes(request, env, path, auth.token);
    }
    if (path === '/api/admin/me' && request.method === 'GET') {
        return json({ email: auth.email, repo: env.GITHUB_RELEASES_REPO || null, releasesPrefix: releasesPrefix(env) });
    }
    if (path === '/api/admin/versions') {
        if (request.method === 'GET') {
            const { results } = await env.DB.prepare('SELECT * FROM versions ORDER BY version_code DESC').all();
            return json({ versions: results });
        }
        if (request.method === 'POST') {
            return await createVersion(request, env);
        }
        return json({ error: 'Méthode non autorisée.' }, 405);
    }
    const m = path.match(/^\/api\/admin\/versions\/([0-9a-f]{12})$/);
    if (m && request.method === 'DELETE') {
        const row = await env.DB.prepare('SELECT version_name FROM versions WHERE id = ?').bind(m[1]).first();
        if (!row) {
            return json({ error: 'Version introuvable.' }, 404);
        }
        await env.DB.prepare('DELETE FROM versions WHERE id = ?').bind(m[1]).run();
        return json({ ok: true, message: `Version v${row.version_name} supprimée.` });
    }
    return json({ error: 'Introuvable.' }, 404);
}

async function createVersion(request, env) {
    if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) {
        return json({ error: 'Format de requête invalide.' }, 415);
    }
    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Requête illisible.' }, 400);
    }

    const name = String(body.version_name ?? '').trim();
    const codeRaw = String(body.version_code ?? '').trim();
    const notes = String(body.notes ?? '').trim();
    const link = String(body.url ?? '').trim();
    const code = /^\d{1,9}$/.test(codeRaw) ? Number(codeRaw) : NaN;
    const prefix = releasesPrefix(env);
    const errors = [];

    if (!VERSION_NAME_RE.test(name)) {
        errors.push('Nom de version invalide (ex. 1.2.0).');
    }
    if (!Number.isInteger(code) || code < 1) {
        errors.push('Le numéro de build doit être un entier positif.');
    }
    if (notes.length > MAX_NOTES) {
        errors.push(`Notes trop longues (${MAX_NOTES} caractères max).`);
    }
    if (!prefix) {
        errors.push('GITHUB_RELEASES_REPO n\'est pas configuré sur le serveur.');
    } else if (!isReleaseApkUrl(link, prefix)) {
        errors.push(`Le lien doit être un APK des Releases GitHub : ${prefix}<tag>/<fichier>.apk`);
    }
    if (errors.length) {
        return json({ error: errors.join(' ') }, 400);
    }

    const dup = await env.DB.prepare('SELECT 1 FROM versions WHERE version_code = ?').bind(code).first();
    if (dup) {
        return json({ error: `Le build ${code} existe déjà.` }, 409);
    }

    const entry = {
        id: newId(),
        version_name: name,
        version_code: code,
        notes,
        url: link,
        size: await probeSize(link),
        created_at: Math.floor(Date.now() / 1000),
        downloads: 0,
    };
    try {
        await env.DB.prepare(
            'INSERT INTO versions (id, version_name, version_code, notes, url, size, created_at, downloads) VALUES (?, ?, ?, ?, ?, ?, ?, 0)'
        ).bind(entry.id, entry.version_name, entry.version_code, entry.notes, entry.url, entry.size, entry.created_at).run();
    } catch (err) {
        if (String(err && err.message).includes('UNIQUE')) {
            return json({ error: `Le build ${code} existe déjà.` }, 409);
        }
        throw err;
    }
    return json({ ok: true, message: `Version v${name} publiée.`, version: entry }, 201);
}

export function isReleaseApkUrl(link, prefix) {
    let u;
    try {
        u = new URL(link);
    } catch {
        return false;
    }
    if (u.protocol !== 'https:' || u.search || u.hash || u.username || u.password) {
        return false;
    }
    const href = u.origin + u.pathname;
    if (!href.startsWith(prefix)) {
        return false;
    }
    // <tag>/<fichier>.apk — exactement deux segments après le préfixe
    const rest = href.slice(prefix.length).split('/');
    return rest.length === 2 && rest[0] !== '' && /\.apk$/i.test(rest[1]);
}

/** Taille de l'APK (best effort) : HEAD sur le lien GitHub, redirections suivies. */
async function probeSize(link) {
    try {
        const res = await fetch(link, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(5000) });
        const len = Number(res.headers.get('content-length'));
        return res.ok && Number.isFinite(len) && len > 0 ? len : null;
    } catch {
        return null;
    }
}

// ---------- Codes d'accès : relais vers le service privé ----------

const MAX_CODES_BODY = 2_000_000; // le ticket joint à l'e-mail

/** Les seules routes « codes » : méthode + chemin → action du service. */
export function codesRoute(method, path) {
    if (path === '/api/admin/codes') {
        return method === 'GET' ? { action: 'list' } : method === 'POST' ? { action: 'create' } : null;
    }
    const m = path.match(/^\/api\/admin\/codes\/([0-9a-f]{24})(\/email)?$/);
    if (!m) return null;
    if (m[2]) return method === 'POST' ? { action: 'email', id: m[1] } : null;
    return method === 'PUT' ? { action: 'update', id: m[1] } : null;
}

async function handleCodes(request, env, path, token) {
    const route = codesRoute(request.method, path);
    if (!route) {
        return json({ error: 'Introuvable.' }, 404);
    }
    if (!env.CODES) {
        return json({ error: 'Le service des codes n\'est pas disponible ici.' }, 503);
    }
    let input = {};
    if (route.action !== 'list') {
        if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) {
            return json({ error: 'Format de requête invalide.' }, 415);
        }
        if (Number(request.headers.get('content-length')) > MAX_CODES_BODY) {
            return json({ error: 'Requête trop lourde.' }, 413);
        }
        try {
            input = await request.json();
        } catch {
            return json({ error: 'Requête illisible.' }, 400);
        }
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
            return json({ error: 'Requête illisible.' }, 400);
        }
        if (route.id) {
            input = { ...input, id: route.id };
        }
    }
    const result = await env.CODES.admin(token ?? null, route.action, input);
    return json(result.body, result.status);
}

// ---------- Cloudflare Access : vérification du jeton ----------

async function authorizeAdmin(request, env, url) {
    // Développement local uniquement (wrangler pages dev) : jamais sur *.pages.dev
    if (env.DEV_BYPASS_ACCESS === '1' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
        return { ok: true, email: 'dev@localhost' };
    }

    const teamDomain = String(env.ACCESS_TEAM_DOMAIN || '').trim();
    const audience = String(env.ACCESS_AUD || '').trim();
    const allowed = String(env.ADMIN_EMAILS || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    if (!teamDomain || !audience || !allowed.length) {
        return { ok: false, status: 503, error: 'Protection Cloudflare Access non configurée : espace admin fermé.' };
    }

    const token = request.headers.get('cf-access-jwt-assertion') || readCookie(request, 'CF_Authorization');
    if (!token) {
        return { ok: false, status: 401, error: 'Connexion Cloudflare Access requise.' };
    }

    let payload;
    try {
        payload = await verifyAccessJwt(token, { teamDomain, audience });
    } catch {
        return { ok: false, status: 401, error: 'Jeton Cloudflare Access invalide ou expiré.' };
    }
    const email = String(payload.email || '').toLowerCase();
    if (!allowed.includes(email)) {
        return { ok: false, status: 403, error: 'Ce compte n\'est pas autorisé.' };
    }
    return { ok: true, email, token };
}

function readCookie(request, name) {
    const cookie = request.headers.get('cookie') || '';
    for (const part of cookie.split(';')) {
        const i = part.indexOf('=');
        if (i > -1 && part.slice(0, i).trim() === name) {
            return part.slice(i + 1).trim();
        }
    }
    return null;
}

export function accessIssuer(teamDomain) {
    let d = String(teamDomain).trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (!d.includes('.')) {
        d += '.cloudflareaccess.com';
    }
    return `https://${d}`;
}

function b64urlToBytes(s) {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        out[i] = bin.charCodeAt(i);
    }
    return out;
}

function b64urlToJson(s) {
    return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}

const jwksCache = new Map(); // issuer -> { keys, at }

async function defaultFetchJwks(issuer, force) {
    const hit = jwksCache.get(issuer);
    if (!force && hit && Date.now() - hit.at < 3600_000) {
        return hit.keys;
    }
    const res = await fetch(`${issuer}/cdn-cgi/access/certs`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
        throw new Error(`certs HTTP ${res.status}`);
    }
    const { keys } = await res.json();
    jwksCache.set(issuer, { keys, at: Date.now() });
    return keys;
}

/**
 * Vérifie un jeton Cloudflare Access (RS256) : signature, émetteur, audience, dates.
 * Retourne le contenu du jeton, ou lève une erreur.
 */
export async function verifyAccessJwt(token, { teamDomain, audience, now = Date.now() / 1000, fetchJwks = defaultFetchJwks }) {
    const parts = String(token).split('.');
    if (parts.length !== 3) {
        throw new Error('format');
    }
    const header = b64urlToJson(parts[0]);
    const payload = b64urlToJson(parts[1]);
    if (header.alg !== 'RS256' || !header.kid) {
        throw new Error('alg');
    }

    const issuer = accessIssuer(teamDomain);
    let keys = await fetchJwks(issuer, false);
    let jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) {
        keys = await fetchJwks(issuer, true); // rotation des clés
        jwk = keys.find((k) => k.kid === header.kid);
    }
    if (!jwk) {
        throw new Error('kid');
    }

    const key = await crypto.subtle.importKey(
        'jwk',
        { kty: jwk.kty, n: jwk.n, e: jwk.e },
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify']
    );
    const valid = await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        key,
        b64urlToBytes(parts[2]),
        new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
    if (!valid) {
        throw new Error('signature');
    }
    if (payload.iss !== issuer) {
        throw new Error('iss');
    }
    const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!auds.includes(audience)) {
        throw new Error('aud');
    }
    if (typeof payload.exp !== 'number' || payload.exp < now - 30) {
        throw new Error('exp');
    }
    if (typeof payload.nbf === 'number' && payload.nbf > now + 30) {
        throw new Error('nbf');
    }
    return payload;
}
