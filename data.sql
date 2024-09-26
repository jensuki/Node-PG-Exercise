\c biztime

-- Drop tables if they exist
DROP TABLE IF EXISTS companies_industries;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS industries;

-- Create the companies table
CREATE TABLE companies (
    code text PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text
);

-- Create the invoices table
CREATE TABLE invoices (
    id serial PRIMARY KEY,
    comp_code text NOT NULL REFERENCES companies(code) ON DELETE CASCADE,
    amt float NOT NULL,
    paid boolean DEFAULT false NOT NULL,
    add_date date DEFAULT CURRENT_DATE NOT NULL,
    paid_date date,
    CONSTRAINT invoices_amt_check CHECK ((amt > (0)::double precision))
);

-- Create the industries table
CREATE TABLE industries (
  code TEXT PRIMARY KEY,
  industry TEXT NOT NULL
);

-- Create the join table between companies and industries
CREATE TABLE companies_industries (
  company_code TEXT NOT NULL REFERENCES companies(code) ON DELETE CASCADE,
  industry_code TEXT NOT NULL REFERENCES industries(code) ON DELETE CASCADE,
  PRIMARY KEY (company_code, industry_code)
);

-- Insert companies
INSERT INTO companies
  VALUES ('apple', 'Apple Computer', 'Maker of OSX.'),
         ('ibm', 'IBM', 'Big blue.');

-- Insert invoices (ensure the companies are inserted first)
INSERT INTO invoices (comp_Code, amt, paid, paid_date)
  VALUES ('apple', 100, false, null),
         ('apple', 200, false, null),
         ('apple', 300, true, '2018-01-01'),
         ('ibm', 400, false, null);

-- Insert some industries
INSERT INTO industries (code, industry) VALUES
    ('acct', 'Accounting'),
    ('tech', 'Technology'),
    ('manuf', 'Manufacturing');

-- Associate companies with industries
INSERT INTO companies_industries (company_code, industry_code) VALUES
    ('apple', 'tech'),
    ('ibm', 'manuf');
