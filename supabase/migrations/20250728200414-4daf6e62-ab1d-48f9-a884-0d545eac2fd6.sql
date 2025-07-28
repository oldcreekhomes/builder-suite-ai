-- Add receive_po_notifications column to company_representatives table
ALTER TABLE company_representatives 
ADD COLUMN receive_po_notifications BOOLEAN DEFAULT false;