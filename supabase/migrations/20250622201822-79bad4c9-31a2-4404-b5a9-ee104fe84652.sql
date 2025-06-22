
-- Create the project-files storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true);

-- Create policy to allow authenticated users to view files
CREATE POLICY "Authenticated users can view project files"
ON storage.objects FOR SELECT
USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload project files"
ON storage.objects FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow users to delete their own uploaded files
CREATE POLICY "Users can delete their own project files"
ON storage.objects FOR DELETE
USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow users to update their own uploaded files
CREATE POLICY "Users can update their own project files"
ON storage.objects FOR UPDATE
USING (auth.uid()::text = (storage.foldername(name))[1]);
