/**
 * tests/integration/bugs.test.js
 */
'use strict';

const request = require('supertest');
const app     = require('../../server');

describe('GET /bugs/report (unauthenticated)', () => {
  let res;
  beforeAll(async () => {
    res = await request(app).get('/bugs/report');
  });

  test('redirects to login with 302', async () => {
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/login/);
  });

  test('redirect location includes next= param', async () => {
    expect(res.headers.location).toMatch(/next=/);
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
