import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

test('GET /health returns status ok', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { status: 'ok' });
});
