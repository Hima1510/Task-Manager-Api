const request = require('supertest');
const app = require('../server');

describe('GET /health', () => {
  it('returns 200 and an OK status', async () => {
    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
