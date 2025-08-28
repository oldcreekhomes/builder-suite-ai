
-- Backfill project_purchase_orders.files with proposal files from project_bids
-- Only affects POs that currently have no files and have a bid_package_id

WITH files_by_po AS (
  SELECT
    pb.bid_package_id,
    pb.company_id,
    -- Build JSONB array of file objects from proposals[]
    jsonb_agg(
      jsonb_build_object(
        'id', f,  -- stored proposal filename
        'name', f, -- we don't have the original user name; keep the stored name
        'url', 'https://nlmnwlvmmkngrgatnzkj.supabase.co/storage/v1/object/public/project-files/proposals/' || f
      )
    ) AS files_json
  FROM project_bids pb
  CROSS JOIN LATERAL unnest(coalesce(pb.proposals, '{}')) AS f
  GROUP BY pb.bid_package_id, pb.company_id
)

UPDATE project_purchase_orders po
SET
  files = f.files_json,
  updated_at = now()
FROM files_by_po f
WHERE
  po.bid_package_id = f.bid_package_id
  AND po.company_id = f.company_id
  AND (po.files IS NULL OR po.files = '[]'::jsonb);
