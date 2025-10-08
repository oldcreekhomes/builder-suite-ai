-- Create a function to delete pending bill uploads and their associated lines
CREATE OR REPLACE FUNCTION public.delete_pending_bill_upload(upload_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete associated pending bill lines
  DELETE FROM public.pending_bill_lines
  WHERE pending_upload_id = upload_id_param;
  
  -- Delete the pending bill upload
  DELETE FROM public.pending_bill_uploads
  WHERE id = upload_id_param;
  
  RETURN FOUND;
END;
$function$;