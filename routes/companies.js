// CRUD operations for companies

const express = require('express');
const router = new express.Router();
const db = require('../db'); // db client connection
const ExpressError = require('../expressError');

// Get a list of companies
router.get('/', async (req, resp, next) => {
    try {
        const results = await db.query(`SELECT code, name FROM companies`);
        return resp.json({ 'companies': results.rows });
    } catch (err) {
        return next(err);
    };
});

// Get a specific company
router.get('/:code', async (req, resp, next) => {
    try {
        const { code } = req.params;

        const companyResults = await db.query(
            `SELECT code, name, description
            FROM companies
            WHERE code=$1`, [code]);

        if (companyResults.rows.length === 0) {
            throw new ExpressError(`Company with code ${code} not found`, 404);
        }

        const invoiceResults = await db.query(
            `SELECT id
            FROM invoices
            WHERE comp_code=$1`, [code]);

        const company = companyResults.rows[0];
        const invoices = invoiceResults.rows.map(invoice => invoice.id);

        // return company info along with invoice ids
        return resp.json({
            company: {
                code: company.code,
                name: company.name,
                description: company.description,
                invoices: invoices
            }
        })

    } catch (err) {
        return next(err);
    };
});

// Add a new company
router.post('/', async (req, resp, next) => {
    try {
        const { code, name, description } = req.body;
        const results = await db.query(`INSERT INTO companies (code, name, description)
            VALUES ($1, $2, $3)
            RETURNING code, name, description`, [code, name, description]);
        return resp.status(201).json({ 'company': results.rows[0] });
    } catch (err) {
        return next(err);
    };
});

// Update an existing company
router.put('/:code', async (req, resp, next) => {
    try {
        const { code } = req.params;
        let { name, description } = req.body;
        const results = await db.query(`UPDATE companies SET name=$1, description=$2 WHERE code=$3
            RETURNING name, description, code`, [name, description, code]);

        if (results.rows.length === 0) {
            throw new ExpressError(`Company with code ${code} not found`, 404);
        }
        return resp.json({ 'company': results.rows[0] })
    } catch (err) {
        return next(err);
    }
})

// Delete a company
router.delete('/:code', async (req, resp, next) => {
    try {
        const { code } = req.params;
        const results = await db.query(`DELETE FROM companies WHERE code=$1 RETURNING code`, [code]);

        if (results.rows.length === 0) {
            throw new ExpressError(`Company with code ${code} not found`, 404);
        }
        return resp.json({ status: 'deleted' });
    } catch (err) {
        return next(err);
    }
})


module.exports = router;