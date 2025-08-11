-- Drop the existing policies that expect folder structure
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Owners can upload avatars for their employees" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Owners can view avatars for their employees" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update avatars for their employees" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete avatars for their employees" ON storage.objects;

-- Create new policies that match the actual file naming pattern (userid.extension)
-- Policy to allow users to upload their own avatars
CREATE POLICY "Users can upload their own avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = split_part(name, '.', 1)
);

-- Policy to allow owners to upload avatars for their employees
CREATE POLICY "Owners can upload avatars for their employees" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND EXISTS (
    SELECT 1 FROM public.users owner, public.users employee
    WHERE owner.id = auth.uid() 
      AND owner.role = 'owner'
      AND employee.id::text = split_part(name, '.', 1)
      AND employee.home_builder_id = owner.id
  )
);

-- Policy to allow users to view their own avatars
CREATE POLICY "Users can view their own avatars" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = split_part(name, '.', 1)
);

-- Policy to allow owners to view avatars for their employees
CREATE POLICY "Owners can view avatars for their employees" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'avatars' 
  AND EXISTS (
    SELECT 1 FROM public.users owner, public.users employee
    WHERE owner.id = auth.uid() 
      AND owner.role = 'owner'
      AND employee.id::text = split_part(name, '.', 1)
      AND employee.home_builder_id = owner.id
  )
);

-- Policy to allow users to update their own avatars
CREATE POLICY "Users can update their own avatars" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = split_part(name, '.', 1)
);

-- Policy to allow owners to update avatars for their employees
CREATE POLICY "Owners can update avatars for their employees" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND EXISTS (
    SELECT 1 FROM public.users owner, public.users employee
    WHERE owner.id = auth.uid() 
      AND owner.role = 'owner'
      AND employee.id::text = split_part(name, '.', 1)
      AND employee.home_builder_id = owner.id
  )
);

-- Policy to allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = split_part(name, '.', 1)
);

-- Policy to allow owners to delete avatars for their employees
CREATE POLICY "Owners can delete avatars for their employees" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND EXISTS (
    SELECT 1 FROM public.users owner, public.users employee
    WHERE owner.id = auth.uid() 
      AND owner.role = 'owner'
      AND employee.id::text = split_part(name, '.', 1)
      AND employee.home_builder_id = owner.id
  )
);