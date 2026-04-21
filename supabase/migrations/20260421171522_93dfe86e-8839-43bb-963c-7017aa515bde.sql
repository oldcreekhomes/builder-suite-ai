UPDATE project_bid_packages SET status = 'sent' WHERE id = '15f85b49-7e15-4add-89a0-ce68a04a3856';

UPDATE project_bids SET email_sent_at = '2026-04-21 17:05:44.646+00' WHERE bid_package_id = '15f85b49-7e15-4add-89a0-ce68a04a3856' AND company_id IN (SELECT id FROM companies WHERE company_name ILIKE '%RC Fields%');