const express = require('express');
const router = new express.Router();
const db = require('../db'); // db client connection
const ExpressError = require('../expressError');

// Get all invoices info
router.get('/', async (req, resp, next) => {
    try {
        const results = await db.query(`SELECT id, comp_code FROM invoices`);
        return resp.json({ 'invoices': results.rows })
    } catch (err) {
        return next(err);
    };
});

// Get a specific invoice
router.get('/:id', async (req, resp, next) => {
    try {
        const { id } = req.params;
        const results = await db.query(
            `SELECT invoices.id, invoices.amt, invoices.paid, invoices.add_date, invoices.paid_date,
            companies.code, companies.name, companies.description
            FROM invoices JOIN companies
            ON invoices.comp_code = companies.code
            WHERE invoices.id = $1`, [id]);

        if (results.rows.length === 0) {
            throw new ExpressError(`Invoice with id ${id} not found`, 404);
        }

        const data = results.rows[0];
        const invoice = {
            id: data.id,
            amt: data.amt,
            paid: data.paid,
            add_date: data.add_date,
            paid_date: data.paid_date,
            company: {
                code: data.code,
                name: data.name,
                description: data.description
            }
        }
        return resp.json({ invoice })

    } catch (err) {
        return next(err);
    }
})

// Add a new invoice
router.post('/', async (req, resp, next) => {
    try {
        const { comp_code, amt } = req.body;
        const results = await db.query(`INSERT INTO invoices (comp_code, amt)
            VALUES ($1, $2) RETURNING id, comp_code, amt, paid, add_date, paid_date`, [comp_code, amt]);
        return resp.status(201).json({ 'invoice': results.rows[0] });
    } catch (err) {
        return next(err);
    }
})

// Update an invoice
router.put('/:id', async (req, resp, next) => {
    try {
        const { id } = req.params;
        const { amt } = req.body;
        const results = await db.query(`UPDATE invoices SET amt=$1 WHERE id=$2
            RETURNING id, comp_code, amt, paid, add_date, paid_date`, [amt, id]);

        if (results.rows.length === 0) {
            throw new ExpressError(`Invoice with id ${id} not found`, 404);
        }
        return resp.json({ 'invoice': results.rows[0] })
    } catch (err) {
        return next(err);
    }
})

// Delete an invoice
router.delete('/:id', async (req, resp, next) => {
    try {
        const { id } = req.params;
        const results = await db.query(`DELETE FROM invoices WHERE id=$1
            RETURNING id`, [id]);

        if (results.rows.length === 0) {
            throw new ExpressError(`Invoice with id ${id} not found`, 404);
        }
        return resp.json({ status: 'deleted' })
    } catch (err) {
        return next(err);
    }
});


module.exports = router;

