// Relais des codes : seules les routes prévues existent, rien sans Access.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { codesRoute } from '../public/_worker.js';

const id = 'a'.repeat(24);

test('routes des codes : seulement celles prévues', () => {
    assert.deepEqual(codesRoute('GET', '/api/admin/codes'), { action: 'list' });
    assert.deepEqual(codesRoute('POST', '/api/admin/codes'), { action: 'create' });
    assert.deepEqual(codesRoute('PUT', '/api/admin/codes/' + id), { action: 'update', id });
    assert.deepEqual(codesRoute('POST', '/api/admin/codes/' + id + '/email'), { action: 'email', id });
    for (const a of ['devices', 'release']) {
        assert.deepEqual(codesRoute('POST', '/api/admin/codes/' + a), { action: a });
        assert.deepEqual(codesRoute('POST', '/api/admin/codes/' + id + '/' + a), { action: a, id });
        assert.equal(codesRoute('GET', '/api/admin/codes/' + a), null);
        assert.equal(codesRoute('DELETE', '/api/admin/codes/' + id + '/' + a), null);
    }
    for (const [m, p] of [['DELETE', '/api/admin/codes/' + id], ['GET', '/api/admin/codes/' + id], ['PUT', '/api/admin/codes'], ['POST', '/api/admin/codes/x/email'], ['POST', '/api/admin/codes/' + id + '/autre']]) {
        assert.equal(codesRoute(m, p), null);
    }
});

test('sans Access, le service privé n\'est jamais appelé', async () => {
    let calls = 0;
    const CODES = { admin: async () => (calls++, { status: 200, body: {} }) };
    const access = { ACCESS_TEAM_DOMAIN: 'equipe', ACCESS_AUD: 'aud', ADMIN_EMAILS: 'a@example.com' };
    const url = 'https://sprichts-download.pages.dev/api/admin/codes';
    assert.equal((await worker.fetch(new Request(url), { CODES })).status, 503);
    assert.equal((await worker.fetch(new Request(url), { CODES, ...access })).status, 401);
    assert.equal((await worker.fetch(new Request(url, { method: 'POST', body: '{}' }), { CODES, ...access })).status, 401);
    assert.equal((await worker.fetch(new Request(url + '/release', { method: 'POST', body: '{}' }), { CODES, ...access })).status, 401);
    assert.equal(calls, 0);
});
