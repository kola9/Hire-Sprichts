// Tests de la vérification des jetons Cloudflare Access et des liens d'APK.
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyAccessJwt, isReleaseApkUrl, accessIssuer } from '../public/_worker.js';

const TEAM = 'equipe-test.cloudflareaccess.com';
const ISS = 'https://equipe-test.cloudflareaccess.com';
const AUD = 'aud-de-test-123';
const now = Math.floor(Date.now() / 1000);

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const enc = (obj) => b64url(JSON.stringify(obj));

async function makeKey(kid) {
    const pair = await crypto.subtle.generateKey(
        { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
        true,
        ['sign', 'verify']
    );
    const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
    return { kid, privateKey: pair.privateKey, jwk: { ...jwk, kid, alg: 'RS256', use: 'sig' } };
}

async function sign(key, payload, header = {}) {
    const h = enc({ alg: 'RS256', kid: key.kid, typ: 'JWT', ...header });
    const p = enc(payload);
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key.privateKey, new TextEncoder().encode(`${h}.${p}`));
    return `${h}.${p}.${b64url(sig)}`;
}

const good = await makeKey('k1');
const other = await makeKey('k2');
const fetchJwks = async () => [good.jwk];
const opts = { teamDomain: TEAM, audience: AUD, fetchJwks };
const base = { iss: ISS, aud: [AUD], email: 'moi@example.com', exp: now + 3600, iat: now, nbf: now - 5 };

test('jeton valide accepté', async () => {
    const payload = await verifyAccessJwt(await sign(good, base), opts);
    assert.equal(payload.email, 'moi@example.com');
});

test('aud sous forme de texte accepté', async () => {
    await verifyAccessJwt(await sign(good, { ...base, aud: AUD }), opts);
});

test('mauvaise audience refusée', async () => {
    await assert.rejects(verifyAccessJwt(await sign(good, { ...base, aud: ['autre-appli'] }), opts), /aud/);
});

test('mauvais émetteur refusé', async () => {
    await assert.rejects(verifyAccessJwt(await sign(good, { ...base, iss: 'https://pirate.cloudflareaccess.com' }), opts), /iss/);
});

test('jeton expiré refusé', async () => {
    await assert.rejects(verifyAccessJwt(await sign(good, { ...base, exp: now - 120 }), opts), /exp/);
});

test('jeton pas encore valide refusé', async () => {
    await assert.rejects(verifyAccessJwt(await sign(good, { ...base, nbf: now + 600 }), opts), /nbf/);
});

test('signature par une autre clé refusée', async () => {
    const forged = await sign(other, base, { kid: 'k1' });
    await assert.rejects(verifyAccessJwt(forged, opts), /signature/);
});

test('contenu modifié après signature refusé', async () => {
    const [h, , s] = (await sign(good, base)).split('.');
    const tampered = `${h}.${enc({ ...base, email: 'pirate@example.com' })}.${s}`;
    await assert.rejects(verifyAccessJwt(tampered, opts), /signature/);
});

test('algorithme « none » refusé', async () => {
    const t = `${enc({ alg: 'none', kid: 'k1' })}.${enc(base)}.`;
    await assert.rejects(verifyAccessJwt(t, opts), /alg/);
});

test('clé inconnue refusée (après rechargement des clés)', async () => {
    let calls = 0;
    const t = await sign(other, base);
    await assert.rejects(verifyAccessJwt(t, { ...opts, fetchJwks: async () => { calls++; return [good.jwk]; } }), /kid/);
    assert.equal(calls, 2);
});

test('jeton illisible refusé', async () => {
    await assert.rejects(verifyAccessJwt('pas-un-jeton', opts));
});

test('nom d\'équipe Access normalisé', () => {
    assert.equal(accessIssuer('equipe-test'), ISS);
    assert.equal(accessIssuer('equipe-test.cloudflareaccess.com'), ISS);
    assert.equal(accessIssuer('https://equipe-test.cloudflareaccess.com/'), ISS);
});

test('liens d\'APK : seuls les APK des Releases du dépôt sont acceptés', () => {
    const prefix = 'https://github.com/olabusyness-prog/Sprichts/releases/download/';
    assert.equal(isReleaseApkUrl(prefix + 'v1.0.0/sprichts.apk', prefix), true);
    assert.equal(isReleaseApkUrl(prefix + 'v1.0.0/sprichts.APK', prefix), true);
    assert.equal(isReleaseApkUrl(prefix + 'v1.0.0/notes.txt', prefix), false);
    assert.equal(isReleaseApkUrl(prefix + 'sprichts.apk', prefix), false);
    assert.equal(isReleaseApkUrl(prefix + 'v1/a/b.apk', prefix), false);
    assert.equal(isReleaseApkUrl(prefix + 'v1.0.0/sprichts.apk?x=1', prefix), false);
    assert.equal(isReleaseApkUrl('http://github.com/olabusyness-prog/Sprichts/releases/download/v1/a.apk', prefix), false);
    assert.equal(isReleaseApkUrl('https://github.com/autre/depot/releases/download/v1/a.apk', prefix), false);
    assert.equal(isReleaseApkUrl('https://github.com.pirate.io/olabusyness-prog/Sprichts/releases/download/v1/a.apk', prefix), false);
    assert.equal(isReleaseApkUrl('pas une url', prefix), false);
});
