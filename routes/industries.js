const express = require('express');
const router = new express.Router();
const db = require('../db'); // db client connection
const ExpressError = require('../expressError');

// get a list of industries
router.get('/', async (req, resp, next) => {
    try {
        const results = await db.query(`SELECT code, industry FROM industries`);
        return resp.json({ industries: results.rows })
    } catch (err) {
        return next(err);
    }
})

// adding a new industry
router.post('/', async (req, resp, next) => {
    try {
        const { code, industry } = req.body;
        const result = await db.query(`
            INSERT INTO industries (code, industry) VALUES ($1, $2)
            RETURNING code, industry`, [code, industry]);
        return resp.status(201).json({ industry: result.rows[0] });
    } catch (err) {
        return next(err);
    }
})

// route to associate an industry with a company
router.post('/:code/companies', async (req, resp, next) => {
    try {
        const { code } = req.params; // industry code from route params
        const { company_code } = req.body; // company code from req body

        // check if industry exists
        const industryCheck = await db.query(`
            SELECT code FROM industries WHERE code = $1`, [code]);
        if (industryCheck.rows.length === 0) {
            throw new ExpressError(`Industry with code ${code} not found`, 404);
        }

        // check if company exists
        const companyCheck = await db.query(`
            SELECT code FROM companies WHERE code = $1`, [company_code]);
        if (companyCheck.rows.length === 0) {
            throw new ExpressError(`Company with code ${company_code} not found`, 404);
        }

        // check if the association already exists
        const associationCheck = await db.query(`
            SELECT * FROM companies_industries WHERE company_code = $1 AND industry_code = $2`,
            [company_code, code]);

        if (associationCheck.rows.length > 0) {
            return resp.status(400).json({ error: "Company is already associated with this industry" });
        }

        // associate company with industry in join table
        const result = await db.query(`
            INSERT INTO companies_industries (company_code, industry_code)
            VALUES ($1, $2)
            RETURNING company_code, industry_code`, [company_code, code]);

        return resp.status(201).json({ association: result.rows[0] });
    } catch (err) {
        return next(err);
    }
});

// Get companies associated with a specific industry
router.get('/:code/companies', async (req, resp, next) => {
    try {
        const { code } = req.params;

        const industryResults = await db.query(
            `SELECT industry FROM industries WHERE code = $1`, [code]);

        if (industryResults.rows.length === 0) {
            throw new ExpressError(`Industry with code ${code} not found`, 404);
        }

        const companyResults = await db.query(
            `SELECT c.code, c.name FROM companies AS c
             JOIN companies_industries AS ci ON c.code = ci.company_code
             WHERE ci.industry_code = $1`, [code]);

        return resp.json({
            industry: industryResults.rows[0].industry,
            companies: companyResults.rows.map(c => ({ code: c.code, name: c.name }))
        });
    } catch (err) {
        return next(err);
    }
});


module.exports = router;