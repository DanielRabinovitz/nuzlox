/**
 * tests/integration/bugs.test.js
 */
'use strict';

const request = require('supertest');
const app     = require('../../server');

describe('GET /bugs/report', () => {
  test('redirects unauthenticated users to login', async () => {
    const res = await request(app).get('/bugs/report');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/login/);
  });
});

describe('POST /bugs/report', () => {
  test('redirects unauthenticated users to login', async () => {
    const res = await request(app)
      .post('/bugs/report')
      .send('title=Test&description=Test+bug+description+here');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/login/);
  });
});

describe('GET /bugs/report redirect contains next param', () => {
  test('redirect location includes encoded return path', async () => {
    const res = await request(app).get('/bugs/report');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/next=/);
  });
});
