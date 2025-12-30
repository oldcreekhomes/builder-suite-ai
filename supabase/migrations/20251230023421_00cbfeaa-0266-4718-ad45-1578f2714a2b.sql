-- Delete corrupted lap siding annotations
DELETE FROM takeoff_annotations 
WHERE takeoff_item_id IN (
  '5557074c-aa5a-4305-a291-2a47110efcaa',
  '7d7c391f-20b1-47d9-b773-3f9355290ef8',
  '539b91a0-63e1-42a0-9c92-0d411e565e2e',
  'a4527fb2-0a66-4026-979f-0b7c54607be0',
  '6d40696a-da33-42ad-aed4-f64ba73dc64f',
  '1385e038-759f-44d8-9d1d-f622a6990954',
  'b6518598-d518-4cf0-a66b-aed0e1464d71',
  '8829af1c-7b6f-4de6-a810-4757d4169017'
);

-- Delete the corrupted lap siding takeoff items
DELETE FROM takeoff_items 
WHERE id IN (
  '5557074c-aa5a-4305-a291-2a47110efcaa',
  '7d7c391f-20b1-47d9-b773-3f9355290ef8',
  '539b91a0-63e1-42a0-9c92-0d411e565e2e',
  'a4527fb2-0a66-4026-979f-0b7c54607be0',
  '6d40696a-da33-42ad-aed4-f64ba73dc64f',
  '1385e038-759f-44d8-9d1d-f622a6990954',
  'b6518598-d518-4cf0-a66b-aed0e1464d71',
  '8829af1c-7b6f-4de6-a810-4757d4169017'
);