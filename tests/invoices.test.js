process.env.NODE_ENV = "test";

const request = require('supertest');
const app = require('../app');
const db = require('../db');

let amazonInvoiceId;

// Setup and Teardown
beforeEach(async () => {
    await db.query(
        `INSERT INTO companies (code, name, description)
        VALUES ('amazon', 'Amazon Inc', 'E-commerce giant'),
               ('google', 'Google LLC', 'Search engine and tech company')`
    );

    const result = await db.query(
        `INSERT INTO invoices (comp_code, amt, paid, add_date, paid_date)
        VALUES ('amazon', 500, false, '2023-09-01', null)
        RETURNING id`
    );
    amazonInvoiceId = result.rows[0].id; // Store the ID of the inserted invoice
});

afterEach(async () => {
    await db.query(`DELETE FROM invoices`);
    await db.query(`DELETE FROM companies`);
});

afterAll(async () => {
    await db.end();
});

// Test GET /invoices
describe('GET /invoices', () => {
    test('It should return a list of invoices', async () => {
        const response = await request(app).get('/invoices');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            invoices: [
                { id: amazonInvoiceId, comp_code: 'amazon' }
            ]
        });
    });
});

// Test GET /invoices/:id
describe('GET /invoices/:id', () => {
    test('It should return a specific invoice by id', async () => {
        const response = await request(app).get(`/invoices/${amazonInvoiceId}`);
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            invoice: {
                id: amazonInvoiceId,
                amt: '500',
                paid: false,
                add_date: expect.any(String), // Accepting any valid date string
                paid_date: null,
                company: {
                    code: 'amazon',
                    name: 'Amazon Inc',
                    description: 'E-commerce giant'
                }
            }
        });
    });

    test('It should return 404 for a non-existent invoice id', async () => {
        const response = await request(app).get('/invoices/999');
        expect(response.statusCode).toBe(404);
    });
});


// Test POST /invoices
describe('POST /invoices', () => {
    test('It should create a new invoice', async () => {
        const response = await request(app)
            .post('/invoices')
            .send({ comp_code: 'google', amt: 300 });
        expect(response.statusCode).toBe(201);
        expect(response.body).toEqual({
            invoice: {
                id: expect.any(Number),
                comp_code: 'google',
                amt: '300',
                paid: false,
                add_date: expect.any(String),
                paid_date: null
            }
        });
    });
});

// Test PUT /invoices/:id
describe('PUT /invoices/:id', () => {
    test('It should update an invoice', async () => {
        const response = await request(app)
            .put(`/invoices/${amazonInvoiceId}`)
            .send({ amt: 600, paid: false });
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            invoice: {
                id: amazonInvoiceId,
                comp_code: 'amazon',
                amt: '600',
                paid: false,
                add_date: expect.any(String),
                paid_date: null
            }
        });
    });
    test('it should update an invoice and set paid_date if paid = true', async () => {
        const response = await request(app)
            .put(`/invoices/${amazonInvoiceId}`)
            .send({ amt: 700, paid: true });
        expect(response.statusCode).toBe(200);
        expect(response.body.invoice.paid).toBe(true);
        expect(response.body.invoice.paid_date).not.toBe(null);
    })
    test('it should update an invoice and set paid_date to null if paid ia false', async () => {
        const response = await request(app)
            .put(`/invoices/${amazonInvoiceId}`)
            .send({ amt: 700, paid: false })
        expect(response.statusCode).toBe(200);
        expect(response.body.invoice.paid).toBe(false);
        expect(response.body.invoice.paid_date).toBe(null);
    })
    test('It should return 404 for a non-existent invoice id', async () => {
        const response = await request(app).put('/invoices/999').send({ amt: 600 });
        expect(response.statusCode).toBe(404);
    });
});

// Test DELETE /invoices/:id
describe('DELETE /invoices/:id', () => {
    test('It should delete an invoice', async () => {
        const response = await request(app).delete(`/invoices/${amazonInvoiceId}`);
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ status: 'deleted' });
    });

    test('It should return 404 for a non-existent invoice id', async () => {
        const response = await request(app).delete('/invoices/999');
        expect(response.statusCode).toBe(404);
    });
});