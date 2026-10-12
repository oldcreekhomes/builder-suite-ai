DO $$
DECLARE source_file public.check_attachments%ROWTYPE;
BEGIN
 SELECT * INTO STRICT source_file FROM public.check_attachments WHERE id='6e6df83f-3898-404f-98d7-e8492d6ee976' AND check_id='2775c863-0c0f-4d54-a45d-b156c92cb6de';
 IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='project-files' AND name=source_file.file_path) THEN
  RAISE EXCEPTION 'Source PDF missing from storage';
 END IF;
 IF (SELECT count(*) FROM public.checks WHERE multi_entry_batch_id='8857a7f6-f9fe-4e2e-8075-ec6aad220ed1' AND owner_id=(SELECT owner_id FROM public.checks WHERE id=source_file.check_id)) <> 6 THEN
  RAISE EXCEPTION 'Batch ownership or size mismatch';
 END IF;
 INSERT INTO public.check_attachments(check_id,file_name,file_path,file_size,content_type,uploaded_by)
 SELECT c.id,source_file.file_name,source_file.file_path,source_file.file_size,source_file.content_type,source_file.uploaded_by
 FROM public.checks c
 WHERE c.multi_entry_batch_id='8857a7f6-f9fe-4e2e-8075-ec6aad220ed1'
 AND c.id IN ('60952bb7-48e9-4506-83b0-b253313e1c6b','d09ec94f-5f60-4e8e-9d40-77713f1a6281','53b37087-b85a-491b-9243-378c1f3bcbca','f2f05d67-a64a-4e1c-bc93-af60cd5e824c','e20b2e8c-6444-4355-941b-c3b3015eaba9')
 AND NOT EXISTS (SELECT 1 FROM public.check_attachments a WHERE a.check_id=c.id AND a.file_path=source_file.file_path);
END $$;