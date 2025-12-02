-- Clear FK references
UPDATE bills 
SET reconciliation_id = NULL, reconciled = false, reconciliation_date = NULL
WHERE reconciliation_id IN (
  -- 07/31 duplicates (keep 67598e41)
  'c0ce6273-bcf8-436f-bf4b-ccb01cf4d0b0',
  '7fc00c4b-f2cb-4eaf-82e6-32855f5e419a',
  -- 08/31 duplicates (keep ccfa80e4)
  'f0a406f2-29bb-49ad-b972-c4bb1efc02c1',
  'a3414e4a-fe80-4009-b3d5-ea81a03334a8',
  -- 09/30 duplicates (keep dc265465)
  'ec8f1313-e2c2-4327-aac7-eeb40e633142'
);

-- Delete all remaining duplicates
DELETE FROM bank_reconciliations 
WHERE id IN (
  'c0ce6273-bcf8-436f-bf4b-ccb01cf4d0b0',
  '7fc00c4b-f2cb-4eaf-82e6-32855f5e419a',
  'f0a406f2-29bb-49ad-b972-c4bb1efc02c1',
  'a3414e4a-fe80-4009-b3d5-ea81a03334a8',
  'ec8f1313-e2c2-4327-aac7-eeb40e633142'
);

-- Now add unique constraint
CREATE UNIQUE INDEX unique_completed_reconciliation_per_date 
ON bank_reconciliations (bank_account_id, statement_date) 
WHERE status = 'completed';