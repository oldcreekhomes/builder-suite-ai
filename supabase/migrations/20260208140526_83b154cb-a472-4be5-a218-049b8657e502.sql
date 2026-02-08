-- Normalize marketplace company types to match UI taxonomy

-- Direct renames (exact matches)
UPDATE marketplace_companies SET company_type = 'Solar/Renewable Energy Contractor' WHERE company_type = 'Solar/Renewable Energy';
UPDATE marketplace_companies SET company_type = 'Fire Sprinkler Contractor' WHERE company_type = 'Fire Protection/Sprinkler';
UPDATE marketplace_companies SET company_type = 'Cabinet Manufacturer' WHERE company_type = 'Cabinet Maker';
UPDATE marketplace_companies SET company_type = 'Concrete Supplier (Ready-Mix)' WHERE company_type = 'Ready-Mix Concrete';

-- Split combined types (assign to first type)
UPDATE marketplace_companies SET company_type = 'Low Voltage Contractor' WHERE company_type = 'Low Voltage/Security';
UPDATE marketplace_companies SET company_type = 'Deck Contractor' WHERE company_type = 'Deck/Fence Contractor';
UPDATE marketplace_companies SET company_type = 'Window Installer' WHERE company_type = 'Window/Door Installer';
UPDATE marketplace_companies SET company_type = 'Electrical Fixtures Supplier' WHERE company_type = 'Fixture Supplier';
UPDATE marketplace_companies SET company_type = 'Construction Lender' WHERE company_type = 'Lender';
UPDATE marketplace_companies SET company_type = 'Financial Advisor' WHERE company_type = 'Finance';

-- Delete generic types that don't map to specific categories
DELETE FROM marketplace_companies WHERE company_type = 'Subcontractor';
DELETE FROM marketplace_companies WHERE company_type = 'Attorney/Legal Services';