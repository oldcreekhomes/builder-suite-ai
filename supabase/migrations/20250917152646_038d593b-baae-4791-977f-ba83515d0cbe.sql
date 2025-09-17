-- Create shared_links table for storing file and folder share data
CREATE TABLE public.shared_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id TEXT NOT NULL UNIQUE,
  share_type TEXT NOT NULL CHECK (share_type IN ('file', 'folder')),
  data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read shared links (public sharing)
CREATE POLICY "Anyone can read shared links" 
ON public.shared_links 
FOR SELECT 
USING (expires_at > now());

-- Only authenticated users can create shared links
CREATE POLICY "Authenticated users can create shared links" 
ON public.shared_links 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Users can update their own shared links
CREATE POLICY "Users can update their own shared links" 
ON public.shared_links 
FOR UPDATE 
USING (created_by = auth.uid());

-- Users can delete their own shared links
CREATE POLICY "Users can delete their own shared links" 
ON public.shared_links 
FOR DELETE 
USING (created_by = auth.uid());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_shared_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_shared_links_updated_at
BEFORE UPDATE ON public.shared_links
FOR EACH ROW
EXECUTE FUNCTION public.update_shared_links_updated_at();