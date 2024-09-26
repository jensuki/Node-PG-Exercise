process.env.NODE_ENV = "test";

const request = require('supertest');
const app = require('../app');
const db = require('../db');
const slugify = require('slugify');

let amazonInvoiceId;

// Setup and Teardown
beforeAll(async () => {
    // Create companies, invoices, industries, and companies_industries tables
    await db.query(`
        CREATE TABLE IF NOT EXISTS companies (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS invoices (
            id SERIAL PRIMARY KEY,
            comp_code TEXT NOT NULL REFERENCES companies ON DELETE CASCADE,
            amt NUMERIC NOT NULL,
            paid BOOLEAN DEFAULT FALSE,
            add_date DATE DEFAULT CURRENT_DATE,
            paid_date DATE
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS industries (
            code TEXT PRIMARY KEY,
            industry TEXT NOT NULL
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS companies_industries (
            company_code TEXT NOT NULL REFERENCES companies ON DELETE CASCADE,
            industry_code TEXT NOT NULL REFERENCES industries ON DELETE CASCADE,
            PRIMARY KEY (company_code, industry_code)
        );
    `);
});

beforeEach(async () => {
    // Insert test data into the `companies` table
    await db.query(
        `INSERT INTO companies (code, name, description)
        VALUES ('amazon', 'Amazon Inc', 'E-commerce giant'),
               ('google', 'Google LLC', 'Search engine and tech company')`
    );

    // Insert test data into the `invoices` table
    const result = await db.query(
        `INSERT INTO invoices (comp_code, amt, paid, add_date, paid_date)
        VALUES ('amazon', 500, false, '2023-09-01', null)
        RETURNING id`
    );
    amazonInvoiceId = result.rows[0].id; // Store the ID of the inserted invoice

    // Insert industries into the `industries` table
    await db.query(
        `INSERT INTO industries (code, industry)
        VALUES ('tech', 'Technology'), ('manuf', 'Manufacturing')
        ON CONFLICT DO NOTHING` // avoid duplicate if already exists

    );

    // Associate industries with companies in `companies_industries`
    await db.query(
        `INSERT INTO companies_industries (company_code, industry_code)
        VALUES ('amazon', 'tech'), ('amazon', 'manuf')`
    );
});

afterEach(async () => {
    // Clean up by deleting all entries in `invoices`, `companies`, and `industries`
    await db.query(`DELETE FROM invoices`);
    await db.query(`DELETE FROM companies`);
    await db.query(`DELETE FROM industries`);
    await db.query(`DELETE FROM companies_industries`);
});

afterAll(async () => {
    await db.end();
});

// Test GET /companies
describe('GET /companies', () => {
    test('It should return a list of companies', async () => {
        const response = await request(app).get('/companies');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            companies: [
                { code: 'amazon', name: 'Amazon Inc' },
                { code: 'google', name: 'Google LLC' }
            ]
        });
    });
});

// Test GET /companies/:code
describe('GET /companies/:code', () => {
    test('It should return a specific company by :code', async () => {
        const response = await request(app).get('/companies/amazon');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            company: {
                code: 'amazon',
                name: 'Amazon Inc',
                description: 'E-commerce giant',
                invoices: [amazonInvoiceId], // Use the dynamically captured invoice ID
                industries: ['Technology', 'Manufacturing']
            }
        });
    });
    test('It should return 404 for invalid company code', async () => {
        const response = await request(app).get('/companies/nonexistent');
        expect(response.statusCode).toBe(404);
    });
});

// Test adding a new company
describe('POST /companies', () => {
    test('It should add a new company with slugified code from company name', async () => {
        const companyName = 'Microsoft';
        const expectedCode = slugify(companyName, { lower: true, strict: true });
        const response = await request(app)
            .post(`/companies`)
            .send({ name: companyName, description: 'Tech giant' });
        expect(response.statusCode).toBe(201);
        expect(response.body).toEqual({
            company: {
                code: expectedCode,
                name: 'Microsoft',
                description: 'Tech giant'
            }
        })
    })
})

// Test updating a company
describe('PUT /companies/:code', () => {
    test('it should update a company', async () => {
        const response = await request(app)
            .put('/companies/amazon')
            .send({ name: 'Amazon Corp', description: 'E-commerce giant' })
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            company: {
                code: 'amazon',
                name: 'Amazon Corp',
                description: 'E-commerce giant'
            }
        })
    })
    test('it should return 404 for invalid company', async () => {
        const response = await request(app)
            .put('/companies/nonexistent')
            .send({ name: 'Nonexistent Corp', description: 'Nonexistent company' });
        expect(response.statusCode).toBe(404);
    });
})

describe('DELETE /companies/:code', () => {
    test('It should delete a company', async () => {
        const res = await request(app).delete('/companies/amazon');
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ status: 'deleted' });
    });
});
