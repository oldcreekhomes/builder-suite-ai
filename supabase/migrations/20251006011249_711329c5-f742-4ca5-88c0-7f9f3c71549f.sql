-- Force cancel the stuck bill extraction
UPDATE pending_bill_uploads 
SET status = 'extracted', 
    error_message = NULL
WHERE id = '66f979ee-a2d5-4d1e-954d-bf8c3f3df6a5'
  AND status = 'processing';

-- Also cancel any other extractions stuck in processing for more than 5 minutes
UPDATE pending_bill_uploads 
SET status = 'error',
    error_message = 'Extraction timed out - please retry'
WHERE status = 'processing' 
  AND updated_at < NOW() - INTERVAL '5 minutes';