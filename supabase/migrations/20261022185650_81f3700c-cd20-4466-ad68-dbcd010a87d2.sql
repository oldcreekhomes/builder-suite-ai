CREATE TEMP TABLE _old_map ON COMMIT DROP AS
SELECT mask, project_id, account_id FROM public.bank_connection_accounts
WHERE connection_id IN ('d7a118d3-6fc1-457f-9784-ddd358fea37f','6a433be9-0bf7-4067-8fbc-4b14ed9fb456')
  AND project_id IS NOT NULL;

UPDATE public.bank_connection_accounts SET project_id = NULL, account_id = NULL
WHERE connection_id IN ('d7a118d3-6fc1-457f-9784-ddd358fea37f','6a433be9-0bf7-4067-8fbc-4b14ed9fb456');

UPDATE public.bank_connection_accounts n
SET project_id = o.project_id, account_id = o.account_id, updated_at = now()
FROM _old_map o
WHERE n.connection_id = '7ab3c2b7-b072-4d6c-86ab-352dd0ce1fb4' AND n.mask = o.mask AND n.project_id IS NULL;

UPDATE public.bank_connection_accounts
SET project_id = 'dfad3ec5-8955-4377-9c73-6c465f9941f8', account_id = '7b456e28-9eec-44cb-9f01-c745cc70867c', updated_at = now()
WHERE connection_id = '7ab3c2b7-b072-4d6c-86ab-352dd0ce1fb4' AND mask = '5398' AND project_id IS NULL;

DELETE FROM public.bank_connections
WHERE id IN ('d7a118d3-6fc1-457f-9784-ddd358fea37f','6a433be9-0bf7-4067-8fbc-4b14ed9fb456');