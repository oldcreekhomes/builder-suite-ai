UPDATE shared_links 
SET expires_at = NOW() + INTERVAL '30 days', updated_at = NOW()
WHERE share_id = 'g6sag0lf1afa9byydt3ouu'