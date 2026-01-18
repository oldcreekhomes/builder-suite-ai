-- Create a function to fix individual note entries
CREATE OR REPLACE FUNCTION fix_legacy_note_entry(
  note_entry TEXT, 
  fallback_date TIMESTAMPTZ
) RETURNS TEXT AS $$
DECLARE
  formatted_date TEXT;
BEGIN
  formatted_date := TO_CHAR(fallback_date AT TIME ZONE 'UTC', 'MM/DD/YYYY');
  
  -- Already has the pipe separator (new format) - return as-is
  IF note_entry LIKE '%|%' THEN
    RETURN note_entry;
  END IF;
  
  -- Has "Name: Content" format but no pipe - add date
  IF note_entry ~ '^[^:]+:\s*.+$' THEN
    RETURN regexp_replace(
      note_entry, 
      '^([^:]+):\s*(.+)$', 
      '\1 | ' || formatted_date || ': \2'
    );
  END IF;
  
  -- Plain text (like "Paid") - add System + date
  IF trim(note_entry) != '' THEN
    RETURN 'System | ' || formatted_date || ': ' || trim(note_entry);
  END IF;
  
  RETURN note_entry;
END;
$$ LANGUAGE plpgsql;

-- Update all bills with notes (process every note entry individually)
UPDATE bills b
SET notes = (
  SELECT string_agg(
    fix_legacy_note_entry(note_part, b.updated_at), 
    E'\n\n'
  )
  FROM unnest(string_to_array(b.notes, E'\n\n')) AS note_part
  WHERE trim(note_part) != ''
)
WHERE notes IS NOT NULL 
  AND notes != '';

-- Drop the temporary function
DROP FUNCTION fix_legacy_note_entry;