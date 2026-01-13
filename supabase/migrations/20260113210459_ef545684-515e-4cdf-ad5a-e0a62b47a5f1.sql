-- Add qb_closed_books_date column to projects table for QuickBooks mode
ALTER TABLE public.projects 
ADD COLUMN qb_closed_books_date DATE;