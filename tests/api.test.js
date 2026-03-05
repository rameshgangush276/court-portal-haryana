const request = require('supertest');
const app = require('../server/index');

describe('API Auth Flow', () => {
    let devToken;

    it('should authenticate the developer user', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ username: 'developer', password: 'admin123' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.user.role).toEqual('developer');
        devToken = res.body.token;
    });

    it('should fail authentication with wrong password', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ username: 'developer', password: 'wrongpassword' });

        expect(res.statusCode).toEqual(401);
    });

    it('should get current user profile using token', async () => {
        const res = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${devToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.user.username).toEqual('developer');
    });

    it('should fetch districts using developer token', async () => {
        const res = await request(app)
            .get('/api/v1/districts')
            .set('Authorization', `Bearer ${devToken}`);

        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body.districts)).toBeTruthy();
        expect(res.body.districts.length).toBeGreaterThan(0);
    });

    it('should fail to fetch districts without auth', async () => {
        const res = await request(app)
            .get('/api/v1/districts');

        expect(res.statusCode).toEqual(401);
    });
});
