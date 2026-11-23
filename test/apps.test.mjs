// Deux applis (A2 / B1) : migration, téléchargements, liste publique, publication.
// Base SQLite en mémoire avec les vraies migrations ; aucune production.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker, { appParam, releaseTag } from '../public/_worker.js';

const PREFIX = 'https://github.com/olabusyness-prog/Sprichts/releases/download/';

function d1(upTo = Infinity) {
    const db = new DatabaseSync(':memory:');
    const files = fs.readdirSync(new URL('../migrations/', import.meta.url)).sort();
    const apply = (f) => db.exec(fs.readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8'));
    files.slice(0, upTo).forEach(apply);
    const prepare = (sql, args = []) => ({
        bind: (...a) => prepare(sql, a),
        all: async () => ({ results: db.prepare(sql).all(...args).map((r) => ({ ...r })) }),
        first: async () => db.prepare(sql).get(...args) ?? null,
        run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }),
    });
    return { db, prepare, migrateRest: () => files.slice(upTo).forEach(apply) };
}

// Les deux versions A2 réellement en ligne avant la migration
function production() {
    const DB = d1(1);
    const ins = DB.db.prepare('INSERT INTO versions (id, version_name, version_code, notes, url, size, created_at, downloads) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    ins.run('4e11e81c021e', '1.0.0', 1, 'Première version', `${PREFIX}v1.0.0/Sprichts.apk`, 186822867, 1794755216, 20);
    ins.run('4168dcfd0dcf', '1.3.0', 2007, 'Nouvelle apparence', `${PREFIX}v1.3.0/Sprichts.apk`, 55148648, 1795423567, 1);
    const before = DB.db.prepare('SELECT * FROM versions ORDER BY id').all();
    DB.migrateRest();
    return { DB, before };
}

const get = (env, path, init) => worker.fetch(new Request(`https://sprichts-download.pages.dev${path}`, init), env);

test('migration : rien de perdu, tout devient A2', () => {
    const { DB, before } = production();
    const after = DB.db.prepare('SELECT * FROM versions ORDER BY id').all();
    assert.equal(after.length, before.length);
    for (const [i, row] of after.entries()) {
        assert.equal(row.app, 'a2');
        const { app, ...rest } = row;
        assert.deepEqual({ ...rest }, { ...before[i] });
    }
});

test('build unique par appli, plus pour tout le site ; appli contrôlée', () => {
    const { DB } = production();
    const ins = DB.db.prepare('INSERT INTO versions (id, app, version_name, version_code, url, created_at) VALUES (?, ?, ?, ?, ?, 0)');
    ins.run('b1b1b1b1b1b1', 'b1', '1.0.0', 2007, `${PREFIX}b1-v1.0.0/Sprichts-B1.apk`);
    assert.throws(() => ins.run('a2a2a2a2a2a2', 'a2', '9.9.9', 2007, `${PREFIX}v9.9.9/x.apk`), /UNIQUE/);
    assert.throws(() => ins.run('c1c1c1c1c1c1', 'c1', '1.0.0', 1, `${PREFIX}c1/x.apk`), /CHECK/);
});

test('les liens déjà partagés mènent toujours à l\'A2', async () => {
    const { DB } = production();
    DB.db.prepare("INSERT INTO versions (id, app, version_name, version_code, url, created_at) VALUES ('b1b1b1b1b1b1', 'b1', '1.0.0', 9999, ?, 0)").run(`${PREFIX}b1-v1.0.0/Sprichts-B1.apk`);
    const env = { DB };
    for (const path of ['/download.php?id=latest', '/download.php?app=a2&id=latest']) {
        const r = await get(env, path, { method: 'HEAD' });
        assert.equal(r.status, 302, path);
        assert.equal(r.headers.get('location'), `${PREFIX}v1.3.0/Sprichts.apk`, path);
    }
    assert.equal((await get(env, '/download.php?id=4e11e81c021e', { method: 'HEAD' })).headers.get('location'), `${PREFIX}v1.0.0/Sprichts.apk`);
    const b1 = await get(env, '/download.php?app=b1&id=latest', { method: 'HEAD' });
    assert.equal(b1.headers.get('location'), `${PREFIX}b1-v1.0.0/Sprichts-B1.apk`);
    assert.equal((await get(env, '/download.php?app=c1&id=latest')).status, 404);
});

test('B1 sans version : 404, et l\'A2 n\'est pas touché', async () => {
    const { DB } = production();
    assert.equal((await get({ DB }, '/download.php?app=b1&id=latest')).status, 404);
    assert.equal(DB.db.prepare('SELECT SUM(downloads) AS n FROM versions').get().n, 21);
});

test('compteur : la bonne version, seulement en GET', async () => {
    const { DB } = production();
    await get({ DB }, '/download.php?id=latest');
    await get({ DB }, '/download.php?id=latest', { method: 'HEAD' });
    assert.equal(DB.db.prepare("SELECT downloads FROM versions WHERE id = '4168dcfd0dcf'").get().downloads, 2);
    assert.equal(DB.db.prepare("SELECT downloads FROM versions WHERE id = '4e11e81c021e'").get().downloads, 20);
});

test('liste publique : l\'appli de chaque version', async () => {
    const { DB } = production();
    const { versions } = await (await get({ DB }, '/api/versions')).json();
    assert.deepEqual(versions.map((v) => `${v.app} ${v.version_name}`), ['a2 1.3.0', 'a2 1.0.0']);
});

test('tags : A2 « v1.4.0 », B1 « b1-v1.0.0 », les voix jamais', () => {
    assert.equal(releaseTag(`${PREFIX}v1.3.0/Sprichts.apk`, PREFIX), 'v1.3.0');
    assert.equal(releaseTag(`${PREFIX}b1-v1.0.0/Sprichts-B1.apk`, PREFIX), 'b1-v1.0.0');
    assert.equal(appParam(null), 'a2');
    assert.equal(appParam(''), 'a2');
    assert.equal(appParam('b1'), 'b1');
    assert.equal(appParam('B1'), null);
    assert.equal(appParam('__proto__'), null);
});

test('publier : l\'APK doit être de la bonne appli', async () => {
    const { DB } = production();
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, { status: 200, headers: { 'content-length': '1234' } });
    try {
        const env = { DB, DEV_BYPASS_ACCESS: '1', GITHUB_RELEASES_REPO: 'olabusyness-prog/Sprichts' };
        const publish = (body) =>
            worker.fetch(new Request('http://localhost/api/admin/versions', {
                method: 'POST',
                headers: { 'content-type': 'application/json', origin: 'http://localhost' },
                body: JSON.stringify({ version_name: '1.0.0', version_code: 1, notes: '', ...body }),
            }), env);
        const err = async (body) => (await (await publish(body)).json()).error || '';
        assert.match(await err({ url: `${PREFIX}b1-v1.0.0/Sprichts-B1.apk` }), /Choisis l'appli/);
        assert.match(await err({ app: 'a2', url: `${PREFIX}b1-v1.0.0/Sprichts-B1.apk` }), /pas une release Sprichts A2/);
        assert.match(await err({ app: 'b1', url: `${PREFIX}v1.3.0/Sprichts.apk` }), /pas une release Sprichts B1/);
        assert.match(await err({ app: 'b1', url: `${PREFIX}voix-v1/kerstin.apk` }), /pas une release Sprichts B1/);
        // Le même build que l'A2 1.0.0 : permis pour le B1
        const ok = await publish({ app: 'b1', url: `${PREFIX}b1-v1.0.0/Sprichts-B1.apk` });
        assert.equal(ok.status, 201);
        assert.equal((await ok.json()).message, 'Sprichts B1 v1.0.0 publiée.');
        assert.match(await err({ app: 'b1', version_name: '1.0.1', url: `${PREFIX}b1-v1.0.1/Sprichts-B1.apk` }), /existe déjà pour Sprichts B1/);
        assert.equal(DB.db.prepare("SELECT app FROM versions WHERE url LIKE '%b1-v1.0.0%'").get().app, 'b1');
    } finally {
        globalThis.fetch = realFetch;
    }
});
