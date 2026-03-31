UPDATE project_bids pb
SET email_sent_at = pbp.sent_on
FROM project_bid_packages pbp
WHERE pb.bid_package_id = pbp.id
  AND pbp.sent_on IS NOT NULL
  AND pb.email_sent_at IS NULL;